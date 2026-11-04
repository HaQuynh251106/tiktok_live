export const CAST=[
  {id:'mushroom',name:'Nấm Lém',row:0},
  {id:'panda',name:'Gấu Quậy',row:1},
  {id:'pink',name:'Nấm Hồng',row:2},
  {id:'cat',name:'Mèo Ngầu',row:3}
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
  loadSheet('./assets/meme-crew.png',4,4,CAST.map(c=>c.id),[0,338,644,959,1254]),
  loadSheet('./assets/monkey-king.png',4,1,['wukong'])
]);
export function drawSticker(ctx,skin,phase,options={}){
  const key=frames.has(skin)?skin:skin==='chick'?'pink':skin==='frog'?'cat':'panda';
  const sprites=frames.get(key);if(!sprites)return false;
  const sequence=[0,1,2,0,3,2,1,2];
  const frame=options.jump?1:sequence[((Math.floor(phase)%sequence.length)+sequence.length)%sequence.length];
  const p=sprites[frame],size=options.height||225,scale=size/p.height;
  ctx.drawImage(p.image,p.x,p.y,p.w,p.h,-p.w*scale/2,-p.h*scale,p.w*scale,p.h*scale);
  return true;
}
