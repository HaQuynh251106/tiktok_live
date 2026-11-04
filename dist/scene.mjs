import {drawSticker,planeImage} from './stickers.mjs';
import {W,H,clamp,lerp,smooth,floorSlot,effectEnvelope,overviewCamera,closeCamera,blendCamera,cameraBasis,project} from './scene-math.mjs';

const wings=new Image();wings.src=new URL('./assets/golden-wings.png',import.meta.url).href;
export function createStage(canvas){
  const ctx=canvas.getContext('2d',{alpha:false}),positions=new Map();
  let camera=overviewCamera(),basis=cameraBasis(camera),lastNow=0;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const point=(x,y,z)=>project({x,y,z},basis);
  function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function text(value,x,y,size,color='#fff',weight=600){ctx.font=`${weight} ${size}px "Be Vietnam Pro",sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(value,x,y);}
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function polygon(vertices,fill,stroke){
    const points=vertices.map(v=>project(v,basis));if(points.some(p=>!p))return;
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  }
  function beam(a,b,color,width=2,glow=false){
    const p=project(a,basis),q=project(b,basis);if(!p||!q)return;
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;if(glow){ctx.shadowColor=color;ctx.shadowBlur=14;}ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.restore();
  }
  function box(x,z,width,depth,height,color,edge){
    polygon([{x:x-width/2,y:0,z:z+depth/2},{x:x+width/2,y:0,z:z+depth/2},{x:x+width/2,y:height,z:z+depth/2},{x:x-width/2,y:height,z:z+depth/2}],color,edge);
    polygon([{x:x-width/2,y:height,z:z-depth/2},{x:x+width/2,y:height,z:z-depth/2},{x:x+width/2,y:height,z:z+depth/2},{x:x-width/2,y:height,z:z+depth/2}],'#6a456566',edge);
    polygon([{x:x+width/2,y:0,z:z-depth/2},{x:x+width/2,y:0,z:z+depth/2},{x:x+width/2,y:height,z:z+depth/2},{x:x+width/2,y:height,z:z-depth/2}],'#161321',edge);
  }
  function floorRing(center,radius,color,t=0){
    for(let i=0;i<44;i++){
      const a=i/44*Math.PI*2+t,b=(i+1)/44*Math.PI*2+t;
      beam({x:center.x+Math.cos(a)*radius,y:center.y+.035,z:center.z+Math.sin(a)*radius},{x:center.x+Math.cos(b)*radius,y:center.y+.035,z:center.z+Math.sin(b)*radius},color,4);
    }
  }
  function backdrop(t,c,leaders){
    const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#070812');gradient.addColorStop(.48,'#23152f');gradient.addColorStop(1,'#191122');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    for(let z=-68;z<20;z+=4)for(let x=-28;x<28;x+=4){
      const checker=((x/4+z/4)%2+2)%2===0;
      polygon([{x,y:0,z},{x:x+4,y:0,z},{x:x+4,y:0,z:z+4},{x,y:0,z:z+4}],checker?'#3d3145':'#251d30','#765f7b55');
    }
    for(const x of [-15,-11,11,15])beam({x,y:.03,z:-54},{x,y:.03,z:18},x<0?c.a:c.b,5,true);
    for(const z of [-36,-20,-4,12])beam({x:-25,y:.04,z},{x:25,y:.04,z},c.b+'88',3);
    // A real projected LED wall, balcony, DJ booth and side walls provide parallax.
    for(let x=-20;x<20;x+=2.5)for(let y=1;y<21;y+=2.5){
      const bright=Math.sin(x*.22+y*.21+t*.7)>.2;
      polygon([{x,y,z:-65},{x:x+2.35,y,z:-65},{x:x+2.35,y:y+2.35,z:-65},{x,y:y+2.35,z:-65}],bright?c.b+'88':c.a+'33','#090714');
    }
    for(const z of [-59,-30,3])for(const x of [-20,20]){
      box(x,z,1.2,1.2,20,'#171321','#bf74e455');
      beam({x,y:0,z},{x,y:20,z},c.a,4,true);
    }
    box(0,-56,22,5,2.6,'#16121f',c.b);box(0,-57,12,2.5,4.4,'#13101e',c.a);
    const sign=point(0,6,-59);if(sign){text('NEON ROOM',sign.x,sign.y,clamp(sign.scale*1.5,28,70),'#fff',800);text('DANCE  •  TOGETHER',sign.x,sign.y+sign.scale*1.3,clamp(sign.scale*.55,12,26),c.a,500);}
    for(const x of [-15,15]){box(x,-34,3,3,7,'#0d0c14','#8e6cba77');const p=point(x,4,-32.45);if(p){ellipse(p.x,p.y,p.scale,p.scale,'#221b31');ellipse(p.x,p.y,p.scale*.4,p.scale*.4,c.a+'44');}}
    for(let i=0;i<8;i++){
      const source={x:-18+i*5,y:19,z:-30},end={x:Math.sin(t*.37+i*1.9)*23,y:.1,z:-8+Math.cos(t*.31+i)*16};
      const p=project(source,basis),q=project(end,basis);if(!p||!q)continue;
      const light=ctx.createLinearGradient(p.x,p.y,q.x,q.y);light.addColorStop(0,i%2?c.a+'44':c.b+'44');light.addColorStop(1,'#ffffff00');
      ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x-60,q.y);ctx.lineTo(q.x+60,q.y);ctx.closePath();ctx.fill();
      beam(source,{...end,x:end.x+2},i%2?c.a+'88':c.b+'88',1.5);
    }
    const ball=point(0,15,-14);if(ball){
      const r=2.3*ball.scale;beam({x:0,y:29,z:-14},{x:0,y:17.3,z:-14},'#d9bfff77',2);
      ctx.save();ctx.beginPath();ctx.arc(ball.x,ball.y,r,0,Math.PI*2);ctx.clip();ctx.fillStyle='#463e58';ctx.fillRect(ball.x-r,ball.y-r,r*2,r*2);
      for(let row=-6;row<7;row++)for(let col=-6;col<7;col++){const light=.15+.7*Math.max(0,Math.sin(col*.6+row*.3+t));ctx.fillStyle=`rgba(232,228,255,${light})`;ctx.fillRect(ball.x+col*r/6+Math.sin(t*.3)*r*.08,ball.y+row*r/6,r/7,r/7);}
      ctx.restore();
    }
    for(let rank=0;rank<3;rank++){
      const p={x:[0,-6.5,6.5][rank],z:-9},height=[1.35,.8,.6][rank];
      box(p.x,p.z,5.4,4.4,height,'#211422',rank===0?'#f6c965':c.a+'99');
      floorRing({...p,y:height},2.3,rank===0?'#ffd573':c.a,t*.1);
      const label=point(p.x,.1,p.z+3);if(label)text(['BÁ CHỦ','Á VƯƠNG','NGÔI SAO'][rank],label.x,label.y,clamp(label.scale*.4,12,22),rank===0?'#ffe6a5':'#d8c1ff');
    }
  }
  function featherWings(height,t,tier,focus){
    if(!wings.complete||!wings.naturalWidth)return;
    const side=wings.naturalWidth/2,span=height*(focus?1.1:1.02),flap=Math.sin(t*4)*.105;
    ctx.save();ctx.translate(0,-height*.5);if(tier==='silver')ctx.filter='saturate(.12) brightness(1.45)';
    for(const direction of [-1,1]){ctx.save();ctx.rotate(direction*flap);ctx.drawImage(wings,direction<0?0:side,0,side,wings.naturalHeight,direction<0?-span:0,-span*.4,span,span*.8);ctx.restore();}
    ctx.restore();
  }
  function crown(x,y,height,t){
    ctx.save();ctx.translate(x,y-height-20);ctx.rotate(Math.sin(t)*.06);const s=height*.2;ctx.fillStyle='#ffda75';ctx.shadowColor='#ffbc35';ctx.shadowBlur=20;
    ctx.beginPath();ctx.moveTo(-s,s*.2);ctx.lineTo(-s*1.15,-s*.7);ctx.lineTo(-s*.45,-s*.35);ctx.lineTo(0,-s);ctx.lineTo(s*.45,-s*.35);ctx.lineTo(s*1.15,-s*.7);ctx.lineTo(s,s*.2);ctx.closePath();ctx.fill();ctx.restore();
  }
  function hearts(x,y,size,color){ctx.save();ctx.translate(x,y);ctx.scale(size/30,size/30);ctx.beginPath();ctx.moveTo(0,10);ctx.bezierCurveTo(-35,-10,-17,-33,0,-13);ctx.bezierCurveTo(17,-33,35,-10,0,10);ctx.fillStyle=color;ctx.fill();ctx.restore();}
  function sparkle(x,y,r,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.25:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.restore();}
  function actor(player,world,t,selected,active,strength,c,rank,focusDepth){
    const action=active?.userId===player.id?active.action:null;
    const phase=t*9.5+player.phase,beat=Math.sin(phase),energy=reduce?.12:1;
    const hop=Math.pow(Math.max(0,beat),1.3)*(action==='jump'?1.5:.45)*energy;
    const feet=project({...world,y:world.y+hop},basis),ground=project(world,basis);if(!feet||!ground)return;
    const height=3.65*feet.scale;
    if(feet.x < -height*2||feet.x>W+height*2||feet.y<-height||feet.y>H+height||height<26)return;
    const background=active&&player.id!==active.userId&&player.id!==active.partnerId;
    if(background&&strength>.2&&feet.depth<focusDepth*1.03)return;
    if(background)ctx.globalAlpha*=1-strength*.78;
    ellipse(ground.x,ground.y+4,height*.28,height*.075,'#00000070');
    if(player.aura||selected||action){
      floorRing(world,player.aura?1.75:1.25,player.aura==='gold'?'#ffe09f':player.aura==='silver'?'#ddf9ff':c.a,t*.3);
      if(action==='jump'||action==='wukong'){const pulse=(t*1.4)%1;ctx.save();ctx.globalAlpha*=1-pulse;floorRing(world,1.5+pulse*3.5,action==='wukong'?'#ffe080':c.a);ctx.restore();}
    }
    if(action==='fly'){
      ctx.save();ctx.translate(feet.x,feet.y-height*.35);ctx.rotate(Math.sin(t*2)*.06);const width=height*3;
      ctx.save();ctx.translate(0,-height*.48);drawSticker(ctx,player.skin,t*8+player.phase,{height:height*.8,time:t+player.phase});ctx.restore();
      if(planeImage.complete&&planeImage.naturalWidth)ctx.drawImage(planeImage,-width/2,-width*.28,width,width*.5);
      ctx.restore();return;
    }
    ctx.save();ctx.translate(feet.x+Math.sin(phase*.5)*height*.035*energy,feet.y);ctx.rotate(Math.sin(phase*.5)*.065*energy);
    if(player.aura)featherWings(height,t+player.phase,player.aura,strength>.5&&!!action);
    drawSticker(ctx,action==='wukong'?'wukong':player.skin,t*8+player.phase,{height,time:t+player.phase,jump:action==='jump'&&beat>.2});
    ctx.restore();
    if(action==='crown'||(rank===0&&player.prestige>0))crown(feet.x,feet.y,height,t);
    if(action==='wings'||action==='crown'||action==='wukong')for(let i=0;i<14;i++){const angle=i*Math.PI/7+t*.6;sparkle(feet.x+Math.cos(angle)*height*.9,feet.y-height*.55+Math.sin(angle)*height*.8,4+i%3*3,'#ffeaa1');}
    if(action==='pair')for(let i=0;i<5;i++)hearts(feet.x+height*.5+Math.sin(t+i)*25,feet.y-height*.35-((t*80+i*50)%(height*1.1)),14+i%3*4,c.b);
    const label=project({...world,y:world.y+4.35+hop},basis);
    if(label&&(!background||strength<.35)&&(feet.scale>34||player.aura||selected||action)){
      const size=clamp(height*.075,14,28),name=player.name.length>16?player.name.slice(0,15)+'…':player.name;
      ctx.font=`600 ${size}px "Be Vietnam Pro",sans-serif`;const width=Math.min(310,ctx.measureText(name).width+size*2.7),lh=size*1.7;
      ctx.lineWidth=1.5;rounded(label.x-width/2,label.y-lh,width,lh,lh*.25,player.aura?'#231523eb':'#100c1cde',player.aura?'#f5cc78':selected?'#d1ff72':'#9481ad66');
      ellipse(label.x-width/2+lh*.5,label.y-lh*.5,lh*.28,lh*.28,player.color);text(player.name[0],label.x-width/2+lh*.5,label.y-lh*.38,size*.7,'#fff');
      text(name,label.x+size*.5,label.y-size*.43,size,player.aura?'#ffe6a8':'#f5edff');
      if(player.aura&&strength>.45&&action)text(player.aura==='gold'?'✦ ĐẠI BÀNG ✦':'✦ VƯƠNG GIẢ ✦',label.x,label.y-lh-size*.6,size*.85,'#ffe19d',800);
    }
    ctx.globalAlpha=1;
  }
  function render(now,room,options){
    const t=now-options.epoch/1000,c=options.colors,active=room.active,strength=effectEnvelope(active,now);
    const ranks=new Map(room.leaders.map((p,i)=>[p.id,i])),items=[];
    room.players.forEach((player,index)=>{
      const rank=ranks.get(player.id),target=rank!==undefined?{x:[0,-6.5,6.5][rank],y:[1.35,.8,.6][rank],z:-9}:floorSlot(index);
      const u=active?clamp((now-active.startAt)/active.duration,0,1):0;
      if(active?.action==='walk'&&active.userId===player.id){target.x+=Math.sin(u*Math.PI*2)*4;target.z+=(1-Math.cos(u*Math.PI*2))*2;}
      if(active?.action==='fly'&&active.userId===player.id){target.x+=Math.sin(u*Math.PI*2)*2;target.y+=2.3;}
      if(active?.action==='pair'&&active.partnerId===player.id){const lead=room.players.find(p=>p.id===active.userId),li=room.players.indexOf(lead),lr=ranks.get(lead?.id);const base=lr===undefined?floorSlot(li):{x:[0,-6.5,6.5][lr],y:[1.35,.8,.6][lr],z:-9};target.x=base.x+4.2;target.z=base.z;target.y=base.y;}
      const previous=positions.get(player.id)||{...target},follow=reduce?1:.15;
      for(const key of ['x','y','z'])previous[key]=lerp(previous[key],target[key],follow);
      positions.set(player.id,previous);items.push({player,world:{...previous},rank});
    });
    const focus=items.find(item=>item.player.id===(active?.userId||room.selectedId));
    let weight=options.cameraMode==='wide'?0:options.cameraMode==='close'?1:strength;
    const overview=overviewCamera(t,reduce),focusPoint=focus?{...focus.world}:null;
    if(active?.action==='pair'&&focusPoint)focusPoint.x+=2.1;
    const target=focusPoint?blendCamera(overview,closeCamera(focusPoint,t,active?.action,reduce),weight):overview;
    const dt=lastNow?clamp(now-lastNow,0,.1):1/30,follow=reduce?1:1-Math.exp(-dt*5.5);lastNow=now;
    camera=blendCamera(camera,target,follow);basis=cameraBasis(camera);
    ctx.globalAlpha=1;backdrop(t,c,room.leaders);
    items.sort((a,b)=>(project(b.world,basis)?.depth||0)-(project(a.world,basis)?.depth||0));
    const framing=active||(options.cameraMode==='close'?{userId:room.selectedId,action:'focus'}:null),focusDepth=focus?project(focus.world,basis)?.depth||0:0;
    for(const item of items){ctx.save();actor(item.player,item.world,t,item.player.id===room.selectedId,framing,weight,c,item.rank,focusDepth);ctx.restore();}
    const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#07040dcc');shade.addColorStop(.17,'#07040d00');shade.addColorStop(.8,'#07040d00');shade.addColorStop(1,'#07040dcc');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
    return {mode:weight>.5?'CẬN CẢNH':'TOÀN CẢNH',focus:focus?.player.name};
  }
  return {render};
}
