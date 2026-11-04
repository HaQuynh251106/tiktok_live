import {RoomEngine,GIFTS} from './room-core.mjs';
import {CAST,drawSticker,planeImage,stickerReady} from './stickers.mjs';
const $=id=>document.getElementById(id);
const overlay=new URLSearchParams(location.search).get('overlay')==='1';
if(overlay)document.body.classList.add('overlay');
const room=new RoomEngine();
const seeds=['Minh Anh','Mèo Mướp','Khánh','Linh','Hoàng','Bảo Ngọc','Cá Con','Mây','Bắp'];
seeds.forEach(name=>room.addPlayer(name));
let theme='violet',autoDemo=false,localHub=false,followController=overlay,lastRevision=-1,toastTimer,tickerTimer,autoTimer,serial=0,roomEpoch=Date.now(),announcement=null;
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('neon-room-v1'):null;
const THEMES={violet:{a:'#ba8bff',b:'#ed73cb',floor:'#100d20',wall:'#19102e'},mint:{a:'#73ffd0',b:'#68b7ff',floor:'#07191d',wall:'#0b2426'},sunset:{a:'#ff997a',b:'#f477c7',floor:'#21101c',wall:'#301322'}};
function snapshot(){return {players:room.players,queue:room.queue,active:room.active,logs:room.logs,totalGifts:room.totalGifts,selectedId:room.selectedId,counter:room.counter,revision:room.revision,theme,autoDemo,roomEpoch,announcement};}
function restore(s){if(!s||!Array.isArray(s.players))return;for(const k of ['players','queue','active','logs','totalGifts','selectedId','counter'])room[k]=s[k];room.revision=Math.max(room.revision+1,s.revision||0);theme=THEMES[s.theme]?s.theme:theme;autoDemo=!!s.autoDemo;roomEpoch=s.roomEpoch||roomEpoch;if(s.announcement?.expiresAt>Date.now())ticker(s.announcement.text,s.announcement.expiresAt);else{announcement=null;$('ticker-text').textContent='Một cái tên. Một nhân vật. Một sân khấu.';}renderUI();}
channel?.addEventListener('message',e=>{if(localHub)return;if(e.data?.type==='request'&&!overlay)channel.postMessage({type:'state',state:snapshot()});if(e.data?.type==='state'&&overlay){followController=true;restore(e.data.state);}});
channel?.postMessage({type:'request'});
function sync(){if(!localHub&&!overlay)channel?.postMessage({type:'state',state:snapshot()});}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function ticker(text,expiresAt=Date.now()+6500){announcement={text,expiresAt};$('ticker-text').textContent=text;clearTimeout(tickerTimer);tickerTimer=setTimeout(()=>{$('ticker-text').textContent='Một cái tên. Một nhân vật. Một sân khấu.';announcement=null;},Math.max(0,expiresAt-Date.now()));}
function applyCommand(cmd){
  if(cmd.type==='join'){const p=room.addPlayer(cmd.name);if(!p){toast('Phòng thử tối đa 40 nhân vật.');return;}room.select(p.id);ticker(`${p.name} vừa vào sàn ✦`);}
  if(cmd.type==='select')room.select(cmd.id);
  if(cmd.type==='shuffle')room.shuffle();
  if(cmd.type==='costume')room.costume(cmd.skin);
  if(cmd.type==='gift'){const p=room.selected;if(!p)return;const result=room.receive({id:`test-${roomEpoch}-${++serial}`,gift:cmd.gift,user:{id:p.id,name:p.name},repeatCount:cmd.count,streakId:`test-${serial}`});if(!result.ok){toast(result.reason==='queue_full'?'Hàng đợi đang đầy. Hãy đợi hoặc bỏ qua hiệu ứng.':'Chưa thể thêm tương tác này.');return;}ticker(`${p.name} tặng ${GIFTS[cmd.gift].giftName} ×${cmd.count}`);blip();}
  if(cmd.type==='theme'&&THEMES[cmd.theme]){theme=cmd.theme;room.revision++;}
  if(cmd.type==='skip')room.skip();
  if(cmd.type==='auto'){autoDemo=!!cmd.enabled;configureAuto();room.revision++;}
  if(cmd.type==='reset'){room.reset();seeds.forEach(name=>room.addPlayer(name));autoDemo=false;roomEpoch=Date.now();serial=0;configureAuto();ticker('Phòng mới đã sẵn sàng ✦');}
  renderUI();sync();
}
async function command(cmd){
  if(localHub){try{const res=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cmd)});const data=await res.json();if(!res.ok)throw Error(data.error||'Không nhận được thao tác.');if(cmd.type==='join')ticker(`${cmd.name} vừa vào sàn ✦`);if(cmd.type==='gift')blip();}catch(e){toast(e.message);}return;}
  applyCommand(cmd);
}
function configureAuto(){clearInterval(autoTimer);if(autoDemo&&!localHub&&!overlay)autoTimer=setInterval(()=>{const p=room.players[Math.floor(Math.random()*room.players.length)];room.select(p.id);applyCommand({type:'gift',gift:Object.keys(GIFTS)[Math.floor(Math.random()*Object.keys(GIFTS).length)],count:1});},6500);}
if(['localhost','127.0.0.1'].includes(location.hostname)){
  fetch('/api/status').then(r=>r.ok?r.json():null).then(s=>{if(s?.service!=='neon-room')return;localHub=true;followController=true;clearInterval(autoTimer);const stream=new EventSource('/api/stream');stream.onmessage=e=>{restore(JSON.parse(e.data));};stream.onerror=()=>{if(!overlay)toast('Đang kết nối lại với phòng trên Windows…');};}).catch(()=>{});
}
$('player-form').addEventListener('submit',e=>{e.preventDefault();const name=$('player-name').value.trim();if(name){command({type:'join',name});$('player-name').value='';}});
$('gift-grid').addEventListener('click',e=>{const b=e.target.closest('[data-gift]');if(b)command({type:'gift',gift:b.dataset.gift,count:Number($('combo').value)});});
for(const actor of CAST){const b=document.createElement('button');b.type='button';b.dataset.skin=actor.id;b.className='cast-button';b.setAttribute('aria-label',actor.name);const picture=document.createElement('canvas');picture.width=120;picture.height=120;picture.className='cast-thumb';stickerReady.then(()=>{const preview=picture.getContext('2d');preview.translate(60,116);drawSticker(preview,actor.id,0,{height:108});});const label=document.createElement('span');label.textContent=actor.name;b.append(picture,label);b.addEventListener('click',()=>command({type:'costume',skin:actor.id}));$('cast-picker').append(b);}
$('shuffle-skin').addEventListener('click',()=>command({type:'shuffle'}));
$('skip-effect').addEventListener('click',()=>command({type:'skip'}));
$('reset').addEventListener('click',()=>command({type:'reset'}));
$('auto-demo').addEventListener('change',e=>command({type:'auto',enabled:e.target.checked}));
document.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',()=>command({type:'theme',theme:b.dataset.theme})));
$('fullscreen').addEventListener('click',()=>{const el=$('stage-shell');if(el.requestFullscreen)el.requestFullscreen().catch(()=>toast('Hãy dùng nút Màn hình OBS để mở sân khấu riêng.'));else toast('Mở Màn hình OBS để xem sân khấu riêng.');});
function renderUI(){
  const p=room.selected;if(!p)return;
  $('player-count').firstChild.textContent=room.players.length;
  $('gift-count').firstChild.textContent=room.totalGifts;
  $('queue-count').firstChild.textContent=room.queue.length;
  $('stage-count').textContent=`${String(room.players.length).padStart(2,'0')} NHÂN VẬT`;
  $('selected-name').textContent=p.name;$('selected-avatar').textContent=p.name.charAt(0);$('selected-avatar').style.background=p.color;
  const picker=$('player-picker');const ids=new Set(room.players.map(x=>x.id));
  [...picker.children].forEach(el=>{if(!ids.has(el.dataset.id))el.remove();});
  for(const player of room.players){let chip=[...picker.children].find(c=>c.dataset.id===player.id);if(!chip){chip=document.createElement('button');chip.type='button';chip.className='player-chip';chip.dataset.id=player.id;const avatar=document.createElement('span');avatar.textContent=player.name[0];avatar.style.setProperty('--avatar',player.color);const name=document.createElement('b');name.style.fontWeight='400';name.textContent=player.name;chip.append(avatar,name);chip.addEventListener('click',()=>command({type:'select',id:player.id}));picker.append(chip);}chip.setAttribute('aria-pressed',String(player.id===room.selectedId));}
  const a=room.active;$('stage-shell').dataset.effect=a?.action||'idle';$('action-icon').textContent=a?a.icon:'✦';$('action-type').textContent=a?`${a.label.toLocaleUpperCase()}${a.count>1?' · COMBO ×'+a.count:''}`:'SÀN NHẢY ĐANG MỞ';$('action-name').textContent=a?a.name:'Chọn nhân vật, thử một món quà';
  $('queue-status').textContent=a?`${a.label} · ${a.name}${room.queue.length?' · '+room.queue.length+' lượt chờ':''}`:'Sẵn sàng nhận quà thử';$('queue-dot').style.background=a?'#c6ff76':'#76768a';$('skip-effect').disabled=!a;
  document.querySelectorAll('[data-theme]').forEach(b=>{const selected=b.dataset.theme===theme;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);});
  document.querySelectorAll('[data-skin]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skin===p.skin)));
  $('auto-demo').checked=autoDemo;
  const log=$('event-log');log.replaceChildren();
  if(!room.logs.length){const li=document.createElement('li');li.className='empty-log';li.textContent='Sân khấu đã sẵn sàng. Thử một món quà đầu tiên.';log.append(li);}
  room.logs.slice(0,8).forEach(ev=>{const li=document.createElement('li'),icon=document.createElement('span'),content=document.createElement('span'),name=document.createElement('strong'),sub=document.createElement('small'),time=document.createElement('span');icon.className='log-icon';icon.textContent=ev.icon;content.className='log-content';name.textContent=ev.name;sub.textContent=`${ev.label} · ×${ev.count}`;content.append(name,sub);time.className='log-time';time.textContent=new Date(ev.time).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});li.append(icon,content,time);log.append(li);});
  $('log-count').textContent=`${room.logs.length} sự kiện`;
}
const canvas=$('stage'),ctx=canvas.getContext('2d',{alpha:false});const W=1080,H=1920;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let cam={x:W/2,y:H/2,zoom:1};let lastFrame=0;
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function line(x1,y1,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function text(txt,x,y,size,color='#fff',weight=600,align='center'){ctx.font=`${weight} ${size}px "Be Vietnam Pro",sans-serif`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(txt,x,y);}
function glowLine(x1,y1,x2,y2,color,width=3){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=16;line(x1,y1,x2,y2,color,width);ctx.restore();}
function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function star(x,y,r,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.3:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.restore();}
function heart(x,y,size,color){ctx.save();ctx.translate(x,y);ctx.scale(size/30,size/30);ctx.beginPath();ctx.moveTo(0,10);ctx.bezierCurveTo(-35,-10,-17,-33,0,-13);ctx.bezierCurveTo(17,-33,35,-10,0,10);ctx.fillStyle=color;ctx.fill();ctx.restore();}
function position(p,now){
  const count=room.players.length,index=room.players.indexOf(p),cols=Math.min(6,Math.max(3,Math.ceil(Math.sqrt(count*1.35)))),rows=Math.ceil(count/cols);
  const row=Math.floor(index/cols),col=index%cols,inRow=Math.min(cols,count-row*cols),depth=rows===1?.6:row/(rows-1);
  let x=.5+(col-(inRow-1)/2)*(.74/(cols-1)),y=H*(rows===1?.715:.55+depth*.25);
  const step=rows>1?H*.25/(rows-1):300;
  let scale=Math.min(1.15,step/320)*(.94+depth*.06);
  const a=room.active;
  if(a?.action==='walk'&&a.userId===p.id){const u=clamp((now-a.startAt)/a.duration,0,1);x=.5+.31*Math.sin(u*Math.PI*2+p.phase);y=H*(.68+.105*Math.cos(u*Math.PI*2+p.phase));scale=1.15;}
  return {x:W*x,y,scale,depth};
}
function backdrop(t,c){
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#10091d');bg.addColorStop(.5,c.wall);bg.addColorStop(1,c.floor);ctx.fillStyle=bg;ctx.fillRect(-W,-H,W*3,H*3);
  const aura=ctx.createRadialGradient(W*.5,H*.4,20,W*.5,H*.4,W*.8);aura.addColorStop(0,c.a+'35');aura.addColorStop(1,'#00000000');ctx.fillStyle=aura;ctx.fillRect(0,0,W,H);
  // Architectural neon arches, drawn wide enough for a moving camera.
  for(let i=0;i<4;i++){const inset=65+i*56;ctx.save();ctx.strokeStyle=i%2?c.b+'55':c.a+'77';ctx.shadowColor=c.a;ctx.shadowBlur=15;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(inset,H*.205,W-inset*2,H*.43,110-i*15);ctx.stroke();ctx.restore();}
  const hy=H*.46;
  ctx.fillStyle=c.floor;ctx.fillRect(-W,hy,W*3,H);
  const floorGlow=ctx.createLinearGradient(0,hy,0,H);floorGlow.addColorStop(0,c.a+'20');floorGlow.addColorStop(1,'#00000000');ctx.fillStyle=floorGlow;ctx.fillRect(-W,hy,W*3,H);
  for(let i=-8;i<=8;i++)glowLine(W*.5,hy,W*.5+i*210,H*1.15,i%2?c.a+'45':c.b+'38',1.5);
  for(let i=0;i<17;i++){const d=((i+t*.18)%17)/17;const yy=hy+Math.pow(d,2.1)*H*.72;glowLine(-W,yy,W*2,yy,c.a+(i%3===0?'68':'28'),i%3===0?2.5:1);}
  for(let i=0;i<8;i++){const xx=W*(.05+i*.13),yy=hy+30;ellipse(xx,yy,38,8,c.a+'45');}
  // Slowly sweeping translucent spotlights.
  for(let i=0;i<5;i++){const ox=W*(.08+i*.21),oy=H*.23;const dx=Math.sin(t*(reduce?.08:.27)+i*1.7)*W*.44;const g=ctx.createLinearGradient(ox,oy,ox+dx,H*.85);g.addColorStop(0,c.a+'38');g.addColorStop(1,c.a+'00');ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+dx-100,H);ctx.lineTo(ox+dx+120,H);ctx.closePath();ctx.fillStyle=g;ctx.fill();circle(ox,oy,7,'#e8deff');}
  // Mirror ball: a set of tiny mirrored facets.
  ctx.save();ctx.translate(W*.5,H*.238);ctx.rotate(Math.sin(t*.2)*.05);const ball=ctx.createRadialGradient(-22,-30,3,0,0,74);ball.addColorStop(0,'#e7dbff');ball.addColorStop(.5,'#715d98');ball.addColorStop(1,'#22172f');circle(0,0,73,ball);ctx.beginPath();ctx.arc(0,0,72,0,Math.PI*2);ctx.clip();for(let y=-7;y<8;y++)for(let x=-7;x<8;x++){const gl=.3+.65*Math.max(0,Math.sin(x*.8+t*.7+y*.2));ctx.fillStyle=`rgba(239,219,255,${gl})`;ctx.fillRect(x*11+Math.sin(t*.3)*5,y*11,8,8);}ctx.restore();glowLine(W*.5,0,W*.5,H*.238-74,c.a+'55',2);
  // DJ booth and nameplate.
  ctx.save();ctx.shadowColor=c.a;ctx.shadowBlur=25;roundRect(W*.25,H*.404,W*.5,115,20,'#130f22',c.a+'88');ctx.restore();roundRect(W*.27,H*.414,W*.46,70,12,c.a+'10');text('NEON ROOM',W*.5,H*.44,36,'#ecdfff',800);text('D A N C E   T O G E T H E R',W*.5,H*.468,12,c.a,500);
  for(let i=0;i<18;i++){const h=10+(Math.sin(t*2.3+i*.76)+1)*13;ctx.fillStyle=i%3?c.a+'77':c.b+'aa';ctx.fillRect(W*.34+i*20,H*.402-h,8,h);}
  const top=room.top;if(top?.gifts){roundRect(W*.33,H*.352,W*.34,53,26,'#211830e6','#dfc57288');text(`★ ${top.name.slice(0,17)} · ${top.gifts}`,W*.5,H*.371,20,'#ffdd89',700);}
  // Ambient sparkles and a pair of speaker stacks.
  for(let i=0;i<30;i++){const x=(i*127.71)%W,y=H*.21+((i*113.13+t*8)% (H*.5));const alpha=.18+.18*Math.sin(t+i);ctx.globalAlpha=alpha;star(x,y,i%5===0?8:4,'#f5e1ff');}ctx.globalAlpha=1;
  for(const x of [W*.065,W*.85]){roundRect(x,H*.4,W*.085,H*.13,10,'#100b19','#765e9844');circle(x+W*.0425,H*.445,29,'#1d152b','#74569188');circle(x+W*.0425,H*.445,12,'#ad8bd122');circle(x+W*.0425,H*.49,18,'#20152b','#70569166');}
}
function character(p,x,y,s,t,selected=false,options={}){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  const energy=(reduce?.15:1)*(options.intensity??1),phase=t*10.6+p.phase,beat=Math.sin(phase),half=Math.sin(phase*.5);
  const hop=Math.pow(Math.max(0,beat),1.15)*(options.jump?108:43)*energy,sway=half*18*energy;
  ellipse(0,3,Math.max(20,63-hop*.22),Math.max(5,12-hop*.025),'#00000066');
  ellipse(0,0,54,8,p.color+'30');
  ctx.save();ctx.translate(sway,-hop+Math.max(0,-beat)*8*energy);ctx.rotate(half*(options.jump?.16:.105)*energy);
  ctx.scale(1+beat*.035*energy,1-beat*.045*energy);
  if(!drawSticker(ctx,options.skin||p.skin,t*6+p.phase,{height:225,jump:options.jump&&beat>.15})){
    circle(0,-95,42,'#f0e8ff');text('…',0,-85,32,'#342440');
  }
  ctx.restore();
  if(!options.hideName){const name=p.name.length>14?p.name.slice(0,13)+'…':p.name;ctx.font='500 17px "Be Vietnam Pro",sans-serif';const nw=Math.min(190,ctx.measureText(name).width+46);
    ctx.lineWidth=1.5;roundRect(-nw/2,-310,nw,31,15,'#160f26f0',selected?'#d6ff8c':p.color+'88');circle(-nw/2+16,-295,10,p.color);text(p.name[0],-nw/2+16,-291,11,'#fff',600);text(name,9,-289,16,'#f5eaff',500);}
  if(selected){ctx.save();ctx.shadowColor='#d1ff72';ctx.shadowBlur=12;ctx.strokeStyle='#d1ff72bb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,2,67,16,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  ctx.restore();
}
function plane(p,t,progress,c){
  const fade=Math.max(0,Math.min(1,progress/.08,(1-progress)/.08));
  const x=W*.5+Math.sin(t*1.8)*20,y=H*.69+Math.sin(t*3)*24;
  for(let i=0;i<14;i++){const drift=(t*155+i*47)%450;ctx.globalAlpha=(1-drift/450)*.65*fade;heart(x+180+drift,y+Math.sin(i+t)*100,14+i%3*5,c.b);}ctx.globalAlpha=1;
  ctx.save();ctx.globalAlpha=fade;ctx.translate(x,y);ctx.rotate(Math.sin(t*2)*.075);ctx.scale(1.1,1.1);
  ellipse(0,190,250,24,'#00000033');
  // Draw the pilot first so the fuselage covers the lower body.
  character(p,-14,-55,.95,t,false,{hideName:true,intensity:.7});
  if(planeImage.complete&&planeImage.naturalWidth)ctx.drawImage(planeImage,-430,-215,860,430);
  ctx.restore();
}
function burst(pos,t,c,monkey=false){
  const phase=(t*1.8)%1;
  ctx.save();ctx.globalAlpha=(1-phase)*.7;ctx.strokeStyle=monkey?'#ffd66b':c.a;ctx.lineWidth=7*(1-phase)+1;
  ctx.beginPath();ctx.ellipse(pos.x,pos.y+8,70+phase*320,18+phase*70,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  if(monkey){for(let i=0;i<7;i++){const x=pos.x-170+i*55;ellipse(x,pos.y+8+Math.sin(t*3+i)*12,50,23,'#ffd67c55');}}
  for(let i=0;i<14;i++){const a=i*Math.PI/7+t*.8,r=140+(Math.sin(t*2+i)+1)*55;star(pos.x+Math.cos(a)*r,pos.y-220+Math.sin(a)*r,7+i%3*3,monkey?'#ffe08b':c.a);}
}
function crownEffect(p,pos,t,c){
  const hop=Math.pow(Math.max(0,Math.sin(t*10.6+p.phase)),1.15)*43*(reduce?.15:1)*1.15;
  ctx.save();ctx.translate(pos.x,pos.y-(240+hop)*pos.scale);ctx.scale(pos.scale*.7,pos.scale*.7);ctx.rotate(Math.sin(t)*.05);ctx.fillStyle='#ffe090';ctx.shadowColor='#ffd776';ctx.shadowBlur=25;ctx.beginPath();ctx.moveTo(-65,10);ctx.lineTo(-80,-48);ctx.lineTo(-35,-26);ctx.lineTo(0,-73);ctx.lineTo(35,-26);ctx.lineTo(80,-48);ctx.lineTo(65,10);ctx.closePath();ctx.fill();ctx.shadowBlur=0;roundRect(-64,9,128,21,8,'#f1ac57');circle(0,-27,9,c.b);ctx.restore();text('BÁ CHỦ',pos.x,pos.y+62,22,'#ffe0a0',700);
  for(let i=0;i<18;i++){const a=i*2.4+t*.4;star(pos.x+Math.cos(a)*140,pos.y-140+Math.sin(a)*150,5+i%4,'#ffe7a0');}
}
function draw(now){
  const t=now-roomEpoch/1000;const c=THEMES[theme];const a=room.active;
  const activePlayer=a?room.players.find(p=>p.id===a.userId):null;
  const spotlight=!!activePlayer&&['camera','swap','crown','pair','fly','walk','jump','wukong'].includes(a.action);
  cam.x=mix(cam.x,W/2,.1);cam.y=mix(cam.y,H/2,.1);cam.zoom=mix(cam.zoom,spotlight?1.035:1,.1);
  ctx.fillStyle=c.floor;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);backdrop(t,c);
  const ordered=room.players.map(p=>({p,pos:position(p,now)})).sort((a,b)=>a.pos.depth-b.pos.depth);
  if(spotlight){
    // Keep the cast behind a separate foreground performance area.
    const extras=ordered.filter(({p})=>p.id!==a.userId&&(a.action!=='pair'||p.id!==a.partnerId));
    ctx.save();ctx.globalAlpha=.24;extras.forEach(({p},i)=>{const x=[.11,.28,.72,.89][i%4]*W,y=H*(.565+Math.min(3,Math.floor(i/4))*.065);character(p,x,y,.64,t,false,{hideName:true,intensity:.65});});ctx.restore();
    const g=ctx.createRadialGradient(W*.5,H*.68,40,W*.5,H*.68,W*.5);g.addColorStop(0,c.a+'25');g.addColorStop(1,c.a+'00');ctx.fillStyle=g;ctx.fillRect(0,H*.4,W,H*.45);
    if(a.action!=='fly'){
      const u=clamp((now-a.startAt)/.3,0,1),arrival=1-Math.pow(1-u,3),partner=a.action==='pair'?room.players.find(p=>p.id===a.partnerId):null;
      const path=a.action==='walk'?position(activePlayer,now):null;
      const pos={x:path?path.x:W*.5,y:path?path.y:H*.765,scale:(path?1.5:a.action==='camera'?2.55:a.action==='swap'?2.35:2.15)*(.9+.1*arrival)};
      if(partner){pos.x=W*.28;pos.scale=1.65;character(partner,W*.72,pos.y,pos.scale,t,true,{hideName:true,intensity:1.15});}
      if(['jump','wukong'].includes(a.action))burst(pos,t,c,a.action==='wukong');
      character(activePlayer,pos.x,pos.y,pos.scale,t,true,{hideName:true,intensity:a.action==='jump'?1.35:1.15,jump:a.action==='jump',skin:a.action==='wukong'?'wukong':null});
      if(a.action==='pair'){for(let i=0;i<8;i++){const yy=H*.75-((t*100+i*49)%330);heart(W*.5+Math.sin(i+t)*42,yy,18+i%3*5,c.b);}}
      if(a.action==='crown')crownEffect(activePlayer,pos,t,c);
      if(a.action==='swap'){for(let i=0;i<14;i++){const angle=i*Math.PI/7+t*1.5;star(pos.x+Math.cos(angle)*190,pos.y-220+Math.sin(angle)*230,6+i%3*3,c.a);}}
    }
  }else{
    for(const {p,pos} of ordered){if(a?.action==='walk'&&p.id===a.userId)continue;character(p,pos.x,pos.y,pos.scale,t,p.id===room.selectedId);}
    if(a?.action==='walk'&&activePlayer){const pos=position(activePlayer,now);character(activePlayer,pos.x,pos.y,pos.scale,t,true,{intensity:1.2});}
  }
  ctx.restore();
  if(a?.action==='fly'&&activePlayer)plane(activePlayer,t,(now-a.startAt)/a.duration,c);
  const vignette=ctx.createLinearGradient(0,0,0,H);vignette.addColorStop(0,'#08050f99');vignette.addColorStop(.17,'#08050f00');vignette.addColorStop(.78,'#08050f00');vignette.addColorStop(1,'#08050fcc');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function animate(stamp){requestAnimationFrame(animate);if(stamp-lastFrame<32)return;lastFrame=stamp;const now=Date.now()/1000;if(!localHub&&!followController)room.tick(now);if(room.revision!==lastRevision){lastRevision=room.revision;renderUI();sync();}draw(now);}
renderUI();requestAnimationFrame(animate);
// Sound is an original synthesized rhythm, disabled until the user enables it.
let audio=null,soundOn=false,beatTimer=null,beatStep=0;
function note(frequency,volume=.07,duration=.1){if(!audio||!soundOn)return;const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;o.type='sine';o.frequency.setValueAtTime(frequency,now);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(now+duration);}
function blip(){note(660,.045,.12);setTimeout(()=>note(880,.035,.14),80);}
$('sound-toggle').addEventListener('click',async()=>{try{audio??=new (window.AudioContext||window.webkitAudioContext)();soundOn=!soundOn;if(soundOn){await audio.resume();beatTimer=setInterval(()=>{note(beatStep%4===0?64:128,beatStep%4===0?.08:.025,.1);if(beatStep%2===0)note([220,277.18,329.63,415.3][Math.floor(beatStep/4)%4],.025,.19);beatStep++;},285);}else{clearInterval(beatTimer);await audio.suspend();}$('sound-toggle').textContent=`♫ Âm thanh: ${soundOn?'Bật':'Tắt'}`;$('sound-toggle').setAttribute('aria-pressed',soundOn);}catch{toast('Trình duyệt chưa cho phép âm thanh.');}});
// Future connectors should send the normalized event documented in the Mac bundle.
window.NeonRoom={receiveEvent(event){if(localHub)return Promise.reject(new Error('Gửi sự kiện tới /api/event của bridge Mac.'));const result=room.receive(event);renderUI();sync();return result;},getState:()=>snapshot()};
