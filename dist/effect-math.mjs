export const WING_STYLES={
  gold:{label:'Đại bàng vàng',file:'golden-wings.png',color:'#ffd46b',accent:'#fff1ba',speed:3.6,flap:.25,sweep:.07,feathered:true},
  silver:{label:'Cánh bạc vương giả',file:'golden-wings.png',color:'#c2e9ff',accent:'#ffffff',speed:3.1,flap:.22,sweep:.06,feathered:true},
  ice:{label:'Băng Lam',file:'wings-ice.png',color:'#62dfff',accent:'#c8faff',speed:2.2,flap:.2,sweep:.055,feathered:true},
  fire:{label:'Phượng Hoàng Lửa',file:'wings-fire.png',color:'#ff813d',accent:'#ffe791',speed:4.8,flap:.4,sweep:.13,feathered:true},
  galaxy:{label:'Cánh Ngân Hà',file:'wings-galaxy.png',color:'#bb83ff',accent:'#84f6ff',speed:3.3,flap:.5,sweep:.1,feathered:false},
  storm:{label:'Lôi Long',file:'wings-storm.png',color:'#65ffc1',accent:'#d6ff69',speed:4.1,flap:.32,sweep:.08,feathered:false}
};
export const WING_ACTIONS=new Set(['wings','crown','ice_wings','fire_wings','galaxy_wings','storm_wings']);
export const FLIGHT_ACTIONS=new Set(['fly','phoenix_fly']);
export function wingStyle(player){return Object.hasOwn(WING_STYLES,player.wingStyle)?player.wingStyle:player.aura==='gold'?'gold':'silver';}
export function wingPose(style,time,phase=0,reduced=false){
  const spec=WING_STYLES[style]||WING_STYLES.gold,beat=Math.sin(time*spec.speed+phase),energy=reduced?.08:1;
  return {flap:(.09+beat*spec.flap)*energy,sweep:beat*spec.sweep*energy,lift:Math.cos(time*spec.speed+phase)*.055*energy,stretch:1+(style==='galaxy'?Math.sin(time*6.6+phase)*.055:0)*energy,pulse:reduced?1:.78+.22*Math.sin(time*(style==='storm'?8:2.8)+phase)**2};
}
const smooth=value=>{const t=Math.min(1,Math.max(0,value));return t*t*t*(t*(t*6-15)+10);};
export function flightPose(base,height,progress,kind='fly',reduced=false){
  const u=Math.min(1,Math.max(0,progress)),lift=smooth(u/.18)*smooth((1-u)/.18);
  const travel=reduced?.12:1,phoenix=kind==='phoenix_fly',radiusX=phoenix?24:22,radiusZ=25,centerZ=-16;
  // Take off to the nearest point, complete a circuit of the floor, then land.
  const start=Math.atan2((base.z-centerZ)/radiusZ,base.x/radiusX);
  const orbit=Math.min(1,Math.max(0,(u-.18)/.64)),angle=start+Math.PI*2*smooth(orbit);
  const heading=Math.atan2(-radiusZ*Math.cos(angle),-radiusX*Math.sin(angle));
  const turn=Math.atan2(Math.sin(heading+.68),Math.cos(heading+.68));
  return {x:base.x+(Math.cos(angle)*radiusX-base.x)*lift*travel,y:base.y+(Math.max(10,height*(phoenix?2.6:2.25))+.55*Math.sin(angle-start))*lift,z:base.z+(centerZ+Math.sin(angle)*radiusZ-base.z)*lift*travel,lift,bank:-Math.sin(Math.PI*orbit)*.24*lift*travel,yaw:-.68+turn*lift,pitch:(.09*Math.sin(u*Math.PI*2)+.025*Math.cos(angle))*lift*travel};
}
export function giftLeaders(players,limit=10){return [...players].filter(player=>player.gifts>0).sort((a,b)=>b.gifts-a.gifts||(b.prestige||0)-(a.prestige||0)).slice(0,limit);}
