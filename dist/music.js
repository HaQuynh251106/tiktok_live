import {SoundCloudPlayer,timeLabel} from './soundcloud-player.mjs';
const $=id=>document.getElementById(id),player=new SoundCloudPlayer($('audio-player'),message=>$('audio-status').textContent=message);
const stream=new EventSource('/api/stream?'+new URLSearchParams({clientId:player.clientId,role:'obs'}));
stream.onmessage=event=>{const {music}=JSON.parse(event.data);player.update(music);$('audio-title').textContent=music.title||'Nguồn nhạc OBS';$('audio-progress').textContent=timeLabel(music.positionMs);$('audio-status').textContent=music.error||(music.target!=='obs'?'Âm thanh đang được giao cho trang admin.':player.isOwner&&music.status==='playing'?'Đang phát nhạc tại nguồn OBS này.':music.receivers.obs>1&&!player.isOwner?'Chỉ một nguồn OBS phát nhạc. Nguồn này đang im lặng.':'Đã kết nối. Điều khiển phát/dừng từ trang admin.');$('audio-play').disabled=!music.url||music.target!=='obs';};
stream.onerror=()=>$('audio-status').textContent='Đang kết nối lại với Neon Room…';
$('audio-play').addEventListener('click',async()=>{try{await player.transport('play');}catch(error){$('audio-status').textContent=error.message;}});
