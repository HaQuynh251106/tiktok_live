export const W=1080,H=1920;
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const unit=v=>{const length=Math.hypot(v.x,v.y,v.z)||1;return {x:v.x/length,y:v.y/length,z:v.z/length};};

// Slots never depend on room size: adding viewers cannot resize existing people.
export function floorSlot(index){
  let column=index,row=0;
  while(column>=Math.min(11,7+row*2)){column-=Math.min(11,7+row*2);row++;}
  const lane=column===0?0:Math.ceil(column/2)*(column%2?-1:1);
  return {x:lane*3.2+(row%2?.65:-.2),y:0,z:7.5-row*4.4+Math.sin(index*2.4)*.3};
}
export function effectEnvelope(active,now){
  if(!active)return 0;
  const elapsed=now-active.startAt,left=active.endsAt-now;
  return smooth(elapsed/.95)*smooth(left/1.15);
}
export function overviewCamera(t=0,reduce=false){
  const angle=reduce?0:Math.sin(t*.09)*.18;
  return {x:Math.sin(angle)*31,y:18,z:27*Math.cos(angle),tx:Math.sin(t*.055)*1.2,ty:1.5,tz:-8,focal:1320};
}
export function closeCamera(point,t=0,action='camera',reduce=false){
  const angle=reduce?0:Math.sin(t*.8)*.18;
  const distance=action==='pair'||action===true?13.5:action==='fly'?16:8.8;
  return {x:point.x+Math.sin(angle)*distance,y:point.y+5,z:point.z+Math.cos(angle)*distance,tx:point.x,ty:point.y+1.85,tz:point.z,focal:1260};
}
export function blendCamera(a,b,weight){return Object.fromEntries(Object.keys(a).map(key=>[key,lerp(a[key],b[key],weight)]));}
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
