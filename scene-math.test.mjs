import test from 'node:test';
import assert from 'node:assert/strict';
import {floorSlot,characterScale,project,cameraBasis,overviewCamera,closeCamera,effectEnvelope,blendCamera,dampCamera,tourFocus,W,H} from './dist/scene-math.mjs';
import {PerspectiveCamera,Vector3,MathUtils} from './dist/vendor/three.module.js';
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
test('world projection agrees with the actual Three.js perspective camera',()=>{
  for(const state of [overviewCamera(5),closeCamera(floorSlot(83),5,'wings',false,6)]){
    const camera=new PerspectiveCamera(MathUtils.radToDeg(2*Math.atan(H/(2*state.focal))),W/H,.15,230);
    camera.position.set(state.x,state.y,state.z);camera.lookAt(state.tx,state.ty,state.tz);camera.updateMatrixWorld();
    for(const index of [0,11,50,83,119]){
      const point=floorSlot(index),expected=project(point,cameraBasis(state));if(!expected)continue;
      const actual=new Vector3(point.x,point.y,point.z).project(camera);
      assert.ok(Math.abs((actual.x*.5+.5)*W-expected.x)<1e-7);
      assert.ok(Math.abs((-.5*actual.y+.5)*H-expected.y)<1e-7);
    }
  }
});
test('a full room keeps readable characters and staggered positions inside the wide frame',()=>{
  const basis=cameraBasis(overviewCamera(0,true));
  for(let i=0;i<120;i++){
    const point=project(floorSlot(i),basis),height=3.65*characterScale(i)*point.scale;
    assert.ok(height>=119.99);assert.ok(point.x>70&&point.x<W-70);assert.ok(point.y>500&&point.y<1510);
  }
});
test('camera damping has the same trajectory at 30 and 60 FPS',()=>{
  const from=overviewCamera(0,true),target=closeCamera(floorSlot(83),0,'camera',true,5);
  const simulate=rate=>{let state={...from};const velocity={};for(let i=0;i<rate;i++)state=dampCamera(state,target,velocity,1/rate);return state;};
  const thirty=simulate(30),sixty=simulate(60);
  for(const key of Object.keys(target))assert.ok(Math.abs(thirty[key]-sixty[key])<1e-7);
  assert.deepEqual(dampCamera(from,target,{},0),from);
});
test('crowd tours change targets only while the camera is returning to the wide shot',()=>{
  assert.equal(tourFocus(11.99,120).weight,0);assert.equal(tourFocus(12,120).weight,0);
  assert.equal(tourFocus(12,120).index,1);assert.equal(tourFocus(6,120).weight,1);
  assert.equal(tourFocus(12*121,120).index,1);
});
