import * as THREE from './vendor/three.module.js';

export function createStageDisplay(scene){
  const group=new THREE.Group(),plane=new THREE.PlaneGeometry(1,1),cube=new THREE.BoxGeometry(1,1,1),materials=[],maps=[];
  scene.add(group);
  function panel(x,y,z,width,height,canvas){
    const frameMaterial=new THREE.MeshStandardMaterial({color:0x302743,metalness:.65,roughness:.3}),frame=new THREE.Mesh(cube,frameMaterial);materials.push(frameMaterial);frame.position.set(x,y,z-.3);frame.scale.set(width+.8,height+.8,.5);group.add(frame);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.minFilter=THREE.LinearFilter;maps.push(map);
    const material=new THREE.MeshBasicMaterial({map,toneMapped:false}),screen=new THREE.Mesh(plane,material);materials.push(material);screen.position.set(x,y,z);screen.scale.set(width,height,1);group.add(screen);return map;
  }
  const main=document.createElement('canvas'),board=document.createElement('canvas');main.width=1440;main.height=480;board.width=720;board.height=864;
  const mainMap=panel(0,6.5,-57.3,36,12,main),boardMap=panel(-25,6.5,-56.5,10,12,board);
  function background(canvas){
    const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,fill=g.createLinearGradient(0,0,w,h);fill.addColorStop(0,'#121e36');fill.addColorStop(.5,'#090d1b');fill.addColorStop(1,'#2b123d');g.fillStyle=fill;g.fillRect(0,0,w,h);
    g.strokeStyle='#90eaff16';g.lineWidth=2;for(let x=0;x<w;x+=60){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<h;y+=60){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
    g.strokeStyle='#b59aff';g.lineWidth=5;g.strokeRect(14,14,w-28,h-28);g.textBaseline='middle';return g;
  }
  function fit(g,text,x,y,width){g.fillText(text,x,y,width);}
  function avatar(g,p,x,y,r,color){g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();g.fillStyle='#171220';g.textAlign='center';g.font=`800 ${r}px sans-serif`;g.fillText(p.name.charAt(0).toLocaleUpperCase(),x,y+2);}
  let signature='';
  function update(leaders){
    const key=JSON.stringify(leaders.slice(0,5).map(p=>[p.id,p.name,p.coins]));if(key===signature)return;signature=key;
    let g=background(main);g.textAlign='center';g.fillStyle='#ffe49a';g.font='700 38px sans-serif';g.fillText('CHÀO MỪNG ĐẾN VỚI',720,52);g.fillStyle='#f6f1ff';g.font='900 104px sans-serif';g.fillText('NEON ROOM',720,150);
    g.strokeStyle='#bd87ff';g.lineWidth=4;g.beginPath();g.moveTo(140,225);g.lineTo(1300,225);g.stroke();g.fillStyle='#9feeff';g.font='600 30px sans-serif';g.fillText('SÂN KHẤU CỦA NHỮNG NGÔI SAO',720,272);
    leaders.slice(0,3).forEach((p,i)=>{const x=140+i*435;avatar(g,p,x,355,34,['#ffdf8d','#b4e7ff','#ffc19f'][i]);g.textAlign='left';g.fillStyle='#ffe6a5';g.font='800 24px sans-serif';g.fillText('TOP '+(i+1),x+52,324);g.fillStyle='#ffffff';g.font='700 29px sans-serif';fit(g,p.name,x+52,361,290);g.fillStyle='#c4b7dc';g.font='500 23px sans-serif';g.fillText(p.coins.toLocaleString('vi-VN')+' XU',x+52,397);});
    g.textAlign='center';g.fillStyle='#ba9bdf';g.font='500 25px sans-serif';g.fillText(leaders.length?'TẶNG QUÀ • LÊN TOP • TỎA SÁNG':'CHỜ NGƯỜI TẶNG QUÀ ĐẦU TIÊN',720,450);mainMap.needsUpdate=true;
    g=background(board);g.textAlign='center';g.fillStyle='#ffe29a';g.font='900 62px sans-serif';g.fillText('TOP TẶNG QUÀ',360,94);g.fillStyle='#b7a5d1';g.font='500 26px sans-serif';g.fillText('TRONG PHÒNG NÀY · THEO TỔNG XU',360,153);
    for(let i=0;i<5;i++){
      const y=236+i*124,p=leaders[i],color=['#ffdf8d','#b4e7ff','#ffc19f','#ceacff','#ceacff'][i];g.fillStyle='#ffffff08';g.beginPath();g.roundRect(40,y-53,640,111,18);g.fill();g.fillStyle=color;g.font='900 40px sans-serif';g.textAlign='left';g.fillText(String(i+1).padStart(2,'0'),62,y);
      if(p){avatar(g,p,170,y,39,color);g.textAlign='left';g.fillStyle='#f6f1ff';g.font='700 34px sans-serif';fit(g,p.name,233,y-19,410);g.fillStyle=color;g.font='600 27px sans-serif';g.fillText(p.coins.toLocaleString('vi-VN')+' XU',233,y+29);}else{g.fillStyle='#665978';g.font='500 28px sans-serif';g.fillText('VỊ TRÍ ĐANG CHỜ',146,y);}
    }g.textAlign='center';g.fillStyle='#b59ccf';g.font='500 24px sans-serif';g.fillText('MỖI MÓN QUÀ, MỘT ĐIỆU NHẢY',360,829);boardMap.needsUpdate=true;
  }
  function dispose(){group.removeFromParent();plane.dispose();cube.dispose();materials.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());}
  update([]);return {update,dispose};
}
