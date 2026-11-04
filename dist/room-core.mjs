export const SKINS=['mushroom','panda','pink','cat'];
export const GIFTS={
  rose:{action:'camera',label:'Camera',giftName:'Hoa hồng',icon:'🌹',duration:3.2},
  tiktok:{action:'swap',label:'Đổi nhân vật',giftName:'Quà TikTok',icon:'♪',duration:2.2},
  icecream:{action:'walk',label:'Đi vòng',giftName:'Kem',icon:'🍦',duration:4},
  doughnut:{action:'fly',label:'Phi công',giftName:'Doughnut',icon:'🍩',duration:4.8},
  pair:{action:'pair',label:'Ghép đôi',giftName:'Ghép đôi thử',icon:'💞',duration:4.5},
  crown:{action:'crown',label:'Vua sàn nhảy',giftName:'Vương miện thử',icon:'👑',duration:4.5},
  jump:{action:'jump',label:'Nhảy một cái',giftName:'Nhảy thử',icon:'⚡',duration:3.6},
  wukong:{action:'wukong',label:'Ngộ Không',giftName:'Ngộ Không thử',icon:'🐒',duration:5.2}
};
const COLORS=['#bd85ef','#73c9c1','#ec9f9d','#dfbf65','#779ce7','#acb966'];
const cleanName=n=>String(n||'Khách').replace(/[\u0000-\u001f]/g,'').trim().slice(0,24)||'Khách';
export class RoomEngine{
  constructor(){this.reset();}
  reset(){this.players=[];this.queue=[];this.active=null;this.logs=[];this.totalGifts=0;this.seen=new Set();this.combos=new Map();this.counter=0;this.selectedId=null;this.revision=0;}
  addPlayer(name,id){
    const cleaned=cleanName(name);
    const existing=id?this.players.find(p=>p.id===String(id)):this.players.find(p=>p.name.toLocaleLowerCase()===cleaned.toLocaleLowerCase());
    if(existing)return existing;
    if(this.players.length>=40)return null;
    const i=this.counter++;
    const p={id:String(id||`local-${i}`),name:cleaned,skin:SKINS[i%SKINS.length],color:COLORS[i%COLORS.length],gifts:0,x:.12+((i*.6180339)%1)*.76,depth:.16+((i*.382+0.13)%1)*.74,phase:i*2.37};
    this.players.push(p);if(!this.selectedId)this.selectedId=p.id;this.revision++;return p;
  }
  get selected(){return this.players.find(p=>p.id===this.selectedId)||this.players[0];}
  select(id){if(this.players.some(p=>p.id===id)){this.selectedId=id;this.revision++;}}
  shuffle(id=this.selectedId){const p=this.players.find(p=>p.id===id);if(p){p.skin=SKINS[(SKINS.indexOf(p.skin)+1)%SKINS.length];this.revision++;}}
  costume(skin,id=this.selectedId){const p=this.players.find(p=>p.id===id);if(p&&SKINS.includes(skin)){p.skin=skin;this.revision++;}}
  receive(event){
    if(!event||typeof event!=='object')return {ok:false,reason:'invalid_event'};
    const spec=Object.hasOwn(GIFTS,event.gift)?GIFTS[event.gift]:null;if(!spec)return {ok:false,reason:'unknown_gift'};
    if(event.id&&this.seen.has(String(event.id)))return {ok:true,ignored:true,delta:0};
    const count=Number(event.repeatCount??1);if(!Number.isInteger(count)||count<1||count>10000)return {ok:false,reason:'invalid_count'};
    if(!event.user?.id)return {ok:false,reason:'missing_user'};
    const userId=String(event.user.id);
    const comboKey=event.streakId?JSON.stringify([userId,event.gift,String(event.streakId)]):null;
    const previous=comboKey?(this.combos.get(comboKey)||0):0;
    const delta=Math.max(0,count-previous);
    if(!delta){if(event.id)this.remember(event.id);return {ok:true,ignored:true,delta:0};}
    if(this.queue.length>=100)return {ok:false,reason:'queue_full'};
    const p=this.addPlayer(event.user.name,userId);if(!p)return {ok:false,reason:'room_full'};
    if(event.id)this.remember(event.id);
    if(comboKey){this.combos.set(comboKey,count);if(this.combos.size>2000)this.combos.delete(this.combos.keys().next().value);}
    p.gifts+=delta;this.totalGifts+=delta;
    const next={...spec,gift:event.gift,userId:p.id,count:delta};
    const pending=this.queue.find(q=>q.userId===p.id&&q.gift===event.gift);
    if(pending)pending.count+=delta;else this.queue.push(next);
    this.logs.unshift({name:p.name,label:spec.label,icon:spec.icon,count:delta,time:Date.now()});this.logs=this.logs.slice(0,25);this.revision++;
    return {ok:true,delta};
  }
  remember(id){this.seen.add(String(id));if(this.seen.size>3000)this.seen.delete(this.seen.values().next().value);}
  tick(now){
    if(this.active&&now>=this.active.endsAt){this.active=null;this.revision++;}
    if(!this.active&&this.queue.length){
      const q=this.queue.shift();const p=this.players.find(p=>p.id===q.userId);
      if(q.action==='swap')this.shuffle(q.userId);
      const partner=q.action==='pair'?this.players.find(other=>other.id!==q.userId):null;
      this.active={...q,name:p?.name||'Khách',partnerId:partner?.id,startAt:now,endsAt:now+q.duration};this.revision++;
    }
    return this.active;
  }
  skip(){if(this.active){this.active=null;this.revision++;}}
  get top(){return [...this.players].sort((a,b)=>b.gifts-a.gifts)[0];}
}
