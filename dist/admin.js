import {setupDemoAdmin} from './demo-admin.mjs';
import {setupTikTokAdmin} from './tiktok-admin.mjs';
import {EFFECTS,effectLabel,defaultGiftRules} from './room-core.mjs';
import {giftImageUrl,renderGiftIcon} from './gift-art.mjs';
import {giftLeaders} from './effect-math.mjs';
import {SoundCloudPlayer,post,timeLabel} from './soundcloud-player.mjs';
import {soundCloudEmbedUrl} from './admin-config.mjs';
import {GIFT_CATALOG,GIFT_CATALOG_INFO,catalogGift} from './gift-catalog.mjs';
const $=id=>document.getElementById(id);
let state=null,musicDirty=false,giftsDirty=false,musicSignature='',giftSignature='',playerSignature='',leaderSignature='',feedbackTimer;
const player=new SoundCloudPlayer($('soundcloud-container'),message=>{$('music-status').textContent=message;$('music-status').classList.add('error');feedback(message,true);});
const stagePreview=document.querySelector('iframe[title="Xem trước sân khấu 3D"]');
function syncPreview(){if(state)stagePreview.contentWindow?.postMessage({type:'neon-room:state',state},location.origin);}
stagePreview.addEventListener('load',syncPreview);
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===stagePreview.contentWindow&&event.data?.type==='neon-room:preview-ready')syncPreview();});
function feedback(message,error=false){$('admin-feedback').textContent=message;$('admin-feedback').classList.toggle('error',error);clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>$('admin-feedback').textContent='',7000);}
function setDirty(section,dirty=true){if(section==='music')musicDirty=dirty;else giftsDirty=dirty;const label=$(section==='music'?'music-save-state':'gift-save-state');label.textContent=dirty?'Chưa lưu':'Đã lưu';label.classList.toggle('dirty',dirty);}
function showPanel(id){if(!['demo','tiktok','music','gifts','room'].includes(id))id='tiktok';document.querySelectorAll('[data-panel]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.panel===id)));document.querySelectorAll('.admin-panel').forEach(panel=>panel.hidden=panel.id!=='panel-'+id);history.replaceState(null,'','#'+id);}
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>showPanel(button.dataset.panel)));showPanel(location.hash.slice(1));
function fillMusic(music){
  player.update(music);
  const config={url:music.url,volume:music.volume,loop:music.loop,target:music.target},signature=JSON.stringify(config);
  if(!musicDirty&&signature!==musicSignature){musicSignature=signature;$('music-url').value=music.url;$('music-volume').value=music.volume;$('volume-value').textContent=music.volume+'%';$('music-loop').checked=music.loop;$('music-target').value=music.target;}
  const active=music.status==='playing';
  $('music-title').textContent=music.title||(music.url?'Nhạc đã sẵn sàng':'Bắt đầu bằng một bài bạn thích');
  $('music-artist').textContent=music.artist||'SoundCloud · Bài hát hoặc playlist';$('music-progress').textContent=timeLabel(music.positionMs);
  const error=player.loadError||music.error;
  $('music-badge').textContent=!music.url?'CHƯA CÓ NHẠC':music.status==='error'||player.loadError?'KHÔNG TẢI ĐƯỢC NHẠC':active?'ĐANG PHÁT':music.status==='starting'?'ĐANG MỞ BÀI':music.status==='blocked'?'CHỜ CHO PHÉP ÂM THANH':music.status==='ready'?'SẴN SÀNG PHÁT':'ĐÃ TẠM DỪNG';
  $('music-link-note').textContent=music.url&&soundCloudEmbedUrl(music.url)!==music.url?'Link Related tracks: phát bài hát gốc. Muốn phát cả danh sách, dùng link playlist của người đăng.':'';
  $('music-play').disabled=!music.url;$('music-pause').disabled=!music.playing;
  $('music-prev').disabled=!music.url;$('music-next').disabled=!music.url;
  const at=music.target==='obs'?'nguồn nhạc OBS':music.ownerId===player.clientId?'trang admin này':'một trang admin khác';
  let message=error||(!music.url?'Lưu một link để sẵn sàng phát.':active?`Đang phát tại ${at}.`:music.status==='starting'?`Đang mở nhạc tại ${at}…`:music.status==='ended'?'Đã phát hết. Bấm Phát để nghe lại.':'Sẵn sàng. Bấm Phát nhạc để bắt đầu.');
  if(music.target==='obs'&&!music.receivers.obs)message='Chưa kết nối nguồn nhạc OBS. Thêm Browser Source bằng link bên dưới.';
  $('music-status').textContent=message;$('music-status').classList.toggle('error',!!error);
}
function renderRules(rules){
  const tbody=$('gift-rules');tbody.replaceChildren();
  for(const rule of rules){
    const row=document.createElement('tr');row.dataset.key=rule.key;
    const nameCell=document.createElement('td'),name=document.createElement('input'),identity=document.createElement('div'),art=document.createElement('span');identity.className='gift-identity';art.className='gift-art';name.value=rule.name;name.maxLength=48;name.dataset.field='name';name.setAttribute('aria-label','Tên quà '+rule.key);renderGiftIcon(art,{iconUrl:giftImageUrl(rule.externalId),giftName:rule.name});identity.append(art,name);nameCell.append(identity);
    const idCell=document.createElement('td'),id=document.createElement('input');id.value=rule.externalId;id.inputMode='numeric';id.maxLength=20;id.placeholder='Tùy chọn';id.dataset.field='externalId';id.setAttribute('aria-label','ID TikTok '+rule.key);idCell.append(id);
    const coinsCell=document.createElement('td'),coins=document.createElement('input');coins.type='number';coins.min='0';coins.max='1000000';coins.step='1';coins.value=rule.coins??0;coins.dataset.field='coins';coins.setAttribute('aria-label','Giá xu '+rule.key);coinsCell.append(coins);
    id.addEventListener('change',()=>{const match=catalogGift(id.value.trim());if(match){name.value=match.name;coins.value=match.coins;setDirty('gifts');}renderGiftIcon(art,{iconUrl:giftImageUrl(id.value.trim()),giftName:name.value});});
    const effectCell=document.createElement('td'),effect=document.createElement('select');effect.dataset.field='effect';effect.setAttribute('aria-label','Hiệu ứng '+rule.key);
    for(const key of Object.keys(EFFECTS)){const option=document.createElement('option');option.value=key;option.textContent=effectLabel(key);effect.append(option);}effect.value=rule.effect;
    const label=document.createElement('input');label.value=rule.label||'';label.maxLength=48;label.dataset.field='label';label.className='effect-label';label.placeholder=effectLabel(rule.effect);label.setAttribute('aria-label','Chữ hiển thị '+rule.key);label.title='Chữ hiện trên sân khấu. Để trống để dùng tên hiệu ứng.';
    const hint=document.createElement('small');hint.className='effect-label-hint';hint.textContent='Chữ hiển thị';effect.addEventListener('change',()=>label.placeholder=effectLabel(effect.value));effectCell.append(effect,hint,label);
    const enabledCell=document.createElement('td'),enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=rule.enabled;enabled.dataset.field='enabled';enabled.setAttribute('aria-label','Bật quà '+rule.key);enabledCell.append(enabled);
    const removeCell=document.createElement('td');if(!Object.hasOwn(Object.fromEntries(defaultGiftRules().map(r=>[r.key,true])),rule.key)){const remove=document.createElement('button');remove.type='button';remove.className='remove-gift';remove.textContent='×';remove.setAttribute('aria-label','Xóa quà '+rule.key);remove.addEventListener('click',()=>{row.remove();setDirty('gifts');ruleCount();});removeCell.append(remove);}
    row.append(nameCell,idCell,coinsCell,effectCell,enabledCell,removeCell);tbody.append(row);
  }
  ruleCount();
}
function ruleCount(){$('gift-rule-count').textContent=$('gift-rules').children.length+'/32 loại quà';$('add-gift').disabled=$('gift-rules').children.length>=32;}
function readRules(){return [...$('gift-rules').children].map(row=>({key:row.dataset.key,...Object.fromEntries([...row.querySelectorAll('[data-field]')].map(field=>[field.dataset.field,field.type==='checkbox'?field.checked:field.type==='number'?Number(field.value):field.value]))}));}
function restore(snapshot){
  state=snapshot;syncPreview();tiktok.update(state);demo.update(state);const real=state.roomMode==='live';$('try-gift').disabled=real;$('admin-auto').disabled=real;document.querySelectorAll('[data-populate]').forEach(b=>b.disabled=real);
  const npcCount=state.players.filter(p=>p.isNpc).length;
  $('npc-gifts').checked=state.npcGifts?.enabled??true;
  $('npc-gift-status').textContent=state.npcGifts?.enabled?`Đang bật · Đã chạy ${state.npcGifts.played||0} lượt hiệu ứng NPC${state.npcGifts.lastName?' · Gần nhất: '+state.npcGifts.lastName:''}`:'Đã tắt hiệu ứng quà NPC.';
  $('connection-status').textContent='● Đã kết nối · Trên máy này';$('admin-crowd').textContent=npcCount?`${state.players.length-npcCount} người · ${npcCount} NPC`:state.players.length+' người';$('admin-effect').textContent=state.active?`${state.active.label} · ${state.active.name}`:'Sàn nhảy đang mở';$('admin-queue').textContent=state.queue.length+' lượt chờ';$('room-gifts').textContent=(state.totalCoins||0).toLocaleString('vi-VN')+(real?' XU LIVE':' XU THỬ');
  const leaders=giftLeaders(state.players),leaderKey=JSON.stringify(leaders.map(p=>[p.id,p.name,p.coins,p.gifts]));
  if(leaderKey!==leaderSignature){leaderSignature=leaderKey;const list=$('gift-leaders');list.replaceChildren();
    if(!leaders.length){const empty=document.createElement('li');empty.className='field-hint';empty.textContent='Chưa có quà. Thử một món quà để hiện huy hiệu TOP.';list.append(empty);}
    leaders.forEach((p,i)=>{const row=document.createElement('li'),button=document.createElement('button'),rank=document.createElement('b'),name=document.createElement('span'),count=document.createElement('small');button.type='button';rank.textContent='TOP '+(i+1);name.textContent=p.name;count.textContent=p.coins.toLocaleString('vi-VN')+' xu';button.append(rank,name,count);button.addEventListener('click',()=>command({type:'select',id:p.id}));row.append(button);list.append(row);});
  }
  fillMusic(state.music);
  const signature=JSON.stringify(state.giftRules);if(signature!==giftSignature){if(!giftsDirty)renderRules(state.giftRules);giftSignature=signature;const picker=$('test-gift');picker.replaceChildren();for(const rule of state.giftRules.filter(r=>r.enabled)){const option=document.createElement('option');option.value=rule.key;option.textContent=rule.name+' · '+rule.coins.toLocaleString('vi-VN')+' xu → '+(rule.label||effectLabel(rule.effect));picker.append(option);}}
  const people=JSON.stringify(state.players.map(p=>[p.id,p.name]));if(people!==playerSignature){playerSignature=people;$('admin-player').replaceChildren();for(const p of state.players){const option=document.createElement('option');option.value=p.id;option.textContent=p.name+(p.isNpc?' (NPC)':'');$('admin-player').append(option);}}$('admin-player').value=state.selectedId;
  document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===state.cameraMode)));document.querySelectorAll('[data-theme]').forEach(b=>{b.classList.toggle('active',b.dataset.theme===state.theme);b.setAttribute('aria-pressed',String(b.dataset.theme===state.theme));});$('admin-auto').checked=state.autoDemo;
}
const demo=setupDemoAdmin({post});
const tiktok=setupTikTokAdmin({post,feedback,showPanel,readRules,renderRules,setDirty,isGiftsDirty:()=>giftsDirty});
const stream=new EventSource('/api/stream?'+new URLSearchParams({clientId:player.clientId,role:'admin'}));stream.onmessage=event=>restore(JSON.parse(event.data));stream.onerror=()=>{$('connection-status').textContent='● Đang kết nối lại…';};
$('music-form').addEventListener('input',()=>setDirty('music'));
$('music-volume').addEventListener('input',()=>{$('volume-value').textContent=$('music-volume').value+'%';});
async function saveMusic(){const result=await post('/api/admin/music',{url:$('music-url').value,volume:Number($('music-volume').value),loop:$('music-loop').checked,target:$('music-target').value});setDirty('music',false);musicSignature='';fillMusic(result.music);feedback('Đã lưu nhạc và nơi phát trên máy.');}
$('music-form').addEventListener('submit',async event=>{event.preventDefault();try{await saveMusic();}catch(error){feedback(error.message,true);}});
for(const action of ['play','pause','next','prev'])$('music-'+action).addEventListener('click',async()=>{try{if(action==='play'&&musicDirty)await saveMusic();await player.transport(action);}catch(error){feedback(error.message,true);}});
$('gift-rules').addEventListener('input',()=>setDirty('gifts'));$('gift-rules').addEventListener('change',()=>setDirty('gifts'));
$('add-gift').addEventListener('click',()=>{const rules=readRules();if(rules.length>=32)return;rules.push({key:'gift_'+crypto.randomUUID().slice(0,8),name:'Quà mới',coins:0,externalId:'',effect:'jump',enabled:true});renderRules(rules);setDirty('gifts');});
const catalogue=$('gift-catalog-options');
for(const gift of GIFT_CATALOG){const option=document.createElement('option');option.value=gift.id;option.label=gift.name+' · '+gift.coins.toLocaleString('vi-VN')+' xu';catalogue.append(option);}
$('gift-catalog-summary').textContent=GIFT_CATALOG.length+' quà · đối chiếu ngày '+GIFT_CATALOG_INFO.checkedAt.split('-').reverse().join('/');
$('gift-catalog-source').href=GIFT_CATALOG_INFO.source;
$('add-catalog-gift').addEventListener('click',()=>{
  const query=$('gift-catalog-search').value.trim(),match=catalogGift(query)||GIFT_CATALOG.find(g=>g.name.toLocaleLowerCase()===query.toLocaleLowerCase());
  if(!match){feedback('Chọn một quà trong gợi ý, hoặc nhập đúng tên / ID trong danh mục.',true);return;}
  const rules=readRules(),existing=rules.find(r=>r.externalId===match.id);
  if(!existing){if(rules.length>=32){feedback('Đã đủ 32 loại quà. Xóa một dòng không dùng trước.',true);return;}rules.push({key:'tiktok_'+match.id,name:match.name,externalId:match.id,coins:match.coins,effect:'camera',enabled:true});renderRules(rules);setDirty('gifts');}
  const row=[...$('gift-rules').children].find(r=>r.dataset.key===(existing?.key||'tiktok_'+match.id));row?.scrollIntoView({block:'center',behavior:'smooth'});row?.querySelector('select')?.focus();
  feedback(existing?'Quà này đã có trong bảng. Bạn có thể đổi hiệu ứng tại dòng vừa chọn.':'Đã điền đúng ID, tên và giá xu. Chọn hiệu ứng rồi bấm Lưu bảng quà.');
});
$('save-gifts').addEventListener('click',async()=>{try{const result=await post('/api/admin/gifts',readRules());setDirty('gifts',false);giftSignature='';restore({...state,giftRules:result.giftRules});feedback('Đã lưu bảng quà. Quà mới nhận sẽ dùng hiệu ứng đã chọn.');}catch(error){feedback(error.message,true);}});
$('default-gifts').addEventListener('click',()=>{renderRules(defaultGiftRules());setDirty('gifts');feedback('Đã nạp bảng mặc định vào bản sửa. Bấm Lưu bảng quà để áp dụng.');});
async function command(data){try{await post('/api/command',data);}catch(error){feedback(error.message,true);}}
$('try-gift').addEventListener('click',()=>{if(giftsDirty){feedback('Lưu bảng quà trước khi thử để dùng đúng hiệu ứng mới.',true);return;}if($('test-gift').value)command({type:'gift',gift:$('test-gift').value,count:1});});
$('admin-player').addEventListener('change',event=>command({type:'select',id:event.target.value}));
document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>command({type:'camera',mode:button.dataset.camera})));
document.querySelectorAll('[data-theme]').forEach(button=>button.addEventListener('click',()=>command({type:'theme',theme:button.dataset.theme})));
document.querySelectorAll('[data-populate]').forEach(button=>button.addEventListener('click',()=>command({type:'populate',count:Number(button.dataset.populate)})));
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>command({type:button.dataset.command})));
$('admin-auto').addEventListener('change',event=>command({type:'auto',enabled:event.target.checked}));
$('npc-gifts').addEventListener('change',async event=>{const input=event.target;input.disabled=true;try{await post('/api/admin/npcs',{enabled:input.checked});feedback(input.checked?'Đã bật NPC tự tặng quà. Tương tác thật được ưu tiên.':'Đã tắt hiệu ứng quà NPC.');}catch(error){input.checked=state?.npcGifts?.enabled??true;feedback(error.message,true);}finally{input.disabled=false;}});
$('music-obs-url').textContent=location.origin+'/music.html';$('copy-music-url').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+'/music.html');feedback('Đã sao chép link nguồn nhạc OBS.');}catch{feedback('Sao chép địa chỉ hiển thị bên cạnh nút này.',true);}});
