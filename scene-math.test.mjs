import test from 'node:test';
import assert from 'node:assert/strict';
import {floorSlot,project,cameraBasis,overviewCamera,closeCamera,effectEnvelope,blendCamera} from './dist/scene-math.mjs';
test('adding 100 viewers preserves the position and projected size of the first 10',()=>{
  const basis=cameraBasis(overviewCamera(0,true));
  const firstTen=Array.from({length:10},(_,i)=>project(floorSlot(i),basis));
  const hundred=Array.from({length:100},(_,i)=>project(floorSlot(i),basis));
  assert.deepEqual(hundred.slice(0,10),firstTen);
  assert.ok(firstTen[0].scale>hundred[70].scale);
});
test('a close-up moves the camera and magnifies its actual world target',()=>{
  const target=floorSlot(52),wide=overviewCamera(0,true),close=closeCamera(target,0,false,true);
  const before=project(target,cameraBasis(wide)),after=project(target,cameraBasis(close));
  assert.ok(after.scale>before.scale*2);
  assert.ok(Math.abs(after.x-540)<1);
  assert.notEqual(close.z,wide.z);
  for(const weight of [0,.1,.5,.9,1]){const p=project(target,cameraBasis(blendCamera(wide,close,weight)));assert.ok(p&&Number.isFinite(p.x)&&Number.isFinite(p.scale));}
});
test('camera entrance and return are smooth and stay inside the effect duration',()=>{
  const active={startAt:10,endsAt:17};
  assert.equal(effectEnvelope(active,9),0);assert.equal(effectEnvelope(active,10),0);
  assert.ok(effectEnvelope(active,10.3)<effectEnvelope(active,10.6));
  assert.equal(effectEnvelope(active,12),1);assert.equal(effectEnvelope(active,17),0);assert.equal(effectEnvelope(null,10),0);
});
test('airplane close-ups leave room for the vehicle width',()=>{
  const target=floorSlot(12),view=project(target,cameraBasis(closeCamera(target,0,'fly',true)));
  assert.ok(view.scale*3.65*3<1080*.9);
});
