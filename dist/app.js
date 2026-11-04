import {RoomEngine,MAX_PLAYERS} from './room-core.mjs';
import {CAST,drawSticker,stickerReady,loadCustomStickers,stickerInfo,decodeStickerFile} from './stickers.mjs';
import {createStage} from './scene.mjs';
const $=id=>document.getElementById(id);
const overlay=new URLSearchParams(location.search).get('overlay')==='1';
if(overlay)document.body.classList.add('overlay');
const room=new RoomEngine();
const seeds=['Minh Anh','Mèo Mướp','Khánh','Linh','Hoàng','Bảo Ngọc','Cá Con','Mây','Bắp'];
seeds.forEach(name=>room.addPlayer(name));
let giftSignature='',musicState=null;
let theme='violet',cameraMode='auto',customSignature='',autoDemo=false,localHub=false,followController=overlay,lastRevision=-1,toastTimer,tickerTimer,autoTimer,serial=0,roomEpoch=Date.now(),announcement=null;
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('neon-room-v1'):null;
const THEMES={violet:{a:'#ba8bff',b:'#ed73cb',floor:'#100d20',wall:'#19102e'},mint:{a:'#73ffd0',b:'#68b7ff',floor:'#07191d',wall:'#0b2426'},sunset:{a:'#ff997a',b:'#f477c7',floor:'#21101c',wall:'#301322'}};
function snapshot(){return {players:room.players,queue:room.queue,active:room.active,logs:room.logs,totalGifts:room.totalGifts,selectedId:room.selectedId,counter:room.counter,revision:room.revision,theme,cameraMode,autoDemo,roomEpoch,announcement};}
function restore(s){if(!s||!Array.isArray(s.players))return;const gifts=JSON.stringify(s.giftRules||[]);if(s.giftRules&&giftSignature!==gifts){giftSignature=gifts;room.setGiftRules(s.giftRules);renderGifts();}musicState=s.music;if(musicState?.playing&&soundOn)stopSynth();for(const k of ['players','queue','active','logs','totalGifts','selectedId','counter'])room[k]=s[k];room.revision=Math.max(room.revision+1,s.revision||0);theme=THEMES[s.theme]?s.theme:theme;cameraMode=s.cameraMode||'auto';const signature=JSON.stringify(s.customCast||[]);if(signature!==customSignature){customSignature=signature;loadCustomStickers(s.customCast||[]).catch(error=>{$('sticker-status').textContent=error.message;}).finally(renderCast);}autoDemo=!!s.autoDemo;roomEpoch=s.roomEpoch||roomEpoch;if(s.announcement?.expiresAt>Date.now())ticker(s.announcement.text,s.announcement.expiresAt);else{announcement=null;$('ticker-text').textContent='Một cái tên. Một nhân vật. Một sân khấu.';}renderUI();}
channel?.addEventListener('message',e=>{if(localHub)return;if(e.data?.type==='request'&&!overlay)channel.postMessage({type:'state',state:snapshot()});if(e.data?.type==='state'&&overlay){followController=true;restore(e.data.state);}});
channel?.postMessage({type:'request'});
function sync(){if(!localHub&&!overlay)channel?.postMessage({type:'state',state:snapshot()});}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function ticker(text,expiresAt=Date.now()+6500){announcement={text,expiresAt};$('ticker-text').textContent=text;clearTimeout(tickerTimer);tickerTimer=setTimeout(()=>{$('ticker-text').textContent='Một cái tên. Một nhân vật. Một sân khấu.';announcement=null;},Math.max(0,expiresAt-Date.now()));}
function applyCommand(cmd){
  if(cmd.type==='join'){const p=room.addPlayer(cmd.name);if(!p){toast(`Phòng thử tối đa ${MAX_PLAYERS} nhân vật.`);return;}room.select(p.id);ticker(`${p.name} vừa vào sàn ✦`);}
  if(cmd.type==='select')room.select(cmd.id);
  if(cmd.type==='shuffle')room.shuffle();
  if(cmd.type==='costume')room.costume(cmd.skin);
  if(cmd.type==='populate')room.populate(cmd.count);
  if(cmd.type==='camera'){cameraMode=cmd.mode;room.revision++;}
  if(cmd.type==='gift'){const p=room.selected;if(!p)return;const result=room.receive({id:`test-${roomEpoch}-${++serial}`,gift:cmd.gift,user:{id:p.id,name:p.name},repeatCount:cmd.count,streakId:`test-${serial}`});if(!result.ok){toast(result.reason==='queue_full'?'Hàng đợi đang đầy. Hãy đợi hoặc bỏ qua hiệu ứng.':'Chưa thể thêm tương tác này.');return;}ticker(`${p.name} tặng ${room.getGiftSpec(cmd.gift).giftName} ×${cmd.count}`);blip();}
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
function configureAuto(){clearInterval(autoTimer);if(autoDemo&&!localHub&&!overlay)autoTimer=setInterval(()=>{const p=room.players[Math.floor(Math.random()*room.players.length)];room.select(p.id);applyCommand({type:'gift',gift:room.giftRules.filter(r=>r.enabled)[Math.floor(Math.random()*room.giftRules.filter(r=>r.enabled).length)]?.key,count:1});},6500);}
if(['localhost','127.0.0.1'].includes(location.hostname)){
  fetch('/api/status').then(r=>r.ok?r.json():null).then(s=>{if(s?.service!=='neon-room')return;localHub=true;followController=true;clearInterval(autoTimer);const stream=new EventSource('/api/stream');stream.onmessage=e=>{restore(JSON.parse(e.data));};stream.onerror=()=>{if(!overlay)toast('Đang kết nối lại với phòng trên Windows…');};}).catch(()=>{});
}
$('player-form').addEventListener('submit',e=>{e.preventDefault();const name=$('player-name').value.trim();if(name){command({type:'join',name});$('player-name').value='';}});
$('gift-grid').addEventListener('click',e=>{const b=e.target.closest('[data-gift]');if(b)command({type:'gift',gift:b.dataset.gift,count:Number($('combo').value)});});
function renderGifts(){
  const grid=$('gift-grid'),legend=document.querySelector('.stage-legend');grid.replaceChildren();legend.replaceChildren();
  for(const rule of room.giftRules.filter(r=>r.enabled)){
    const spec=room.getGiftSpec(rule.key),button=document.createElement('button');button.type='button';button.className='gift-button'+(spec.aura==='gold'?' premium-gift':'');button.dataset.gift=rule.key;
    const icon=document.createElement('span'),label=document.createElement('strong'),name=document.createElement('small'),arrow=document.createElement('span');icon.className='gift-emoji';icon.textContent=spec.icon;label.textContent=spec.label;name.textContent=rule.name;arrow.className='gift-arrow';arrow.textContent='↗';button.append(icon,label,name,arrow);grid.append(button);
    if(legend.children.length<10){const item=document.createElement('span'),caption=document.createElement('b');item.append(document.createTextNode(spec.icon));caption.textContent=rule.name.toLocaleUpperCase();item.append(caption);legend.append(item);}
  }
  if(!grid.children.length){const empty=document.createElement('p');empty.className='field-hint';empty.textContent='Chưa bật loại quà nào. Mở Quản trị để cấu hình.';grid.append(empty);}
}
renderGifts();
function renderCast(){
  const picker=$('cast-picker');
  for(const actor of CAST){
    if(picker.querySelector(`[data-skin="${actor.id}"]`))continue;
    const b=document.createElement('button');b.type='button';b.dataset.skin=actor.id;b.className='cast-button';b.setAttribute('aria-label',actor.name);
    const picture=document.createElement('canvas');picture.width=120;picture.height=120;picture.className='cast-thumb';
    const preview=picture.getContext('2d');preview.translate(60,116);drawSticker(preview,actor.id,0,{height:108,time:0});
    const label=document.createElement('span');label.textContent=actor.name;b.append(picture,label);
    if(actor.custom){const info=document.createElement('small');info.textContent=stickerInfo(actor.id);b.append(info);}
    b.addEventListener('click',()=>command({type:'costume',skin:actor.id}));picker.append(b);
  }
  renderUI();
}
stickerReady.then(renderCast);
document.querySelectorAll('[data-populate]').forEach(b=>b.addEventListener('click',()=>command({type:'populate',count:Number(b.dataset.populate)})));
document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>command({type:'camera',mode:b.dataset.camera})));
$('sticker-files').addEventListener('change',async event=>{
  if(!localHub){$('sticker-status').textContent='Mở bộ chạy Windows để nạp sticker và đồng bộ OBS.';return;}
  for(const file of event.target.files){
    try{
      if(file.size>8*1024*1024)throw Error('Sticker tối đa 8 MB.');
      $('sticker-status').textContent=`Đang đọc ${file.name}…`;
      const prepared=await decodeStickerFile(file);
      const response=await fetch('/api/stickers?name='+encodeURIComponent(file.name.replace(/\.[^.]+$/,'')),{method:'POST',body:file});
      const data=await response.json();if(!response.ok)throw Error(data.error);
      await loadCustomStickers([data.item],new Map([[data.item.id,prepared]]));renderCast();$('sticker-status').textContent=`${data.item.name} · ${stickerInfo(data.item.id)}`;
    }catch(error){$('sticker-status').textContent=error.message;}
  }
  event.target.value='';
});
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
  document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===cameraMode)));
  const leader=room.leaders[0];$('vip-status').textContent=leader?`${leader.name} · ${leader.aura==='gold'?'Đại bàng':'Vương giả'}`:'Quà Vua / Đại bàng mở cánh và hào quang';
  $('auto-demo').checked=autoDemo;
  const log=$('event-log');log.replaceChildren();
  if(!room.logs.length){const li=document.createElement('li');li.className='empty-log';li.textContent='Sân khấu đã sẵn sàng. Thử một món quà đầu tiên.';log.append(li);}
  room.logs.slice(0,8).forEach(ev=>{const li=document.createElement('li'),icon=document.createElement('span'),content=document.createElement('span'),name=document.createElement('strong'),sub=document.createElement('small'),time=document.createElement('span');icon.className='log-icon';icon.textContent=ev.icon;content.className='log-content';name.textContent=ev.name;sub.textContent=`${ev.label} · ×${ev.count}`;content.append(name,sub);time.className='log-time';time.textContent=new Date(ev.time).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});li.append(icon,content,time);log.append(li);});
  $('log-count').textContent=`${room.logs.length} sự kiện`;
}
let stage=null,lastFrame=0;
try{stage=createStage($('stage'));}
catch(error){console.error('Khởi tạo sân khấu 3D:',error);$('render-error').hidden=false;$('render-error').textContent='Chưa khởi tạo được sàn 3D. Mở bằng Chrome/Edge hoặc OBS có hỗ trợ WebGL 2 và tăng tốc phần cứng.';$('render-status').textContent='Không khởi tạo được WebGL 2';}
function animate(stamp){requestAnimationFrame(animate);if(stamp-lastFrame<32)return;lastFrame=stamp;const now=Date.now()/1000;if(!localHub&&!followController)room.tick(now);if(room.revision!==lastRevision){lastRevision=room.revision;renderUI();sync();}if(!stage)return;const view=stage.render(now,room,{epoch:roomEpoch,colors:THEMES[theme],cameraMode});$('camera-view').textContent=view.mode;$('render-status').textContent=view.error||('Sàn 3D · '+view.visible+' nhân vật trong khung · '+view.fps+' FPS');$('render-error').hidden=!view.error;if(view.error)$('render-error').textContent=view.error;}
renderUI();requestAnimationFrame(animate);
// Sound is an original synthesized rhythm, disabled until the user enables it.
let audio=null,soundOn=false,beatTimer=null,beatStep=0;
function note(frequency,volume=.07,duration=.1){if(!audio||!soundOn)return;const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;o.type='sine';o.frequency.setValueAtTime(frequency,now);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(now+duration);}
function blip(){note(660,.045,.12);setTimeout(()=>note(880,.035,.14),80);}
function stopSynth(){soundOn=false;clearInterval(beatTimer);audio?.suspend();$('sound-toggle').textContent='♫ Nhịp mẫu: Tắt';$('sound-toggle').setAttribute('aria-pressed','false');}
$('sound-toggle').addEventListener('click',async()=>{if(musicState?.playing){toast('Tạm dừng SoundCloud trong trang Quản trị trước khi bật nhịp mẫu.');return;}try{audio??=new (window.AudioContext||window.webkitAudioContext)();soundOn=!soundOn;if(soundOn){await audio.resume();beatTimer=setInterval(()=>{note(beatStep%4===0?64:128,beatStep%4===0?.08:.025,.1);if(beatStep%2===0)note([220,277.18,329.63,415.3][Math.floor(beatStep/4)%4],.025,.19);beatStep++;},285);}else{clearInterval(beatTimer);await audio.suspend();}$('sound-toggle').textContent=`♫ Nhịp mẫu: ${soundOn?'Bật':'Tắt'}`;$('sound-toggle').setAttribute('aria-pressed',soundOn);}catch{toast('Trình duyệt chưa cho phép âm thanh.');}});
// Future connectors should send the normalized event documented in README.md.
window.NeonRoom={receiveEvent(event){if(localHub)return Promise.reject(new Error('Gửi sự kiện tới /api/event của máy chủ cục bộ.'));const result=room.receive(event);renderUI();sync();return result;},getState:()=>snapshot()};
