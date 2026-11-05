const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
const words=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
export class TikTokGameAdapter{
  constructor({room,config,announce=()=>{},changed=()=>{},clock=()=>Date.now(),userPrefix='tiktok:'}){Object.assign(this,{room,config,announce,changed,clock,userPrefix});this.seen=new Set();this.likes=new Map();this.cooldowns=new Map();this.gifts=new Map();this.pending=new Map();this.pendingSerial=0;this.stats={comments:0,likes:0,follows:0,gifts:0,coins:0,unmapped:0};this.lastResult='';}
  remember(id){if(!id)return;if(this.seen.size>=4000)this.seen.delete(this.seen.values().next().value);this.seen.add(id);}
  snapshot(){return {stats:{...this.stats},recentGifts:[...this.gifts.values()].reverse().slice(0,30),lastResult:this.lastResult,pendingGifts:this.pending.size};}
  applyGift(event,key){
    const result=this.room().receive({id:event.id||undefined,gift:key,unitCoins:event.xu,user:{id:`${this.userPrefix}${event.userId}`,name:event.ten},repeatCount:event.soLuong,streakId:event.giftType===1&&event.groupId?`${event.roomId}:${event.groupId}`:undefined});
    if(result.ok&&result.delta){this.stats.gifts+=result.delta;this.stats.coins+=result.coinDelta;this.announce(`${event.ten} tặng ${event.tenQua} ×${result.delta} · +${result.coinDelta.toLocaleString('vi-VN')} xu`);this.lastResult=`Đã nhận ${event.tenQua} từ ${event.ten} · +${result.coinDelta.toLocaleString('vi-VN')} xu.`;}
    if(result.reason==='gift_disabled')this.lastResult=`${event.tenQua} đang tắt trong bảng quà.`;
    return result;
  }
  flush(){
    let changed=false;
    for(const [pendingKey,{event,key}] of [...this.pending].slice(0,8)){
      const result=this.applyGift(event,key);if(result.reason==='queue_full')break;
      this.pending.delete(pendingKey);changed=true;
      if(result.reason==='room_full')this.lastResult='Sàn đã đủ 120 người. Quà của người chưa có trên sàn chưa được thêm.';
    }
    if(changed)this.changed();
  }
  receive(event){
    if(event.id&&this.seen.has(event.id))return {ok:true,ignored:true};
    const room=this.room(),config=this.config(),user={id:`${this.userPrefix}${event.userId}`,name:event.ten};let result={ok:true};
    if(event.loai==='binhluan'){
      this.stats.comments++;const word=words(config.joinWord),comment=words(event.noiDung);
      if(!word||(' '+comment+' ').includes(' '+word+' ')){const existing=room.players.some(p=>p.id===user.id);const player=room.addPlayer(user.name,user.id);if(!player)result={ok:false,reason:'room_full'};else if(!existing){room.welcomePlayer(player.id,this.clock()/1000);this.announce(`${user.name} vừa vào sàn ✦`);}}
    }else if(event.loai==='vao'){
      if(config.joinOnMember){const existing=room.players.some(p=>p.id===user.id),player=room.addPlayer(user.name,user.id);if(!player)result={ok:false,reason:'room_full'};else if(!existing){room.welcomePlayer(player.id,this.clock()/1000);this.announce(`${user.name} vừa vào sàn ✦`);}}
    }else if(event.loai==='qua'){
      const key=room.giftIds.get(event.giftId)||room.giftRules.find(rule=>!rule.externalId&&[rule.name,rule.key].some(name=>norm(name)===norm(event.tenQua)))?.key;
      this.gifts.delete(event.giftId);this.gifts.set(event.giftId,{giftId:event.giftId,name:event.tenQua,coins:event.xu,mappedKey:key||'',lastCount:event.soLuong});if(this.gifts.size>50)this.gifts.delete(this.gifts.keys().next().value);
      if(event.giftType===1&&!event.groupId&&!event.ketThucCombo){this.changed();return {ok:true,pending:true};}
      if(!key){this.stats.unmapped++;result={ok:false,reason:'unknown_gift'};this.lastResult=`Chưa gán hiệu ứng cho ${event.tenQua} (ID ${event.giftId}).`;}
      else{
        result=this.applyGift(event,key);
        if(result.reason==='queue_full'){
          const pendingKey=event.giftType===1&&event.groupId?JSON.stringify([event.userId,event.giftId,event.roomId,event.groupId]):event.id||`pending-${++this.pendingSerial}`;
          if(this.pending.has(pendingKey)||this.pending.size<500){const old=this.pending.get(pendingKey);if(!old||old.event.soLuong<=event.soLuong)this.pending.set(pendingKey,{event,key});result={ok:true,pending:true};this.lastResult=`Có ${this.pending.size} lượt quà đang đợi hàng hiệu ứng trống.`;}
        }
      }
    }else if(event.loai==='tim'||event.loai==='theodoi'){
      const likes=event.loai==='tim';this.stats[likes?'likes':'follows']+=likes?event.soLuong:1;
      const action=likes?config.likeEffect:config.followEffect;
      const total=(this.likes.get(user.id)||0)+(likes?event.soLuong:0);if(likes){this.likes.set(user.id,total);if(this.likes.size>1000)this.likes.delete(this.likes.keys().next().value);}
      if(action!=='none'&&(!likes||total>=config.likesEvery)){
        const cooldownKey=`${event.loai}:${user.id}`,now=this.clock();
        if(now-(this.cooldowns.get(cooldownKey)??-Infinity)>=10000){
          result=room.react({id:event.id,user,action,label:likes?'Thả tim':'Theo dõi',icon:likes?'♥':'✦'});
          if(result.ok){if(likes)this.likes.set(user.id,total%config.likesEvery);this.cooldowns.set(cooldownKey,now);if(this.cooldowns.size>2000)this.cooldowns.delete(this.cooldowns.keys().next().value);}
        }
      }
    }
    if(result.reason==='room_full')this.lastResult='Sàn đã đủ 120 người. Các nhân vật đang có vẫn nhận quà và hiệu ứng.';
    if(result.reason==='queue_full')this.lastResult='Hàng hiệu ứng đang đầy. Quà này chưa được đưa vào sàn.';
    if(result.ok||result.reason!=='queue_full')this.remember(event.id);this.changed();return result;
  }
}
