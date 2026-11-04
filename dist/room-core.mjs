export const MAX_PLAYERS=120;
export const SKINS=['mushroom','panda','pink','cat','rabbit','shiba','duck','capybara'];
export function registerSkin(id){if(/^custom_[a-z0-9-]+$/.test(id)&&!SKINS.includes(id))SKINS.push(id);}
export const GIFTS={
  rose:{action:'camera',label:'Camera',giftName:'Hoa hồng',icon:'🌹',duration:5.8},
  tiktok:{action:'swap',label:'Đổi nhân vật',giftName:'Quà TikTok',icon:'♪',duration:4.6},
  icecream:{action:'walk',label:'Đi vòng',giftName:'Kem',icon:'🍦',duration:6.2},
  doughnut:{action:'fly',label:'Phi công',giftName:'Doughnut',icon:'🍩',duration:6.4},
  pair:{action:'pair',label:'Ghép đôi',giftName:'Ghép đôi thử',icon:'💞',duration:5.8},
  crown:{action:'crown',label:'Vua sàn nhảy',giftName:'Vương miện thử',icon:'👑',duration:7,aura:'silver',prestige:3},
  wings:{action:'wings',label:'Đại bàng',giftName:'Cánh vàng thử',icon:'🪽',duration:7.5,aura:'gold',prestige:10},
  jump:{action:'jump',label:'Nhảy một cái',giftName:'Nhảy thử',icon:'⚡',duration:3.6},
  wukong:{action:'wukong',label:'Ngộ Không',giftName:'Ngộ Không thử',icon:'🐒',duration:6.2}
};
const COLORS=['#bd85ef','#73c9c1','#ec9f9d','#dfbf65','#779ce7','#acb966'];
export const EFFECTS=Object.fromEntries(Object.values(GIFTS).map(spec=>[spec.action,spec]));
export function defaultGiftRules(){return Object.entries(GIFTS).map(([key,spec])=>({key,name:spec.giftName,effect:spec.action,enabled:true,externalId:''}));}
export function validateGiftRules(rules){
  if(!Array.isArray(rules)||rules.length>32)throw Error('Tối đa 32 loại quà.');
  const keys=new Set(),ids=new Set();
  return rules.map(rule=>{
    if(!rule||typeof rule.key!=='string'||!/^[a-z0-9_-]{1,48}$/.test(rule.key)||['constructor','prototype','__proto__'].includes(rule.key)||keys.has(rule.key))throw Error('Mã quà không hợp lệ hoặc trùng nhau.');
    const name=typeof rule.name==='string'?rule.name.replace(/[\u0000-\u001f]/g,'').trim():'';
    if(!name||name.length>48)throw Error('Tên quà cần có từ 1 đến 48 ký tự.');
    if(!Object.hasOwn(EFFECTS,rule.effect)||typeof rule.enabled!=='boolean')throw Error('Hiệu ứng hoặc trạng thái quà không hợp lệ.');
    const externalId=String(rule.externalId??'').trim();
    if(externalId&&(!/^\d{1,20}$/.test(externalId)||ids.has(externalId)))throw Error('ID quà TikTok phải là số và không trùng nhau.');
    keys.add(rule.key);if(externalId)ids.add(externalId);
    return {key:rule.key,name,effect:rule.effect,enabled:rule.enabled,externalId};
  });
}
const cleanName=n=>String(n||'Khách').replace(/[\u0000-\u001f]/g,'').trim().slice(0,24)||'Khách';
export class RoomEngine{
  constructor(rules=defaultGiftRules()){this.setGiftRules(rules);this.reset();}
  setGiftRules(rules){this.giftRules=validateGiftRules(rules);this.giftSpecs=new Map(this.giftRules.map(rule=>[rule.key,{...EFFECTS[rule.effect],giftName:rule.name,enabled:rule.enabled}]));this.giftIds=new Map(this.giftRules.filter(r=>r.externalId).map(r=>[r.externalId,r.key]));this.revision=(this.revision||0)+1;}
  getGiftSpec(key){return this.giftSpecs.get(key);}
  reset(){this.players=[];this.queue=[];this.active=null;this.logs=[];this.totalGifts=0;this.seen=new Set();this.combos=new Map();this.counter=0;this.selectedId=null;this.revision=0;}
  addPlayer(name,id){
    const cleaned=cleanName(name);
    const existing=id?this.players.find(p=>p.id===String(id)):this.players.find(p=>p.name.toLocaleLowerCase()===cleaned.toLocaleLowerCase());
    if(existing)return existing;
    if(this.players.length>=MAX_PLAYERS)return null;
    const i=this.counter++;
    const p={id:String(id||`local-${i}`),name:cleaned,skin:SKINS[i%SKINS.length],color:COLORS[i%COLORS.length],gifts:0,prestige:0,aura:null,x:.12+((i*.6180339)%1)*.76,depth:.16+((i*.382+0.13)%1)*.74,phase:i*2.37};
    this.players.push(p);if(!this.selectedId)this.selectedId=p.id;this.revision++;return p;
  }
  get selected(){return this.players.find(p=>p.id===this.selectedId)||this.players[0];}
  select(id){if(this.players.some(p=>p.id===id)){this.selectedId=id;this.revision++;}}
  shuffle(id=this.selectedId){const p=this.players.find(p=>p.id===id);if(p){p.skin=SKINS[(SKINS.indexOf(p.skin)+1)%SKINS.length];this.revision++;}}
  costume(skin,id=this.selectedId){const p=this.players.find(p=>p.id===id);if(p&&SKINS.includes(skin)){p.skin=skin;this.revision++;}}
  receive(event){
    if(!event||typeof event!=='object')return {ok:false,reason:'invalid_event'};
    const gift=event.gift??this.giftIds.get(String(event.giftId));
    const spec=this.getGiftSpec(gift);if(!spec)return {ok:false,reason:'unknown_gift'};
    if(!spec.enabled)return {ok:false,reason:'gift_disabled'};
    if(event.id&&this.seen.has(String(event.id)))return {ok:true,ignored:true,delta:0};
    const count=Number(event.repeatCount??1);if(!Number.isInteger(count)||count<1||count>10000)return {ok:false,reason:'invalid_count'};
    if(!event.user?.id)return {ok:false,reason:'missing_user'};
    const userId=String(event.user.id);
    const comboKey=event.streakId?JSON.stringify([userId,gift,String(event.streakId)]):null;
    const previous=comboKey?(this.combos.get(comboKey)||0):0;
    const delta=Math.max(0,count-previous);
    if(!delta){if(event.id)this.remember(event.id);return {ok:true,ignored:true,delta:0};}
    if(this.queue.length>=100)return {ok:false,reason:'queue_full'};
    const p=this.addPlayer(event.user.name,userId);if(!p)return {ok:false,reason:'room_full'};
    if(event.id)this.remember(event.id);
    if(comboKey){this.combos.set(comboKey,count);if(this.combos.size>2000)this.combos.delete(this.combos.keys().next().value);}
    p.gifts+=delta;this.totalGifts+=delta;
    if(spec.aura){p.prestige=(p.prestige||0)+(spec.prestige||1)*delta;if(spec.aura==='gold'||p.aura!=='gold')p.aura=spec.aura;}
    const next={...spec,gift,userId:p.id,count:delta};
    const pending=this.queue.find(q=>q.userId===p.id&&q.gift===gift&&q.action===spec.action);
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
  get leaders(){return [...this.players].sort((a,b)=>(b.prestige||0)-(a.prestige||0)||b.gifts-a.gifts).filter(p=>p.prestige>0).slice(0,3);}
  get top(){return this.leaders[0]||[...this.players].sort((a,b)=>b.gifts-a.gifts)[0];}
  populate(count){const target=Math.min(MAX_PLAYERS,Math.max(0,Math.floor(Number(count)||0))),selected=this.selectedId;while(this.players.length<target){let id=`crowd-${this.counter}`;while(this.players.some(p=>p.id===id))id+='-';this.addPlayer(`Khách ${String(this.counter+1).padStart(3,'0')}`,id);}this.select(selected);}
}
