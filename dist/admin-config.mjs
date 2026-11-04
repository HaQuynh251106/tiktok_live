import {defaultGiftRules,validateGiftRules} from './room-core.mjs';

export function soundCloudUrl(value){
  if(typeof value!=='string'||value.length>2048)throw Error('Link SoundCloud không hợp lệ.');
  if(!value.trim())return '';
  let url;try{url=new URL(value.trim());}catch{throw Error('Dán link đầy đủ https://soundcloud.com/tên-người-đăng/tên-bài.');}
  if(url.protocol!=='https:'||!['soundcloud.com','www.soundcloud.com','m.soundcloud.com'].includes(url.hostname)||url.port||url.username||url.password||url.pathname.split('/').filter(Boolean).length<2)throw Error('Dùng link bài hát hoặc playlist đầy đủ trên https://soundcloud.com. Nếu là link rút gọn, mở link rồi sao chép địa chỉ đầy đủ.');
  url.hostname='soundcloud.com';url.hash='';
  for(const key of [...url.searchParams.keys()])if(!['secret_token'].includes(key))url.searchParams.delete(key);
  return url.href;
}
export function defaultConfig(){return {music:{url:'',volume:60,loop:false,target:'admin'},gifts:defaultGiftRules()};}
export function validateMusic(input){
  if(!input||!Number.isInteger(input.volume)||input.volume<0||input.volume>100||typeof input.loop!=='boolean'||!['admin','obs'].includes(input.target))throw Error('Cấu hình âm lượng hoặc nơi phát không hợp lệ.');
  return {url:soundCloudUrl(input.url),volume:input.volume,loop:input.loop,target:input.target};
}
export function validateConfig(input){return {music:validateMusic(input.music),gifts:validateGiftRules(input.gifts)};}
