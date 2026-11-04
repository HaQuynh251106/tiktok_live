import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const MAX_STICKER_BYTES=8*1024*1024;
export function stickerType(data){
  if(data.subarray(0,6).toString()==='GIF89a'||data.subarray(0,6).toString()==='GIF87a')return {type:'image/gif',extension:'gif'};
  if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {type:'image/png',extension:'png'};
  if(data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP')return {type:'image/webp',extension:'webp'};
  return null;
}
export function createStickerStore(root){
  const directory=path.join(root,'assets','custom'),manifest=path.join(directory,'catalog.json');
  let catalog=[],queue=Promise.resolve();
  return {
    get catalog(){return catalog;},
    async load(){
      try{const saved=JSON.parse(await fs.readFile(manifest,'utf8'));catalog=saved.filter(s=>/^custom_[a-z0-9-]+$/.test(s.id)&&/^custom\/[a-z0-9-]+\.(gif|webp|png)$/.test(s.file)&&['image/gif','image/webp','image/png'].includes(s.type)).slice(0,16);}catch(error){if(error.code!=='ENOENT')throw error;}
      return catalog;
    },
    add(data,name){
      const work=queue.then(async()=>{
        const kind=stickerType(data);
        if(!kind)throw Error('Chỉ nhận tệp GIF, WebP hoặc PNG thực sự.');
        if(data.length>MAX_STICKER_BYTES)throw Error('Sticker tối đa 8 MB.');
        if(catalog.length>=16)throw Error('Bộ sticker riêng tối đa 16 tệp.');
        const id=randomUUID(),filename=`${id}.${kind.extension}`;
        const item={id:`custom_${id}`,name:String(name||'Sticker riêng').replace(/[\u0000-\u001f]/g,'').trim().slice(0,24)||'Sticker riêng',type:kind.type,file:`custom/${filename}`};
        await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,filename),data);
        catalog.push(item);await fs.writeFile(manifest,JSON.stringify(catalog,null,2));return item;
      });
      queue=work.catch(()=>{});return work;
    }
  };
}
