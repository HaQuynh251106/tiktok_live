import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {EventEmitter,once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {ControlEvent,WebcastEvent,RouteConfig,SignatureMissingTokensError} from 'tiktok-live-connector';
import {WebcastChatMessage,WebcastGiftMessage,WebcastLikeMessage,CommonMessageData,User,Gift} from 'tiktok-live-proto/v3';
import {createLiveStore,defaultLiveConfig,publicLiveConfig,validateLiveConfig,tiktokUsername,normalizeTikTokEvent,connectorFactory,TikTokLiveService,LIVE_EVENTS,liveError} from './tiktok-live.mjs';
import {TikTokGameAdapter} from './tiktok-game.mjs';
import {RoomEngine,defaultGiftRules} from './dist/room-core.mjs';
const user={id:'7241234567890123456',nickname:'Quỳnh',displayId:'quynh_test'};
const common={msgId:'8912345678901234567'};
const gift=(extra={})=>({common,user,giftId:'5655',gift:{id:'5655',name:'Rose',type:1,diamondCount:1},groupId:'123456',repeatCount:1,repeatEnd:0,...extra});
const event=(type,data)=>normalizeTikTokEvent(type,data,'room-1');
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await delay(5);}assert.fail('Expected state did not arrive');};
async function storeFor(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'neon-live-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return createLiveStore(dir);}
class FakeConnection extends EventEmitter{constructor(connect=async()=>({roomId:'room-1'})){super();this.open=connect;this.closed=0;}connect(){return this.open(this);}async disconnect(){this.closed++;}}

test('connector 2.5.0 native protobuf v3 messages normalize without README legacy aliases',()=>{
  for(const [type,codec,data] of [['chat',WebcastChatMessage,{common,user,content:'VÀO nào'}],['gift',WebcastGiftMessage,gift()],['like',WebcastLikeMessage,{common,user,count:20,total:'12345'}]]){
    const fixture={...codec.decode(new Uint8Array()),...data,common:{...CommonMessageData.decode(new Uint8Array()),...data.common},user:{...User.decode(new Uint8Array()),...data.user}};if(data.gift)fixture.gift={...Gift.decode(new Uint8Array()),...data.gift};
    const decoded=codec.decode(codec.encode(fixture).finish()),result=event(type,decoded);assert.equal(result.userId,user.id);assert.equal(result.ten,'Quỳnh');assert.match(result.id,/8912345678901234567/);
    if(type==='chat')assert.equal(result.noiDung,'VÀO nào');if(type==='gift'){assert.equal(result.tenQua,'Rose');assert.equal(result.giftType,1);assert.equal(result.xu,1);}if(type==='like'){assert.equal(result.soLuong,20);assert.equal(result.tongTim,12345);}
  }
  assert.equal(LIVE_EVENTS.disconnected,ControlEvent.DISCONNECTED);for(const name of ['chat','gift','like','follow','member','roomUser','streamEnd'])assert.ok(Object.values(WebcastEvent).includes(LIVE_EVENTS[name]));
  assert.equal(event('gift',gift({repeatCount:-1})),null);assert.equal(event('gift',gift({repeatCount:10001})),null);assert.equal(event('chat',{user:{id:'0'},content:'hey'}),null);
});

test('TikTok names and private signing configuration validate, persist and redact',async t=>{
  assert.equal(tiktokUsername(' https://www.tiktok.com/@quynh_1/live '),'quynh_1');assert.equal(tiktokUsername('@quynh.test'),'quynh.test');
  for(const bad of ['https://tiktok.com.evil/@test','https://evil@tiktok.com/@test','http://tiktok.com/@test','https://tiktok.com:444/@test','a/b','user name','name.',''])assert.throws(()=>tiktokUsername(bad));
  const store=await storeFor(t);await store.save({username:'@quynh_test',signApiKey:'private-test-key'});assert.equal(store.config.username,'quynh_test');assert.equal(publicLiveConfig(store.config).keyConfigured,true);assert.doesNotMatch(JSON.stringify(publicLiveConfig(store.config)),/private-test-key|signApiKey/);
  await store.save({joinWord:'nhảy',signApiKey:''});assert.equal(store.config.signApiKey,'private-test-key');assert.equal(store.config.joinWord,'nhảy');await store.save({clearKey:true});assert.equal(store.config.signApiKey,'');assert.throws(()=>validateLiveConfig({likesEvery:0}));
});

test('real installed connector is constructed with the documented options and rotating keys',async()=>{
  const a=await connectorFactory('quynh_test','key-a'),b=await connectorFactory('quynh_test','key-b'),c=await connectorFactory('quynh_test','');
  assert.equal(typeof a.connect,'function');assert.equal(typeof a.disconnect,'function');assert.notEqual(a,b);assert.notEqual(b,c);
  await Promise.all([a.disconnect(),b.disconnect(),c.disconnect()]);
});

test('LIVE connects when the optional room gift catalogue requires a paid signing plan',async t=>{
  const connection=await connectorFactory('quynh_test','');
  const original=RouteConfig.fetchSignedWebSocketFromProvider;
  t.after(async()=>{RouteConfig.fetchSignedWebSocketFromProvider=original;await connection.disconnect();});
  connection.fetchRoomId=async()=>'room-regression';
  connection.fetchRoomInfo=async()=>({data:{status:2}});
  let giftRequests=0,signedRequests=0,websockets=0;
  connection.fetchAvailableGifts=async()=>{giftRequests++;throw new SignatureMissingTokensError('This endpoint requires a Business plan.');};
  RouteConfig.fetchSignedWebSocketFromProvider=async()=>{signedRequests++;return {fetchResult:{cursor:'cursor',internalExt:'',pushServer:'wss://example.test'},fetchResultCookieHeader:'test=1',fetchResultRoomId:'room-regression'};};
  connection.setupWebsocket=async()=>{websockets++;};
  const state=await connection.connect();
  assert.equal(state.roomId,'room-regression');assert.equal(giftRequests,0);assert.equal(signedRequests,1);assert.equal(websockets,1);
  const actual=event('gift',gift({gift:{name:'Rose',type:1,diamondCount:1}}));
  assert.equal(actual.giftId,'5655');assert.equal(actual.tenQua,'Rose');assert.equal(actual.xu,1);
});

test('paid signing failures have actionable Vietnamese messages without exposing provider payloads',()=>{
  const error=new SignatureMissingTokensError('This endpoint requires a Business plan. private-test-key');
  const result=liveError(error);assert.equal(result.code,'signing_plan');assert.match(result.message,/trả phí/);assert.doesNotMatch(JSON.stringify(result),/private-test-key/);
  assert.equal(liveError(new SignatureMissingTokensError('missing tokens')).code,'signing');
});

test('first events are buffered until room activation; stale callbacks are ignored after manual disconnect',async t=>{
  const store=await storeFor(t),received=[],rooms=[];let finish;const fake=new FakeConnection(connection=>{connection.emit('chat',{common,user,content:'hey'});return new Promise(resolve=>finish=resolve);});
  const live=new TikTokLiveService({store,factory:()=>fake,onConnected:id=>rooms.push(id),onEvent:e=>{assert.equal(rooms.length,1);received.push(e);}});t.after(()=>live.disconnect());
  await live.start({username:'quynh_test'});await until(()=>finish);assert.equal(received.length,0);finish({roomId:'room-1'});await until(()=>live.state.status==='connected');assert.equal(received.length,1);assert.equal(received[0].roomId,'room-1');
  await live.disconnect();fake.emit('gift',gift());assert.equal(received.length,1);assert.equal(live.state.status,'disconnected');assert.equal(live.timer,null);
});

test('cancel while connecting closes a late connection and never activates the room',async t=>{
  const store=await storeFor(t);let finish,activated=0;const fake=new FakeConnection(()=>new Promise(resolve=>finish=resolve));const live=new TikTokLiveService({store,factory:()=>fake,onConnected:()=>activated++});
  await live.start({username:'quynh_test'});await until(()=>finish);await live.disconnect();finish({roomId:'old-room'});await delay(10);assert.equal(activated,0);assert.equal(live.state.status,'disconnected');assert.ok(fake.closed>=1);
});

test('concurrent connect requests are rejected; failures redact secrets; timeout and offline have Vietnamese messages',async t=>{
  const store=await storeFor(t);const live=new TikTokLiveService({store,factory:()=>new FakeConnection(async()=>{throw Object.assign(Error('private-test-key'),{name:'UserOfflineError'});})});
  const start=live.start({username:'quynh_test',signApiKey:'private-test-key'});await assert.rejects(live.start({username:'other'}),/Đang nối/);await start;await until(()=>live.state.status==='error');assert.equal(live.state.errorCode,'offline');assert.match(live.state.message,/chưa LIVE/);assert.doesNotMatch(JSON.stringify(live.snapshot()),/private-test-key|signApiKey/);
  const slow=new TikTokLiveService({store,factory:()=>new FakeConnection(()=>new Promise(()=>{})),timeoutMs:15});t.after(()=>slow.disconnect());await slow.start();await until(()=>slow.state.status==='error');assert.equal(slow.state.errorCode,'timeout');
});

test('disconnect retries are bounded and stream end never retries',async t=>{
  const store=await storeFor(t);let created=0;const first=new FakeConnection();const live=new TikTokLiveService({store,retryDelays:[5,5,5],factory:()=>{created++;return created===1?first:new FakeConnection(async()=>{throw Error('network');});}});t.after(()=>live.disconnect());
  await live.start({username:'quynh_test'});await until(()=>live.state.status==='connected');first.emit('disconnected');await until(()=>live.state.status==='error');assert.equal(created,4);assert.equal(live.enabled,false);
  const second=new FakeConnection();const ended=new TikTokLiveService({store,factory:()=>second,retryDelays:[5]});await ended.start();await until(()=>ended.state.status==='connected');second.emit('streamEnd');assert.equal(ended.enabled,false);assert.equal(ended.state.status,'disconnected');await delay(10);assert.equal(ended.timer,null);
});

function game(config=defaultLiveConfig()){
 const rules=defaultGiftRules();rules[0].externalId='5655';const room=new RoomEngine(rules);let now=100000;
 const adapter=new TikTokGameAdapter({room:()=>room,config:()=>config,clock:()=>now});return {room,adapter,advance:()=>now+=10001};
}
test('actual comments join by stable user ID; equal display names stay distinct',()=>{
  const {room,adapter}=game();adapter.receive(event('chat',{common,user,content:'chào'}));assert.equal(room.players.length,0);adapter.receive(event('chat',{common:{msgId:'2'},user,content:'HEY nào'}));adapter.receive(event('chat',{common:{msgId:'3'},user:{...user,id:'another-id'},content:'hey'}));assert.equal(room.players.length,2);assert.notEqual(room.players[0].id,room.players[1].id);assert.equal(room.players[0].name,room.players[1].name);
});

test('gift combos 1 → 3 → final 3 and duplicate messages count exactly three; new combo counts again',()=>{
  const {room,adapter}=game();for(const count of [1,3])adapter.receive(event('gift',gift({repeatCount:count})));adapter.receive(event('gift',gift({repeatCount:3,repeatEnd:1})));adapter.receive(event('gift',gift({repeatCount:3,repeatEnd:1})));assert.equal(room.totalGifts,3);assert.equal(adapter.snapshot().stats.gifts,3);assert.equal(room.queue.length,1);
  adapter.receive(event('gift',gift({common:{msgId:'2'},groupId:'other'})));assert.equal(room.totalGifts,4);
  const noGroup=gift({common:{msgId:'3'},groupId:'0',repeatCount:5});adapter.receive(event('gift',noGroup));assert.equal(room.totalGifts,4);adapter.receive(event('gift',{...noGroup,repeatEnd:1}));assert.equal(room.totalGifts,9);
});

test('unmapped and disabled real gifts stay out of TOP; the catalog records the actual ID',()=>{
  const {room,adapter}=game();adapter.receive(event('gift',gift({giftId:'9999'})));assert.equal(room.totalGifts,0);assert.equal(adapter.snapshot().recentGifts[0].giftId,'9999');assert.equal(adapter.snapshot().stats.unmapped,1);
  const rules=defaultGiftRules();rules[0].externalId='5655';rules[0].enabled=false;room.setGiftRules(rules);assert.equal(adapter.receive(event('gift',gift({common:{msgId:'disabled-message'}}))).reason,'gift_disabled');assert.equal(room.totalGifts,0);
});

test('likes and follows trigger limited effects without changing gifts or TOP',()=>{
  const {room,adapter,advance}=game();adapter.receive(event('like',{common,user,count:19}));assert.equal(room.queue.length,0);adapter.receive(event('like',{common:{msgId:'2'},user,count:1}));assert.equal(room.queue[0].action,'jump');adapter.receive(event('like',{common:{msgId:'3'},user,count:100}));assert.equal(room.queue.length,1);advance();adapter.receive(event('like',{common:{msgId:'4'},user,count:1}));assert.equal(room.queue.length,2);
  adapter.receive(event('follow',{common:{msgId:'5'},user}));assert.equal(room.queue.at(-1).action,'camera');assert.equal(room.totalGifts,0);assert.equal(room.players[0].gifts,0);assert.equal(room.giftLeaders.length,0);
});

test('native gift prices reach coin TOP once per combo, including missing-price fallback and free gifts',()=>{
  const {room,adapter}=game();
  for(const [repeatCount,repeatEnd] of [[1,0],[3,0],[3,1],[3,1]])adapter.receive(event('gift',gift({gift:{id:'5655',name:'Rose',type:1,diamondCount:2},repeatCount,repeatEnd})));
  assert.equal(room.totalCoins,6);assert.equal(adapter.snapshot().stats.coins,6);assert.equal(room.giftLeaders[0].coins,6);
  adapter.receive(event('gift',gift({common:{msgId:'missing-price'},groupId:'new',repeatEnd:1,gift:{name:'Rose',type:1}})));assert.equal(room.totalCoins,7);
  adapter.receive(event('gift',gift({common:{msgId:'free'},groupId:'free',repeatEnd:1,gift:{name:'Rose',type:1,diamondCount:0}})));assert.equal(room.totalCoins,7);
  assert.equal(event('gift',gift({gift:{name:'Rose',diamondCount:-1}})),null);
});


test('a full effect queue buffers real gifts, coalesces a combo, then drains without double counting',()=>{
 const {room,adapter}=game();for(let i=0;i<100;i++)room.react({id:'reaction-'+i,user:{id:'u',name:'A'},action:'jump',label:'Tim'});
 assert.equal(adapter.receive(event('gift',gift())).pending,true);adapter.receive(event('gift',gift({repeatCount:3})));adapter.receive(event('gift',gift({repeatCount:3,repeatEnd:1})));assert.equal(adapter.snapshot().pendingGifts,1);assert.equal(room.totalGifts,0);
 room.tick(100);adapter.flush();assert.equal(room.totalGifts,3);assert.equal(adapter.snapshot().pendingGifts,0);adapter.flush();assert.equal(room.totalGifts,3);assert.equal(room.totalCoins,3);assert.equal(adapter.snapshot().stats.coins,3);
});

test('full rooms retain their 120 viewers and return a clear failure for another viewer',()=>{
 const {room,adapter}=game();room.populate(120);const original=room.players.map(p=>p.id);const result=adapter.receive(event('chat',{common,user,content:'hey'}));assert.equal(result.reason,'room_full');assert.deepEqual(room.players.map(p=>p.id),original);assert.match(adapter.snapshot().lastResult,/120 người/);
});

test('a non-streak gift message replay does not count twice when repeatEnd changes',()=>{
 const {room,adapter}=game();adapter.receive(event('gift',gift({gift:{name:'Rose',type:2},groupId:'0'})));adapter.receive(event('gift',gift({gift:{name:'Rose',type:2},groupId:'0',repeatEnd:1})));assert.equal(room.totalGifts,1);
});
