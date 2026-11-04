import test from 'node:test';
import assert from 'node:assert/strict';
import {floorSlot,floorGroup,socialPosition,characterScale,project,cameraBasis,overviewCamera,closeCamera,effectEnvelope,blendCamera,dampCamera,tourFocus,W,H} from './dist/scene-math.mjs';
import {PerspectiveCamera,Vector3,MathUtils} from './dist/vendor/three.module.js';
test('adding 100 viewers preserves the position and projected size of the first 10',()=>{
  const basis=cameraBasis(overviewCamera(0,true));
  const firstTen=Array.from({length:10},(_,i)=>project(floorSlot(i),basis));
  const hundred=Array.from({length:100},(_,i)=>project(floorSlot(i),basis));
  assert.deepEqual(hundred.slice(0,10),firstTen);
  const heights=Array.from({length:10},(_,i)=>characterScale(i));assert.deepEqual(Array.from({length:100},(_,i)=>characterScale(i)).slice(0,10),heights);
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
test('a full room spreads across the floor in singles, pairs and small groups',()=>{
  const basis=cameraBasis(overviewCamera(0,true)),groups=new Map(),positions=Array.from({length:120},(_,i)=>floorSlot(i));let visible=0;
  for(let i=0;i<120;i++){
    const group=floorGroup(i);groups.set(group.group,(groups.get(group.group)||0)+1);
    const point=project(positions[i],basis),height=3.65*characterScale(i)*point.scale;
    assert.ok(height>=85);if(point.x>0&&point.x<W&&point.y>400&&point.y<1640)visible++;
    assert.ok(Math.abs(positions[i].x)<31);assert.ok(positions[i].z>-42&&positions[i].z<24);
    for(let j=0;j<i;j++)assert.ok(Math.hypot(positions[i].x-positions[j].x,positions[i].z-positions[j].z)>3,'people overlap on the ground');
  }
  assert.equal(groups.size,40);for(const size of [1,2,3,4,5])assert.equal([...groups.values()].filter(n=>n===size).length,8);
  assert.ok(visible>=85);assert.ok(Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x))>55);
  assert.ok(Math.max(...positions.map(p=>p.z))-Math.min(...positions.map(p=>p.z))>55);
});
test('social idle motion stays near the reserved spot and does not collapse the gaps',()=>{
  for(const time of [0,12,47,130])for(let i=0;i<120;i++){
    const base=floorSlot(i),pose=socialPosition(i,time);assert.ok(Math.hypot(pose.x-base.x,pose.z-base.z)<.44);assert.deepEqual(socialPosition(i,time,true),base);
    for(let j=0;j<i;j++){const other=socialPosition(j,time);assert.ok(Math.hypot(pose.x-other.x,pose.z-other.z)>2.5);}
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
