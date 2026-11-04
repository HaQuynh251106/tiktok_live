import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomEngine,GIFTS,MAX_PLAYERS} from './dist/room-core.mjs';
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
