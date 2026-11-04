import {registerSkin} from './room-core.mjs';
export const CAST=[
  {id:'mushroom',name:'Nấm Lém',row:0},
  {id:'panda',name:'Gấu Quậy',row:1},
  {id:'pink',name:'Nấm Hồng',row:2},
  {id:'cat',name:'Mèo Ngầu',row:3},
  {id:'rabbit',name:'Thỏ Tăng Động',row:0},
  {id:'shiba',name:'Shiba Chảnh',row:1},
  {id:'duck',name:'Vịt Quậy',row:2},
  {id:'capybara',name:'Capy Thảnh Thơi',row:3}
];
const frames=new Map();
export const planeImage=new Image();
planeImage.src=new URL('./assets/pink-plane.png',import.meta.url).href;
function loadSheet(url,columns,rows,keys,rowCuts){
  return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>{
    const sheet=document.createElement('canvas');sheet.width=image.width;sheet.height=image.height;
    const ctx=sheet.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,image.width,image.height).data;
    for(let row=0;row<rows;row++){
      const parts=[];
      for(let col=0;col<columns;col++){
        const x0=Math.round(col*image.width/columns),x1=Math.round((col+1)*image.width/columns);
        const y0=rowCuts?rowCuts[row]:Math.round(row*image.height/rows),y1=rowCuts?rowCuts[row+1]:Math.round((row+1)*image.height/rows);
        let left=x1,right=x0,top=y1,bottom=y0;
        for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*image.width+x)*4+3]>70){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
        parts.push({x:left,y:top,w:right-left+1,h:bottom-top+1});
      }
      const height=Math.max(...parts.map(p=>p.h)),width=Math.max(...parts.map(p=>p.w));
      frames.set(keys[row],parts.map(part=>({image,...part,height,width})));
    }
    resolve();
  };
  image.onerror=()=>{console.error('Không tải được bộ sticker:',url);resolve();};
  image.src=new URL(url,import.meta.url).href;
  });
}
export const stickerReady=Promise.all([
  loadSheet('./assets/meme-crew.png',4,4,CAST.slice(0,4).map(c=>c.id),[0,338,644,959,1254]),
  loadSheet('./assets/animal-crew.png',4,4,CAST.slice(4).map(c=>c.id)),
  loadSheet('./assets/monkey-king.png',4,1,['wukong'])
]);
// WebGL shares one texture per decoded pose across every viewer using that pose.
export function getStickerFrame(skin,phase,options={}){
  const key=frames.has(skin)?skin:skin==='chick'?'pink':skin==='frog'?'cat':'panda';
  const sprites=frames.get(key);if(!sprites)return null;
  if(sprites.animated){
    const clock=(((options.time??phase/8)*1000)%sprites.duration+sprites.duration)%sprites.duration;
    let index=sprites.frames.findIndex(f=>clock<f.until);if(index<0)index=sprites.frames.length-1;
    const frame=sprites.frames[index];
    return {key:key+':'+index,image:frame.canvas,x:0,y:0,w:sprites.width,h:sprites.height};
  }
  const sequence=[0,1,2,0,3,2,1,2];
  const index=options.jump?1:sequence[((Math.floor(phase)%sequence.length)+sequence.length)%sequence.length];
  return {key:key+':'+index,...sprites[index]};
}
export function drawSticker(ctx,skin,phase,options={}){
  const key=frames.has(skin)?skin:skin==='chick'?'pink':skin==='frog'?'cat':'panda';
  const sprites=frames.get(key);if(!sprites)return false;
  if(sprites.animated){
    const clock=(((options.time??phase/8)*1000)%sprites.duration+sprites.duration)%sprites.duration;
    const frame=sprites.frames.find(f=>clock<f.until)||sprites.frames.at(-1),size=options.height||225,scale=size/sprites.height;
    ctx.drawImage(frame.canvas,-sprites.width*scale/2,-sprites.height*scale,sprites.width*scale,sprites.height*scale);return true;
  }
  const sequence=[0,1,2,0,3,2,1,2];
  const frame=options.jump?1:sequence[((Math.floor(phase)%sequence.length)+sequence.length)%sequence.length];
  const p=sprites[frame],size=options.height||225,scale=size/p.height;
  ctx.drawImage(p.image,p.x,p.y,p.w,p.h,-p.w*scale/2,-p.h*scale,p.w*scale,p.h*scale);
  return true;
}

const customLoads=new Map();
export const stickerInfo=id=>{const entry=frames.get(id);return entry?.animated?`${entry.frames.length} khung · ${entry.frames.length>1?'Động':'Tĩnh'}`:'4 tư thế';};
export async function decodeStickerFile(file){
  const data=await file.arrayBuffer(),type=file.type;
  if(typeof ImageDecoder==='undefined'||!await ImageDecoder.isTypeSupported(type)){
    if(type!=='image/png')throw Error('Sticker động cần Chrome, Edge hoặc OBS hỗ trợ ImageDecoder.');
    const image=new Image(),url=URL.createObjectURL(new Blob([data],{type}));
    try{
      image.src=url;await image.decode();
      const ratio=Math.min(1,256/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      return {animated:true,width:canvas.width,height:canvas.height,duration:1000,frames:[{canvas,until:1000}]};
    }finally{URL.revokeObjectURL(url);}
  }
  const decoder=new ImageDecoder({data,type});
  try{
    await decoder.tracks.ready;
    const count=decoder.tracks.selectedTrack?.frameCount;
    if(!count||count>60)throw Error('Chọn sticker có từ 1 đến 60 khung hình.');
    const decoded=[];let duration=0,width=0,height=0;
    for(let i=0;i<count;i++){
      const {image}=await decoder.decode({frameIndex:i,completeFramesOnly:true});
      try{
        const ratio=Math.min(1,256/Math.max(image.displayWidth,image.displayHeight)),canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.displayWidth*ratio));canvas.height=Math.max(1,Math.round(image.displayHeight*ratio));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        duration+=Math.max(20,(image.duration||100000)/1000);width=canvas.width;height=canvas.height;decoded.push({canvas,until:duration});
      }finally{image.close();}
    }
    return {animated:true,width,height,duration,frames:decoded};
  }finally{decoder.close();}
}
export async function loadCustomStickers(catalog=[],prepared=new Map()){
  const results=await Promise.allSettled(catalog.map(entry=>{
    if(customLoads.has(entry.id))return customLoads.get(entry.id);
    registerSkin(entry.id);
    const task=(async()=>{
      let decoded=prepared.get(entry.id);
      if(!decoded){
        const response=await fetch(new URL(`./assets/${entry.file}`,import.meta.url));
        if(!response.ok)throw Error('Không đọc được tệp sticker.');
        decoded=await decodeStickerFile(new Blob([await response.arrayBuffer()],{type:entry.type}));
      }
      frames.set(entry.id,decoded);
      if(!CAST.some(c=>c.id===entry.id))CAST.push({id:entry.id,name:entry.name,custom:true});
    })();
    customLoads.set(entry.id,task);return task;
  }));
  const failed=results.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
}
