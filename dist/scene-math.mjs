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

const noise=seed=>{const value=Math.sin(seed*127.1+311.7)*43758.5453;return value-Math.floor(value);};
const socialSlots=[];
// Eight of each: singles, pairs and groups of three, four and five.
// Fill distant areas early; occupancy never changes an existing person's spot.
const centers=[];
for(let row=0;row<6;row++){
  const count=[7,6,7,6,7,7][row],depth=[20,13,4,-7,-20,-38][row];
  for(let column=0;column<count;column++)centers.push({x:(column-(count-1)/2)*9+(noise(row*7+column)-.5)*.6,z:depth+(noise(row*11+column+80)-.5)*.8});
}
const centerOrder=[16,30,9,35,1,24,11,38];
for(let i=0;i<40;i++){const candidate=(i*17+11)%40;if(!centerOrder.includes(candidate))centerOrder.push(candidate);}
for(let group=0;group<40;group++){
  const size=[3,1,4,2,5][group%5],center=centers[centerOrder[group]],rotation=noise(group+201)*Math.PI*2;
  for(let member=0;member<size;member++){
    const angle=rotation+member/size*Math.PI*2,radius=size===1?0:size===2?1.85:size===3?2.2:2.65;
    socialSlots.push({x:center.x+Math.cos(angle)*radius,y:0,z:center.z+Math.sin(angle)*radius,group,size,member});
  }
}
export function floorGroup(index){const {group,size,member}=socialSlots[index]||socialSlots[0];return {group,size,member};}
export function floorSlot(index){const {x,y,z}=socialSlots[index]||socialSlots[0];return {x,y,z};}
export function socialPosition(index,time=0,reduce=false){
  const slot=socialSlots[index]||socialSlots[0];if(reduce)return floorSlot(index);
  // Small shared sway preserves group spacing and leaves the aisles open.
  return {x:slot.x+Math.sin(time*.19+slot.group*2.4)*.24+Math.sin(time*.33+index)*.07,y:0,z:slot.z+Math.cos(time*.16+slot.group*1.7)*.22+Math.cos(time*.29+index)*.07};
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
  return {x:Math.sin(angle)*45,y:38,z:42*Math.cos(angle),tx:0,ty:1,tz:-12,focal:1250};
}
export function cinematicCamera(time=0,reduce=false){
  const shots=[
    {label:'TOÀN SÀN 3D',camera:overviewCamera(0,true),stage:0,duration:18},
    {label:'GÓC TRÁI 3D',camera:{x:-21,y:31,z:39,tx:-3,ty:1.5,tz:-13,focal:1230},stage:0,duration:18},
    {label:'DẠO NHÓM BẠN',camera:{x:-4,y:23,z:22,tx:-4,ty:1.5,tz:-13,focal:1180},stage:0,duration:18},
    {label:'GÓC PHẢI 3D',camera:{x:21,y:30,z:38,tx:3,ty:1.5,tz:-13,focal:1230},stage:0,duration:18},
    {label:'TRÊN CAO 3D',camera:{x:8,y:41,z:34,tx:0,ty:1,tz:-13,focal:1250},stage:0,duration:18},
    {label:'SÂN KHẤU TOP',camera:{x:-7,y:18,z:-20,tx:0,ty:5.5,tz:-54,focal:1150},stage:1,duration:6}
  ];
  if(reduce)return {camera:shots[0].camera,label:shots[0].label,stageWeight:0};
  let phase=Math.max(0,time)%96,index=0;
  while(phase>=shots[index].duration){phase-=shots[index].duration;index++;}
  const current=shots[index],next=shots[(index+1)%shots.length],weight=smoother((phase-current.duration+3.5)/3.5);
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
  if(dt<=0)return {...current};
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
