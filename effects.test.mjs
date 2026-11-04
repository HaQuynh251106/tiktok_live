import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomEngine,defaultGiftRules} from './dist/room-core.mjs';
import {WING_STYLES,wingPose,flightPose} from './dist/effect-math.mjs';
import {migrateConfig,defaultConfig} from './dist/admin-config.mjs';
import {VIP_PODIUMS,cinematicCamera,floorSlot,overviewCamera,cameraBasis,closeCamera,project} from './dist/scene-math.mjs';

test('every wing style persists on its owner and a crown cannot downgrade it',()=>{
  const room=new RoomEngine(),user={id:'vip',name:'Người tặng'};
  for(const [gift,style] of Object.entries({wings:'gold',ice_wings:'ice',fire_wings:'fire',galaxy_wings:'galaxy',storm_wings:'storm'})){
    const before=room.totalGifts;room.receive({id:gift,gift,user,repeatCount:3,streakId:gift});room.receive({id:gift+'-final',gift,user,repeatCount:3,streakId:gift});
    assert.equal(room.totalGifts,before+3);assert.equal(room.players[0].wingStyle,style);room.tick(10);room.tick(50);assert.equal(room.players[0].wingStyle,style);
  }
  room.receive({gift:'crown',user});assert.equal(room.players[0].wingStyle,'storm');assert.equal(room.players[0].aura,'gold');
});
test('gift TOP ranks count combo deltas, update when a viewer overtakes and are separate from VIP effect scores',()=>{
  const room=new RoomEngine();room.receive({id:'a1',gift:'rose',user:{id:'a',name:'An'},repeatCount:8,streakId:'a'});room.receive({id:'b1',gift:'wings',user:{id:'b',name:'Bình'}});
  assert.equal(room.giftLeaders[0].id,'a');assert.equal(room.leaders[0].id,'b');
  room.receive({id:'b2',gift:'rose',user:{id:'b',name:'Bình'},repeatCount:10,streakId:'b'});room.receive({id:'b3',gift:'rose',user:{id:'b',name:'Bình'},repeatCount:10,streakId:'b'});
  assert.equal(room.giftLeaders[0].id,'b');assert.equal(room.giftLeaders[0].gifts,11);assert.equal(room.giftLeaders[1].gifts,8);
  room.populate(120);assert.equal(room.giftLeaders.length,2);room.reset();assert.equal(room.giftLeaders.length,0);
});
test('flight paths take off and land at the original slot without jumps at either end',()=>{
  const base={x:4,y:2.3,z:-12},height=4.6;
  for(const kind of ['fly','phoenix_fly']){
    for(const u of [0,1]){const pose=flightPose(base,height,u,kind);assert.equal(pose.x,base.x);assert.equal(pose.y,base.y);assert.equal(pose.z,base.z);assert.equal(pose.lift,0);}
    assert.ok(flightPose(base,height,.5,kind).y>base.y+height);
    for(const edge of [0,1]){const pose=flightPose(base,height,edge===0?.0001:.9999,kind);assert.ok(Math.hypot(pose.x-base.x,pose.y-base.y,pose.z-base.z)<.00001);}
    const full=flightPose(base,height,.3,kind),reduced=flightPose(base,height,.3,kind,true);assert.ok(Math.abs(reduced.x-base.x)<Math.abs(full.x-base.x));
  }
});
test('close-up framing leaves space for wide wings and flying mounts',()=>{
  const base={x:0,y:0,z:0},height=4.6;
  for(const [action,width] of [['wings',2.35],['ice_wings',2.35],['fire_wings',2.35],['galaxy_wings',2.35],['storm_wings',2.35],['fly',2.5],['phoenix_fly',3.05]]){
    const basis=cameraBasis(closeCamera(base,0,action,true,height)),at=project({...base,y:height*.6},basis);assert.ok(at.scale*height*width<1080*.95,action+' clipped');
  }
});
test('both mounts complete a full circuit of the stage and point along the flight path',()=>{
  for(const kind of ['fly','phoenix_fly']){
    const base={x:6,y:0,z:4},height=4.6,points=Array.from({length:129},(_,i)=>flightPose(base,height,.18+.64*i/128,kind));
    assert.ok(Math.min(...points.map(p=>p.x))<-21);assert.ok(Math.max(...points.map(p=>p.x))>21);
    assert.ok(Math.min(...points.map(p=>p.z))<-40);assert.ok(Math.max(...points.map(p=>p.z))>8);
    assert.ok(Math.hypot(points[0].x-points.at(-1).x,points[0].z-points.at(-1).z)<1e-10);
    for(let i=1;i<points.length-1;i++){
      const before=points[i-1],after=points[i+1],pose=points[i],dx=after.x-before.x,dz=after.z-before.z;
      const alignment=(Math.cos(pose.yaw)*dx-Math.sin(pose.yaw)*dz)/Math.hypot(dx,dz);
      assert.ok(alignment>.995,'mount must face the tangent');assert.ok(pose.y>9.5);
    }
  }
});
test('wing motion has distinct rhythms and respects reduced motion',()=>{
  const values=[];for(const style of Object.keys(WING_STYLES)){const pose=wingPose(style,.63,.2),reduced=wingPose(style,.63,.2,true);assert.ok(Object.values(pose).every(Number.isFinite));assert.ok(Math.abs(reduced.flap)<=Math.abs(pose.flap));values.push(pose.flap.toFixed(4));}
  assert.ok(new Set(values).size>=5);
});
test('upgrading old admin settings keeps saved music and mappings while adding new effects once',()=>{
  const music={url:'https://soundcloud.com/forss/flickermood',volume:23,loop:true,target:'admin'},old=defaultGiftRules().slice(0,9);old[0].effect='jump';old[1].enabled=false;
  const config=migrateConfig({music,gifts:old});assert.deepEqual(config.music,music);assert.equal(config.gifts[0].effect,'jump');assert.equal(config.gifts[1].enabled,false);assert.equal(config.gifts.length,14);assert.equal(config.schemaVersion,2);assert.deepEqual(migrateConfig(config),config);
  const empty={...defaultConfig(),gifts:[]};assert.deepEqual(migrateConfig(empty).gifts,[]);
});

test('all 120 fixed floor slots remain in front of the VIP podium faces',()=>{
  for(const time of [0,15,40,80]){
    const basis=cameraBasis(overviewCamera(time));
    const nearestFace=Math.min(...VIP_PODIUMS.flatMap(p=>[-4.2,4.2].flatMap(x=>[-2.85,2.85].flatMap(z=>[0,p.y].map(y=>project({x:p.x+x,y,z:p.z+z},basis).depth)))));
    for(let i=0;i<120;i++)assert.ok(project(floorSlot(i),basis).depth<nearestFace-1,'podium can cut through player '+i);
  }
});

test('idle camera has six distinct angles and continuous transitions including the loop',()=>{
  const labels=new Set();
  for(let time=0;time<72;time+=12){const view=cinematicCamera(time);labels.add(view.label);assert.ok(Object.values(view.camera).every(Number.isFinite));}
  assert.equal(labels.size,6);
  for(const edge of [12,24,36,48,60,72]){const a=cinematicCamera(edge-.0001).camera,b=cinematicCamera(edge+.0001).camera;for(const key of Object.keys(a))assert.ok(Math.abs(a[key]-b[key])<.00001);}
  assert.deepEqual(cinematicCamera(43,true).camera,overviewCamera(0,true));
  for(const time of [0,12,36,48]){const basis=cameraBasis(cinematicCamera(time).camera);let visible=0;for(let i=0;i<120;i++){const p=project(floorSlot(i),basis);if(p&&p.x>0&&p.x<1080&&p.y>180&&p.y<1750)visible++;}assert.ok(visible>=70,'crowd missing at angle '+time);}
});
