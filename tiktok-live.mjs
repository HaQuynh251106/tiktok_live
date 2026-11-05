import fs from 'node:fs/promises';
import path from 'node:path';

export const LIVE_VERSION='2.5.0';
const clean=(value,max=80)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const positive=value=>{const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:0;};
export function tiktokUsername(value){
  if(typeof value!=='string'||value.length>300)throw Error('Nhập tên TikTok dạng @ten_tiktok.');
  let name=value.trim();
  if(name.startsWith('https://')){let url;try{url=new URL(name);}catch{throw Error('Link TikTok không hợp lệ.');}
    if(!['www.tiktok.com','tiktok.com'].includes(url.hostname)||url.port||url.username||url.password||!/^\/@[\w.]+(?:\/live)?\/?$/.test(url.pathname))throw Error('Dùng tên @TikTok hoặc link https://www.tiktok.com/@ten/live.');
    name=url.pathname.split('/')[1];
  }
  name=name.replace(/^@/,'');
  if(!/^[a-zA-Z0-9_][a-zA-Z0-9_.]{0,23}$/.test(name)||name.endsWith('.'))throw Error('Tên TikTok chỉ gồm chữ, số, dấu chấm và gạch dưới; không phải tên hiển thị.');
  return name;
}
export const defaultLiveConfig=()=>({username:'',joinWord:'hey',joinOnMember:true,likesEvery:20,likeEffect:'jump',followEffect:'camera',signApiKey:''});
export function validateLiveConfig(input,previous=defaultLiveConfig()){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Cài đặt TikTok không hợp lệ.');
  const next={...previous,...input};
  if(typeof next.username!=='string'||typeof next.joinWord!=='string'||next.joinWord.length>32||typeof next.joinOnMember!=='boolean'||!Number.isInteger(next.likesEvery)||next.likesEvery<1||next.likesEvery>1000||!['none','jump','camera'].includes(next.likeEffect)||!['none','jump','camera'].includes(next.followEffect))throw Error('Cài đặt TikTok không hợp lệ. Số tim cần từ 1 đến 1000.');
  if(input.signApiKey==='')next.signApiKey=previous.signApiKey;
  if(input.clearKey===true)next.signApiKey='';
  if(typeof next.signApiKey!=='string'||next.signApiKey.length>512||/[\r\n]/.test(next.signApiKey))throw Error('Khoá ký không hợp lệ.');
  return {username:next.username.trim()?tiktokUsername(next.username):'',joinWord:clean(next.joinWord,32),joinOnMember:next.joinOnMember,likesEvery:next.likesEvery,likeEffect:next.likeEffect,followEffect:next.followEffect,signApiKey:next.signApiKey.trim()};
}
export function publicLiveConfig(config){const {signApiKey,...safe}=config;return {...safe,keyConfigured:!!signApiKey};}
export async function createLiveStore(folder){
  const file=path.join(folder,'tiktok-config.json');let config=defaultLiveConfig(),writes=Promise.resolve();
  try{config=validateLiveConfig(JSON.parse(await fs.readFile(file,'utf8')));}catch(error){if(error.code!=='ENOENT')throw Error('Không đọc được cài đặt TikTok trên máy.');}
  return {get config(){return config;},save(input){const task=writes.then(async()=>{const next=validateLiveConfig(input,config);await fs.mkdir(folder,{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(next,null,2)+'\n',{mode:0o600});await fs.chmod(file+'.tmp',0o600);await fs.rename(file+'.tmp',file);config=next;return publicLiveConfig(config);});writes=task.catch(()=>{});return task;}};
}

// Native v3 fields in connector 2.5.0: user.id/displayId, content, count/total, gift.type/name.
// The README's older aliases are also accepted at this single boundary.
export function normalizeTikTokEvent(type,data,roomId=''){
  const loai={chat:'binhluan',gift:'qua',like:'tim',follow:'theodoi',member:'vao'}[type];if(!loai||!data||typeof data!=='object')return null;
  const user=data.user;if(!user)return null;
  const userId=clean(user.id||user.userId||user.uniqueId,80);if(!userId||userId==='0')return null;
  const msgId=clean(data.common?.msgId||data.msgId,80);
  const event={loai,userId,ten:clean(user.nickname||user.displayId||user.uniqueId||'Khách',48),id:msgId?`${roomId}:${loai}:${msgId}`:'',roomId:String(roomId)};
  if(loai==='binhluan')event.noiDung=clean(data.content??data.comment,300);
  if(loai==='tim'){event.soLuong=Math.min(positive(data.count??data.likeCount),10000);event.tongTim=positive(data.total??data.totalLikeCount);if(!event.soLuong)return null;}
  if(loai==='qua'){
    const gift=data.gift||data.giftDetails||data.extendedGiftInfo||{};
    event.giftId=clean(data.giftId||gift.id,24);if(!/^\d{1,24}$/.test(event.giftId)||event.giftId==='0')return null;
    event.tenQua=clean(gift.name||gift.giftName||data.extendedGiftInfo?.name||`Quà ${event.giftId}`,64);
    event.soLuong=data.repeatCount==null?1:positive(data.repeatCount);if(!event.soLuong||event.soLuong>10000)return null;event.giftType=Number(gift.type??gift.giftType??0);
    event.ketThucCombo=!!data.repeatEnd;event.groupId=clean(data.groupId,80);if(event.groupId==='0')event.groupId='';
    const coins=gift.diamondCount??data.extendedGiftInfo?.diamond_count;
    // Missing pricing falls back to the local catalogue; an explicit zero remains zero.
    event.xu=coins===undefined||coins===null?null:Number(coins);
    if(event.xu!==null&&(!Number.isSafeInteger(event.xu)||event.xu<0||event.xu>1000000))return null;
    if(event.id&&event.giftType===1)event.id+=`:${event.soLuong}:${event.ketThucCombo?1:0}`;
  }
  return event;
}

export function liveError(error){
  const names=[error?.name,error?.constructor?.name,error?.cause?.name,error?.exception?.name].join(' ');
  const status=error?.response?.status||error?.response?.statusCode||error?.statusCode;
  if(/UserOffline/.test(names))return {code:'offline',message:'Tài khoản chưa LIVE. Hãy bắt đầu LIVE trong TikTok LIVE Studio rồi bấm Nối lại.'};
  if(/SignatureRateLimit/.test(names)||status===429)return {code:'rate_limit',message:'Dịch vụ ký đang giới hạn lượt nối. Đợi một phút rồi thử lại, hoặc nhập khoá Euler Stream của bạn.'};
  // Inspect only for known categories; never return the provider's raw message (it may contain secrets).
  if(/SignAPI|SignatureMissing|PremiumFeature/.test(names)&&/requires? a Business plan|paid plan|premium|lack of permission/i.test(error?.message||''))return {code:'signing_plan',message:'Euler Stream từ chối chức năng cần quyền hoặc gói trả phí. Kiểm tra quyền của khoá ký; bấm Nối lại với bản game mới đã bỏ bước tải danh mục quà trả phí.'};
  if(/SignAPI|SignatureMissing|PremiumFeature/.test(names)||status===401||status===403)return {code:'signing',message:'Chưa lấy được chữ ký kết nối. Kiểm tra Khoá ký Euler Stream hoặc thử lại sau.'};
  if(/Timeout/.test(names)||error?.code==='ETIMEDOUT')return {code:'timeout',message:'Hết thời gian kết nối. Kiểm tra mạng, tên TikTok và phiên LIVE rồi thử lại.'};
  return {code:'connection',message:'Chưa nối được TikTok LIVE. Kiểm tra tên tài khoản, phiên LIVE và mạng rồi bấm Nối lại.'};
}
// Load only when connecting. Launchers install the exact locked dependency first.
export async function connectorFactory(username,key){
  const {TikTokLiveConnection,SignConfig,createEulerClient}=await import('tiktok-live-connector');
  SignConfig.apiKey=key||undefined;SignConfig.cachedInstance=undefined;
  // In 2.5.0 this optional gift/list request invokes Euler's paid sign_url route
  // before the WebSocket opens. Native gift events already carry name/type/diamondCount;
  // keep receiving LIVE events independent of access to the extra room gift catalogue.
  return new TikTokLiveConnection(username,{eulerApiInstance:createEulerClient(),processInitialData:false,enableExtendedGiftInfo:false,authenticateWs:false,useMobile:false,webClientOptions:{timeout:{request:12000},retry:{limit:0}},wsClientOptions:{handshakeTimeout:12000}});
}
// Values verified against ControlEvent/WebcastEvent exported by connector 2.5.0.
export const LIVE_EVENTS={chat:'chat',gift:'gift',like:'like',follow:'follow',member:'member',roomUser:'roomUser',streamEnd:'streamEnd',error:'error',disconnected:'disconnected'};
const close=connection=>{if(connection)Promise.resolve().then(()=>connection.disconnect()).catch(()=>{});};
export class TikTokLiveService{
  constructor({store,factory=connectorFactory,onEvent=()=>{},onConnected=()=>{},onChange=()=>{},timeoutMs=35000,retryDelays=[10000,20000,40000]}){
    Object.assign(this,{store,factory,onEvent,onConnected,onChange,timeoutMs,retryDelays});this.generation=0;this.connection=null;this.timer=null;this.timeout=null;this.retry=0;this.enabled=false;
    this.state={status:'idle',message:'Chưa kết nối TikTok. Có thể thử game không cần LIVE.',roomId:'',retryAt:0,errorCode:'',received:0,viewers:0,lastEventAt:0};
  }
  snapshot(){return {...this.state,config:publicLiveConfig(this.store.config),connectorVersion:LIVE_VERSION};}
  change(patch){Object.assign(this.state,patch);this.onChange();}
  async disconnect(message='Đã ngắt kết nối TikTok.'){
    this.enabled=false;this.generation++;clearTimeout(this.timer);clearTimeout(this.timeout);this.timer=null;this.timeout=null;const old=this.connection;this.connection=null;
    this.change({status:'disconnected',message,retryAt:0,errorCode:''});close(old);
  }
  async start(input={}){
    if(this.enabled)throw Error('Đang nối hoặc đã nối. Bấm Ngắt trước khi đổi tài khoản.');
    this.enabled=true;const generation=++this.generation;
    try{await this.store.save(input);if(!this.store.config.username)throw Error('Nhập tên TikTok trước khi nối.');}
    catch(error){if(generation===this.generation)this.enabled=false;throw error;}
    if(generation!==this.generation)return this.snapshot();
    this.retry=0;this.attempt();return this.snapshot();
  }
  async attempt(){
    if(!this.enabled)return;const generation=++this.generation;let connection;const pending=[];
    const current=()=>this.enabled&&generation===this.generation&&(!connection||connection===this.connection);
    this.change({status:'connecting',message:`Đang nối @${this.store.config.username}…`,retryAt:0,errorCode:''});
    this.timeout=setTimeout(()=>{if(current())this.fail({name:'ConnectTimeoutError'},generation);},this.timeoutMs);
    try{connection=await this.factory(this.store.config.username,this.store.config.signApiKey);if(!this.enabled||generation!==this.generation){close(connection);return;}this.connection=connection;}
    catch(error){if(current())this.fail(error,generation);return;}
    const deliver=(type,data)=>{const event=normalizeTikTokEvent(type,data,this.state.roomId);if(!event)return;this.state.received++;this.state.lastEventAt=Date.now();try{this.onEvent(event);}catch{this.change({message:'Một tương tác chưa xử lý được; các tương tác tiếp theo vẫn được nhận.'});}};
    for(const type of ['chat','gift','like','follow','member'])connection.on(type,data=>{if(!current())return;if(this.state.status!=='connected'){if(pending.length<200)pending.push([type,data]);return;}deliver(type,data);});
    connection.on('roomUser',data=>{if(current()){this.state.viewers=positive(data.viewerCount??data.total);this.onChange();}});
    connection.on('streamEnd',()=>{if(current())this.disconnect('Phiên LIVE đã kết thúc. Bắt đầu LIVE mới rồi bấm Nối.');});
    connection.on('error',error=>{if(current())this.change({message:liveError(error).message});});
    connection.on('disconnected',()=>{if(current()){clearTimeout(this.timeout);this.connection=null;this.generation++;this.scheduleRetry();}});
    try{
      const state=await connection.connect();
      if(!current()){close(connection);return;}
      clearTimeout(this.timeout);this.retry=0;const roomId=String(state.roomId||connection.roomId||'');
      if(!roomId){this.fail(Error('Missing room'),generation);return;}
      const fresh=roomId!==this.state.roomId;this.onConnected(roomId);
      this.change({status:'connected',message:`Đã nối @${this.store.config.username}. Đang nhận tương tác thật.`,roomId,errorCode:'',retryAt:0,...fresh?{received:0,viewers:0,lastEventAt:0}:{}});
      pending.forEach(([type,data])=>{if(current())deliver(type,data);});this.onChange();
    }catch(error){if(current())this.fail(error,generation);}
  }
  fail(error,generation){
    if(generation!==this.generation)return;clearTimeout(this.timeout);const old=this.connection;this.connection=null;this.generation++;close(old);
    const info=liveError(error);
    if(this.enabled&&this.retry>0&&['connection','timeout'].includes(info.code)){this.scheduleRetry();return;}
    this.enabled=false;this.change({status:'error',message:info.message,errorCode:info.code,retryAt:0});
  }
  scheduleRetry(){
    const delay=this.retryDelays[this.retry++];
    if(delay===undefined){this.enabled=false;this.change({status:'error',message:'Đã hết lượt nối lại. Kiểm tra phiên LIVE rồi bấm Nối lại.',errorCode:'disconnected',retryAt:0});return;}
    this.change({status:'retrying',message:`Mất kết nối. Sẽ nối lại sau ${Math.ceil(delay/1000)} giây.`,retryAt:Date.now()+delay});this.timer=setTimeout(()=>this.attempt(),delay);
  }
}
