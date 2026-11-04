import {defaultGiftRules,validateGiftRules} from './room-core.mjs';

const relatedTrack=/^\/discover\/sets\/personalized-tracks::[^/:]+:([1-9]\d*)\/?$/;
export function soundCloudUrl(value){
  if(typeof value!=='string'||value.length>2048)throw Error('Link SoundCloud không hợp lệ.');
  if(!value.trim())return '';
  let url;try{url=new URL(value.trim());}catch{throw Error('Dán link đầy đủ https://soundcloud.com/tên-người-đăng/tên-bài.');}
  const allowed=url=>url.protocol==='https:'&&!url.port&&!url.username&&!url.password;
  if(allowed(url)&&url.hostname==='w.soundcloud.com'&&url.pathname==='/player/'){
    try{url=new URL(url.searchParams.get('url'));}catch{throw Error('Link trình phát SoundCloud thiếu địa chỉ bài hát hoặc playlist.');}
  }
  if(!allowed(url)||!['soundcloud.com','www.soundcloud.com','m.soundcloud.com','api.soundcloud.com'].includes(url.hostname))throw Error('Dùng link bài hát hoặc playlist đầy đủ trên https://soundcloud.com. Nếu là link rút gọn, mở link rồi sao chép địa chỉ đầy đủ.');
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{throw Error('Link SoundCloud không hợp lệ.');}
  const parts=pathname.split('/').filter(Boolean),api=url.hostname==='api.soundcloud.com';
  if(api){if(!/^\/(tracks|playlists)\/(?:[1-9]\d*|soundcloud:\1:[1-9]\d*)\/?$/.test(pathname))throw Error('Link SoundCloud API phải trỏ tới một bài hát hoặc playlist.');}
  else if(!relatedTrack.test(pathname)){
    const reserved=['discover','you','stream','charts','search','stations','tags','upload','pages','settings','notifications','messages'];
    const collection=['sets','likes','reposts','tracks','albums','popular-tracks'];
    const track=parts.length===2&&!collection.includes(parts[1]);
    const playlist=parts.length===3&&parts[1]==='sets';
    const privateTrack=parts.length===3&&/^s-[\w-]+$/.test(parts[2]);
    const privatePlaylist=parts.length===4&&parts[1]==='sets'&&/^s-[\w-]+$/.test(parts[3]);
    if(reserved.includes(parts[0])||!(track||playlist||privateTrack||privatePlaylist))throw Error('Trang SoundCloud này không nhúng được. Dùng link bài hát hoặc playlist từ nút Chia sẻ; link Related tracks sẽ phát bài gốc.');
  }
  if(!api)url.hostname='soundcloud.com';url.hash='';
  for(const key of [...url.searchParams.keys()])if(!['secret_token'].includes(key))url.searchParams.delete(key);
  return url.href;
}
export function soundCloudEmbedUrl(value){
  const source=soundCloudUrl(value);if(!source)return '';
  const match=decodeURIComponent(new URL(source).pathname).match(relatedTrack);
  return match?`https://api.soundcloud.com/tracks/${match[1]}`:source;
}
export function defaultConfig(){return {schemaVersion:2,music:{url:'',volume:60,loop:false,target:'admin'},gifts:defaultGiftRules()};}
export function validateMusic(input){
  if(!input||!Number.isInteger(input.volume)||input.volume<0||input.volume>100||typeof input.loop!=='boolean'||!['admin','obs'].includes(input.target))throw Error('Cấu hình âm lượng hoặc nơi phát không hợp lệ.');
  return {url:soundCloudUrl(input.url),volume:input.volume,loop:input.loop,target:input.target};
}
export function validateConfig(input){return {schemaVersion:2,music:validateMusic(input.music),gifts:validateGiftRules(input.gifts)};}
export function migrateConfig(input){
  const config=validateConfig(input);
  if(input.schemaVersion!==2){const keys=new Set(config.gifts.map(rule=>rule.key));for(const rule of defaultGiftRules().filter(rule=>!keys.has(rule.key)))if(config.gifts.length<32)config.gifts.push(rule);}
  return config;
}
