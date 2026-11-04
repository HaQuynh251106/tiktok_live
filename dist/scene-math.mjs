export const W=1080,H=1920;
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
export function closeCamera(point,t=0,action='camera',reduce=false,height=3.65){
  const angle=reduce?0:Math.sin(t*.35)*.28;
  const distance=(action==='pair'||action===true?3.5:action==='fly'?4.3:['wings','crown'].includes(action)?2.65:2.35)*height;
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
