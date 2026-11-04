import {WING_ACTIONS} from './effect-math.mjs';
export const W=1080,H=1920;
// A dedicated VIP zone behind all 120 floor slots keeps podium faces out of bodies.
export const VIP_PODIUMS=[{x:0,y:2.3,z:-51},{x:-11,y:1.7,z:-51},{x:11,y:1.7,z:-51}];
export const VIP_HEIGHT=6.0;
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const smoother=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const unit=v=>{const length=Math.hypot(v.x,v.y,v.z)||1;return {x:v.x/length,y:v.y/length,z:v.z/length};};

// Slots never depend on room size: adding viewers cannot resize existing people.
export function floorSlot(index){
  let column=index,row=0;
  while(column>=Math.min(11,7+row*2)){column-=Math.min(11,7+row*2);row++;}
  const lane=column===0?0:Math.ceil(column/2)*(column%2?-1:1);
  const spacing=row===0?138:row===1?105:83;
  return floorFromScreen(540+lane*spacing+(row%2?18:-8),1480-row*80+Math.sin(index*2.4)*7);
}
// Lay out the room in world coordinates with staggered screen-space headroom.
// The canonical camera is fixed, so population and gift state cannot reshuffle it.
export function floorFromScreen(x,y){
  const basis=cameraBasis(overviewCamera(0,true));
  const sx=(x-W/2)/basis.focal,sy=(H/2-y)/basis.focal;
  const ray=Object.fromEntries(['x','y','z'].map(key=>[key,basis.forward[key]+basis.right[key]*sx+basis.up[key]*sy]));
  const distance=-basis.eye.y/ray.y;
  return {x:basis.eye.x+ray.x*distance,y:0,z:basis.eye.z+ray.z*distance};
}
export function characterScale(index){
  const p=project(floorSlot(index),cameraBasis(overviewCamera(0,true)));
  return clamp(120/(3.65*p.scale),1,1.85);
}
export function effectEnvelope(active,now){
  if(!active)return 0;
  const elapsed=now-active.startAt,left=active.endsAt-now;
  return smoother(elapsed/1.35)*smoother(left/1.55);
}
export function overviewCamera(t=0,reduce=false){
  const angle=reduce?0:Math.sin(t*.065)*.08;
  return {x:Math.sin(angle)*45,y:32,z:26*Math.cos(angle),tx:0,ty:1,tz:-10,focal:1350};
}
export function cinematicCamera(time=0,reduce=false){
  const shots=[
    {label:'TOÀN SÀN 3D',camera:overviewCamera(0,true),stage:0},
    {label:'GÓC TRÁI 3D',camera:{x:-17,y:27,z:29,tx:-1,ty:2,tz:-14,focal:1270},stage:0},
    {label:'SÂN KHẤU TOP',camera:{x:-7,y:18,z:-20,tx:0,ty:5.5,tz:-54,focal:1150},stage:1},
    {label:'GÓC PHẢI 3D',camera:{x:17,y:26,z:27,tx:1,ty:2,tz:-14,focal:1270},stage:0},
    {label:'TRÊN CAO 3D',camera:{x:9,y:37,z:23,tx:0,ty:1,tz:-18,focal:1280},stage:0},
    {label:'BẢNG TOP QUÀ',camera:{x:-25,y:14,z:-27,tx:-25,ty:6.5,tz:-56.5,focal:1180},stage:1}
  ];
  if(reduce)return {camera:shots[0].camera,label:shots[0].label,stageWeight:0};
  const elapsed=Math.max(0,time),index=Math.floor(elapsed/12)%shots.length,phase=elapsed%12;
  const current=shots[index],next=shots[(index+1)%shots.length],weight=smoother((phase-8.5)/3.5);
  return {camera:blendCamera(current.camera,next.camera,weight),label:weight>.5?next.label:current.label,stageWeight:lerp(current.stage,next.stage,weight)};
}
export function closeCamera(point,t=0,action='camera',reduce=false,height=3.65){
  const angle=reduce?0:Math.sin(t*.35)*.28;
  const distance=(action==='pair'||action===true?3.5:action==='fly'?4.5:action==='phoenix_fly'?5.3:WING_ACTIONS.has(action)?3.5:2.35)*height;
  return {x:point.x+Math.sin(angle)*distance,y:point.y+height*1.28,z:point.z+Math.cos(angle)*distance,tx:point.x,ty:point.y+height*.58,tz:point.z,focal:1420};
}
export function blendCamera(a,b,weight){return Object.fromEntries(Object.keys(a).map(key=>[key,lerp(a[key],b[key],weight)]));}
// Exact critically damped integration keeps velocity continuous on retargeting.
export function dampCamera(current,target,velocity,dt,frequency=8){
  const decay=Math.exp(-frequency*dt),result={};
  for(const key of Object.keys(target)){
    const offset=current[key]-target[key],v=velocity[key]||0,step=(v+frequency*offset)*dt;
    result[key]=target[key]+(offset+step)*decay;
    velocity[key]=(v-frequency*step)*decay;
  }
  return result;
}
export function tourFocus(time,count){
  const cycle=12,phase=((time%cycle)+cycle)%cycle;
  return {index:count?Math.floor(Math.max(0,time)/cycle)%count:0,weight:smoother((phase-.5)/1.7)*smoother((11.5-phase)/1.9)};
}
export function cameraBasis(camera){
  const eye={x:camera.x,y:camera.y,z:camera.z};
  const forward=unit(subtract({x:camera.tx,y:camera.ty,z:camera.tz},eye));
  const right=unit(cross(forward,{x:0,y:1,z:0})),up=cross(right,forward);
  return {eye,forward,right,up,focal:camera.focal};
}
export function project(point,basis){
  const delta=subtract(point,basis.eye),depth=dot(delta,basis.forward);
  if(depth<.4)return null;
  const scale=basis.focal/depth;
  return {x:W*.5+dot(delta,basis.right)*scale,y:H*.5-dot(delta,basis.up)*scale,scale,depth};
}
