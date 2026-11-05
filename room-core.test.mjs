import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomEngine,GIFTS,MAX_PLAYERS,defaultGiftRules,validateGiftRules} from './dist/room-core.mjs';
import {GIFT_CATALOG,catalogGift} from './dist/gift-catalog.mjs';
const event=(id,repeatCount=1,streakId='streak')=>({id,user:{id:'viewer-1',name:'Linh'},gift:'rose',repeatCount,streakId});
test('a cumulative combo counts only the increase, including its final replay',()=>{const r=new RoomEngine();assert.equal(r.receive(event('a',1)).delta,1);assert.equal(r.receive(event('b',3)).delta,2);assert.equal(r.receive(event('c',3)).delta,0);assert.equal(r.totalGifts,3);assert.equal(r.players[0].gifts,3);assert.equal(r.queue.length,1);assert.equal(r.queue[0].count,3);});
test('replayed messages are idempotent, separate streaks count independently',()=>{const r=new RoomEngine();r.receive(event('a',2));r.receive(event('a',2));r.receive(event('b',2,'new-streak'));assert.equal(r.totalGifts,4);});
test('actions remain FIFO and finish after their specified duration',()=>{const r=new RoomEngine();r.receive(event('a'));r.receive({...event('b'),gift:'doughnut'});assert.equal(r.tick(10).action,'camera');assert.equal(r.tick(12).action,'camera');assert.equal(r.tick(10+GIFTS.rose.duration+.1).action,'fly');assert.equal(r.queue.length,0);assert.equal(r.tick(10+GIFTS.rose.duration+.1+GIFTS.doughnut.duration+.01),null);});
test('stable user IDs keep different viewers with the same display name distinct',()=>{const r=new RoomEngine();r.receive(event('a'));r.receive({...event('b'),user:{id:'viewer-2',name:'Linh'}});assert.equal(r.players.length,2);assert.equal(r.players[0].gifts,1);assert.equal(r.players[1].gifts,1);});
test('invalid events and full rooms do not alter gift accounting',()=>{const r=new RoomEngine();assert.equal(r.receive({...event('bad'),repeatCount:-1}).ok,false);assert.equal(r.totalGifts,0);for(let i=0;i<MAX_PLAYERS;i++)r.addPlayer('Guest '+i,'id-'+i);assert.equal(r.receive(event('a')).reason,'room_full');assert.equal(r.totalGifts,0);assert.equal(r.queue.length,0);});
test('queue overflow can be retried with the same message after capacity is freed',()=>{const r=new RoomEngine();for(let i=0;i<100;i++)r.queue.push({action:'camera',userId:'seed-'+i});assert.equal(r.receive(event('a')).reason,'queue_full');assert.equal(r.totalGifts,0);r.queue.pop();assert.equal(r.receive(event('a')).delta,1);});
test('reset discards prior duplicate IDs and cancels queued actions',()=>{const r=new RoomEngine();r.receive(event('a'));r.tick(1);r.reset();assert.equal(r.active,null);assert.equal(r.queue.length,0);assert.equal(r.receive(event('a')).delta,1);});
test('malformed input and prototype names cannot create actions',()=>{const r=new RoomEngine();assert.equal(r.receive(null).ok,false);assert.equal(r.receive({...event('a'),gift:'constructor'}).ok,false);assert.equal(r.queue.length,0);assert.equal(r.totalGifts,0);});

test('temporary jump and monkey actions keep the selected sticker and leave the queue in order',()=>{const r=new RoomEngine();const p=r.addPlayer('Linh','viewer-1');r.select(p.id);r.costume('pink');assert.equal(p.skin,'pink');r.receive({...event('jump'),gift:'jump'});r.receive({...event('monkey'),gift:'wukong'});assert.equal(r.tick(10).action,'jump');assert.equal(r.tick(13.7).action,'wukong');assert.equal(p.skin,'pink');assert.equal(r.tick(30),null);assert.equal(p.skin,'pink');r.costume('unknown');assert.equal(p.skin,'pink');});

test('VIP wings persist after the camera scene, count combo deltas and never downgrade gold',()=>{
  const r=new RoomEngine();
  r.receive({...event('gold-1',1,'gold'),gift:'wings'});
  r.receive({...event('gold-3',3,'gold'),gift:'wings'});
  r.receive({...event('gold-replay',3,'gold'),gift:'wings'});
  const p=r.players[0];assert.equal(p.prestige,30);assert.equal(p.aura,'gold');
  r.tick(10);r.tick(30);assert.equal(r.active,null);assert.equal(p.aura,'gold');
  r.receive({...event('silver',1,'silver'),gift:'crown'});
  assert.equal(p.aura,'gold');assert.equal(p.prestige,33);assert.equal(r.leaders[0].id,p.id);
});

test('crowd population preserves existing IDs, selection and gifts, and respects capacity',()=>{
  const r=new RoomEngine();r.addPlayer('Existing','crowd-1');r.select('crowd-1');
  r.receive({...event('existing'),user:{id:'crowd-1',name:'Existing'}});
  const before={...r.players[0]};r.populate(100);
  assert.equal(r.players.length,100);assert.equal(new Set(r.players.map(p=>p.id)).size,100);
  assert.deepEqual(r.players[0],before);assert.equal(r.selectedId,'crowd-1');assert.equal(r.totalGifts,1);
  r.populate(999);assert.equal(r.players.length,MAX_PLAYERS);
});

test('20 background NPCs are distinct, never enter TOP and yield full-room slots to real viewers',()=>{
  const room=new RoomEngine();room.addNpcs();room.addNpcs();
  assert.equal(room.players.length,20);assert.ok(room.players.every(p=>p.isNpc&&!p.name.includes('NPC')&&p.name.length<=24&&p.coins===0&&p.gifts===0));assert.equal(new Set(room.players.map(p=>p.name)).size,20);
  assert.equal(new Set(room.players.map(p=>p.id)).size,20);assert.equal(room.giftLeaders.length,0);assert.equal(room.queue.length,0);
  const firstViewer=room.addPlayer(room.players[0].name,'tiktok:1');assert.equal(firstViewer.isNpc,undefined);assert.equal(room.players.length,21);assert.equal(room.players.filter(p=>p.name===firstViewer.name).length,2);
  const manualViewer=room.addPlayer(room.players[1].name);assert.equal(manualViewer.isNpc,undefined);assert.notEqual(manualViewer.id,room.players[1].id);
  room.populate(120);const viewerIds=room.players.filter(p=>!p.isNpc).map(p=>p.id);
  for(let i=0;i<20;i++)assert.ok(room.addPlayer('Mới '+i,'tiktok:new-'+i));
  assert.equal(room.players.length,120);assert.equal(room.players.filter(p=>p.isNpc).length,0);assert.ok(viewerIds.every(id=>room.players.some(p=>p.id===id)));
  assert.equal(room.addPlayer('Hết chỗ','tiktok:overflow'),null);
});

test('catalogue defaults use unique real IDs, exact names and integer unit prices',()=>{
  assert.equal(GIFT_CATALOG.length,849);assert.equal(new Set(GIFT_CATALOG.map(g=>g.id)).size,849);
  for(const gift of GIFT_CATALOG){assert.match(gift.id,/^\d+$/);assert.ok(Number.isSafeInteger(gift.coins)&&gift.coins>=0);}
  const rules=defaultGiftRules();assert.equal(rules.length,14);assert.equal(new Set(rules.map(r=>r.externalId)).size,14);
  assert.equal(rules.find(r=>r.effect==='fly').coins,100);for(const rule of rules.filter(r=>!['camera','swap','walk'].includes(r.effect)))assert.ok(rule.coins>=99&&rule.coins<=200,rule.effect+' exceeds the affordable gift range');
  for(const rule of rules){const source=catalogGift(rule.externalId);assert.equal(rule.name,source.name);assert.equal(rule.coins,source.coins);}
  assert.deepEqual(catalogGift('5655'),{id:'5655',name:'Rose',coins:1});assert.deepEqual(catalogGift('11046'),{id:'11046',name:'Galaxy',coins:1000});assert.deepEqual(catalogGift('5767'),{id:'5767',name:'Private Jet',coins:4888});
});
test('priced combos account only new units and price edits do not revalue previous gifts',()=>{
  const pricingRules=defaultGiftRules();pricingRules.push({key:'catalog_galaxy',name:'Galaxy',externalId:'11046',coins:1000,effect:'galaxy_wings',enabled:true});
  const room=new RoomEngine(pricingRules),user={id:'viewer',name:'An'},send=(id,count)=>room.receive({id,giftId:'11046',user,repeatCount:count,streakId:'combo'});
  assert.equal(send('one',1).coinDelta,1000);assert.equal(send('three',3).coinDelta,2000);assert.equal(send('final',3).delta,0);send('three',3);
  assert.equal(room.totalCoins,3000);assert.equal(room.players[0].coins,3000);assert.equal(room.totalGifts,3);
  const rules=structuredClone(pricingRules);rules.find(r=>r.externalId==='11046').coins=1200;room.setGiftRules(rules);
  assert.equal(room.receive({id:'new',giftId:'11046',user}).coinDelta,1200);assert.equal(room.totalCoins,4200);assert.equal(room.players[0].coins,4200);
  room.reset();assert.equal(room.totalCoins,0);
});
test('actual event pricing wins over reference prices; explicit free gifts do not enter TOP',()=>{
  const room=new RoomEngine(),user={id:'a',name:'Linh'};
  assert.equal(room.receive({gift:'rose',unitCoins:2,repeatCount:4,user}).coinDelta,8);
  assert.equal(room.receive({gift:'galaxy_wings',unitCoins:0,user:{id:'b',name:'Linh'}}).coinDelta,0);
  assert.equal(room.totalCoins,8);assert.equal(room.giftLeaders.length,1);assert.equal(room.giftLeaders[0].id,'a');
});
test('invalid prices and overflowing totals are rejected before modifying players or accounting',()=>{
  for(const unitCoins of [-1,1.5,Infinity,1000001]){const r=new RoomEngine();assert.equal(r.receive({...event('bad'),unitCoins}).reason,'invalid_coins');assert.equal(r.players.length,0);assert.equal(r.totalCoins,0);assert.equal(r.totalGifts,0);const rules=defaultGiftRules();rules[0].coins=unitCoins;assert.throws(()=>validateGiftRules(rules),/Giá xu/);}
  const r=new RoomEngine();r.totalCoins=Number.MAX_SAFE_INTEGER;assert.equal(r.receive(event('overflow')).reason,'coin_overflow');assert.equal(r.players.length,0);assert.equal(r.queue.length,0);
});
