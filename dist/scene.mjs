import * as THREE from './vendor/three.module.js';
import {getStickerFrame} from './stickers.mjs';
import {WING_STYLES,WING_ACTIONS,FLIGHT_ACTIONS,wingStyle,flightPose} from './effect-math.mjs';
import {createWingLibrary} from './wing-rig.mjs';
import {createFlightRig} from './flight-rig.mjs';
import {createStageDisplay} from './stage-display.mjs';
import {VIP_PODIUMS,VIP_HEIGHT,W,H,clamp,lerp,floorSlot,characterScale,effectEnvelope,overviewCamera,closeCamera,blendCamera,dampCamera,tourFocus,cinematicCamera} from './scene-math.mjs';

const UP=new THREE.Vector3(0,1,0);
const PLAYER_HEIGHT=3.65;
const PODIUMS=VIP_PODIUMS;
const unitPlane=new THREE.PlaneGeometry(1,1);
const boxGeometry=new THREE.BoxGeometry(1,1,1);
const circleGeometry=new THREE.CircleGeometry(1,40);
const ringGeometry=new THREE.TorusGeometry(1,.025,6,72);
const crownTipGeometry=new THREE.ConeGeometry(.17,.65,5);
const goldBase=new THREE.MeshStandardMaterial({color:0xffc54f,metalness:.78,roughness:.27,emissive:0x7b4105,emissiveIntensity:.28});
const dummy=new THREE.Object3D();

function canvasTexture(canvas){
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.minFilter=THREE.LinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=false;
  return map;
}
function radialTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;
  const g=c.getContext('2d'),gradient=g.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'#ffffffff');gradient.addColorStop(.18,'#ffffffa0');gradient.addColorStop(.55,'#ffffff25');gradient.addColorStop(1,'#ffffff00');
  g.fillStyle=gradient;g.fillRect(0,0,128,128);return canvasTexture(c);
}
function labelTexture(value,color='#ffffff',background=true){
  const c=document.createElement('canvas');let g=c.getContext('2d');
  const text=value.length>20?value.slice(0,19)+'…':value;
  g.font='600 48px "Be Vietnam Pro",sans-serif';c.width=Math.ceil(clamp(g.measureText(text).width+48,130,700));c.height=80;g=c.getContext('2d');
  if(background){g.fillStyle='#100d1ce8';g.beginPath();g.roundRect(3,6,c.width-6,66,18);g.fill();g.strokeStyle=color;g.lineWidth=2;g.stroke();}
  g.font='600 48px "Be Vietnam Pro",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;
  g.fillText(text,c.width/2,40,c.width-42);
  return canvasTexture(c);
}
function rankTexture(rank,player){
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=90;const g=canvas.getContext('2d');
  const colors=rank===1?['#5b2e0d','#ffe6a1','#fff3cc']:rank===2?['#264259','#c5edff','#f0fbff']:rank===3?['#6b3729','#ffc49c','#ffe7c7']:['#35204f','#c99dff','#efe0ff'];
  const fill=g.createLinearGradient(0,0,360,85);fill.addColorStop(0,colors[0]);fill.addColorStop(.48,colors[1]);fill.addColorStop(1,colors[0]);g.fillStyle=fill;g.beginPath();g.roundRect(3,8,354,74,36);g.fill();g.strokeStyle=colors[2];g.lineWidth=3;g.stroke();
  g.fillStyle=colors[2];g.beginPath();g.arc(44,45,27,0,Math.PI*2);g.fill();g.fillStyle=colors[0];g.font='800 29px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(player.name.charAt(0).toLocaleUpperCase(),44,46);
  g.textAlign='left';g.font='800 33px "Be Vietnam Pro",sans-serif';g.fillStyle='#25122d';g.fillText('TOP '+rank,84,46);
  const count=player.gifts>=1000?(Math.floor(player.gifts/100)/10)+'k':String(player.gifts);g.textAlign='right';g.font='700 20px "Be Vietnam Pro",sans-serif';g.fillStyle=colors[2];g.fillText(count+' QUÀ',334,46,115);
  return canvasTexture(canvas);
}

export function createStage(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(W,H,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x100a1c);scene.fog=new THREE.FogExp2(0x160c23,.006);
  const camera=new THREE.PerspectiveCamera(70,W/H,.15,230);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const actors=new Map(),poseTextures=new Map(),themeObjects=[],lights=[],beams=[],ledColors=[];
  const glowMap=radialTexture();
  const wingLibrary=createWingLibrary(glowMap);
  const badgeTime={value:0};
  const gold=goldBase.clone();
  const silver=new THREE.MeshStandardMaterial({color:0xe0ebff,metalness:.82,roughness:.23,emissive:0x364c71,emissiveIntensity:.2});
  let cameraState=overviewCamera(0,true),velocity={},lastNow=0,lastTheme='',lastLed=-1,contextLost=false;
  let fpsStart=0,fpsFrames=0,fps=30;

  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;});
  canvas.dataset.renderer='webgl2';
  scene.add(new THREE.HemisphereLight(0xe7ddff,0x282232,2.4));
  const fill=new THREE.DirectionalLight(0xfaf2ff,2.7);fill.position.set(0,25,18);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xab83ff,2);rim.position.set(-15,20,-45);scene.add(rim);

  // A local radiance environment gives metal, glass and the floor real reflections.
  // It is generated once; no network textures or live reflection render pass.
  const environment=new THREE.Scene();
  const envRoom=new THREE.Mesh(new THREE.BoxGeometry(40,30,40),new THREE.MeshBasicMaterial({color:0x45404e,side:THREE.BackSide}));environment.add(envRoom);
  for(const [x,y,z,color] of [[-12,8,0,0xb48bff],[12,8,0,0xffb7e5],[0,13,-10,0xffffff],[0,5,14,0xffffff]]){
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(12,10),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    panel.position.set(x,y,z);panel.lookAt(0,0,0);environment.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer),environmentMap=pmrem.fromScene(environment,.04);
  scene.environment=environmentMap.texture;pmrem.dispose();
  environment.traverse(object=>{if(object.isMesh){object.geometry.dispose();object.material.dispose();}});

  const dark=new THREE.MeshStandardMaterial({color:0x191320,roughness:.48,metalness:.3});
  const chrome=new THREE.MeshStandardMaterial({color:0xc4c4d6,metalness:.95,roughness:.16});
  const neonA=new THREE.MeshBasicMaterial({color:0xae79ff}),neonB=new THREE.MeshBasicMaterial({color:0xf47dd2});
  themeObjects.push(neonA,neonB);
  function box(parent,x,y,z,sx,sy,sz,material=dark){
    const m=new THREE.Mesh(boxGeometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function rod(parent,a,b,radius,material){
    const delta=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),8),material);
    m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(UP,delta.normalize());parent.add(m);return m;
  }
  function glow(parent,position,color,size,opacity=.65){
    const m=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));
    m.position.copy(position);m.scale.set(size,size,1);parent.add(m);return m;
  }
  function floorRing(parent,radius,material){
    const mesh=new THREE.Mesh(ringGeometry,material);mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(radius);parent.add(mesh);return mesh;
  }

  // Real instanced tile meshes, shared geometry and two PBR materials.
  box(scene,0,-.42,-27,100,.5,126,dark);
  const tileGeometry=new THREE.BoxGeometry(3.94,.12,3.94);
  const tileMaterials=[new THREE.MeshStandardMaterial({color:0x625869,metalness:.32,roughness:.27}),new THREE.MeshStandardMaterial({color:0x30273c,metalness:.4,roughness:.31})];
  const tiles=[[],[]];
  for(let z=-84;z<=28;z+=4)for(let x=-46;x<=46;x+=4)tiles[((x+46)/4+(z+84)/4)%2].push([x,z]);
  tiles.forEach((positions,index)=>{
    const mesh=new THREE.InstancedMesh(tileGeometry,tileMaterials[index],positions.length);
    positions.forEach(([x,z],i)=>{dummy.position.set(x,-.1,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.receiveShadow=true;scene.add(mesh);
  });
  for(const x of [-32,-24,24,32])box(scene,x,.015,-26,.055,.035,102,x<0?neonA:neonB);
  for(const z of [-66,-42,-18,6,24])box(scene,0,.02,z,88,.025,.035,neonA);

  // Architecture: raised side balconies, front DJ booth, trusses and LED wall.
  for(const x of [-37,37]){
    box(scene,x,4.2,-28,7,1.2,105);
    box(scene,x,8.3,-28,.12,.12,106,chrome);
    for(let z=-70;z<26;z+=8){
      box(scene,x,6.3,z,.1,4,.1,chrome);
      box(scene,x<0?-40:40,15,z,1.2,30,1.2);
      box(scene,x<0?-39.3:39.3,15,z,.09,29,.09,x<0?neonA:neonB);
    }
  }
  box(scene,0,13,-73,82,28,1.1);
  box(scene,0,2.2,-61,24,4.4,7);
  box(scene,0,4.6,-62,16,.3,4,chrome);
  box(scene,0,2.4,-57.44,22,3.2,.08,neonA);
  for(const x of [-22,22]){
    box(scene,x,4,-60,4,8,4);
    for(const y of [2.5,5.8]){
      const cone=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.05,.15,24),new THREE.MeshStandardMaterial({color:0x16121d,metalness:.65,roughness:.45}));
      cone.rotation.x=Math.PI/2;cone.position.set(x,y,-57.9);scene.add(cone);
      const surround=new THREE.Mesh(new THREE.TorusGeometry(1.2,.07,6,32),chrome);surround.position.copy(cone.position);scene.add(surround);
    }
  }
  for(const z of [-62,-30,8]){
    rod(scene,new THREE.Vector3(-39,31,z),new THREE.Vector3(39,31,z),.14,chrome);
    rod(scene,new THREE.Vector3(-39,33,z),new THREE.Vector3(39,33,z),.14,chrome);
    for(let x=-38;x<38;x+=5)rod(scene,new THREE.Vector3(x,31,z),new THREE.Vector3(x+5,33,z),.06,chrome);
  }
  const ledGeometry=new THREE.BoxGeometry(2.75,2.05,.15),ledMaterial=new THREE.MeshBasicMaterial({color:0xffffff});
  const ledWall=new THREE.InstancedMesh(ledGeometry,ledMaterial,24*9);
  for(let row=0;row<9;row++)for(let column=0;column<24;column++){
    dummy.position.set((column-11.5)*2.95,4+row*2.2,-72.32);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();ledWall.setMatrixAt(row*24+column,dummy.matrix);ledColors.push({row,column});
  }
  scene.add(ledWall);
  const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture('N E O N   R O O M','#fff',false),transparent:true,depthWrite:false}));
  sign.position.set(0,18,-70.5);sign.scale.set(25,3.9,1);scene.add(sign);

  const stageDisplay=createStageDisplay(scene),podiumSigns=[];
  PODIUMS.forEach((p,index)=>{
    box(scene,p.x,p.y/2,p.z,8.4,p.y,5.7,new THREE.MeshStandardMaterial({color:0x211327,roughness:.3,metalness:.5}));
    const edge=floorRing(scene,3.6,index===0?new THREE.MeshBasicMaterial({color:0xffdc83}):neonA);edge.position.set(p.x,p.y+.035,p.z);
    box(scene,p.x,p.y+.03,p.z+2.83,8.3,.06,.07,index===0?gold:neonA);
    const label=new THREE.Mesh(unitPlane,new THREE.MeshBasicMaterial({map:labelTexture('TOP '+(index+1),'#ffe2a1',false),transparent:true,depthWrite:false}));
    label.position.set(p.x,p.y*.5,p.z+2.89);label.scale.set(7.6,.95,1);scene.add(label);podiumSigns.push({label,key:null});
  });

  // Faceted chrome mirrorball and hundreds of individual instanced mirror tiles.
  const mirrorball=new THREE.Group();mirrorball.position.set(0,27.5,-21);mirrorball.scale.setScalar(.65);scene.add(mirrorball);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(2.65,24,16),chrome);mirrorball.add(ball);
  const mirrors=new THREE.InstancedMesh(new THREE.BoxGeometry(.42,.32,.045),chrome,24*13);
  for(let row=0;row<13;row++)for(let col=0;col<24;col++){
    const latitude=(row/12-.5)*Math.PI*.85,longitude=col/24*Math.PI*2;
    dummy.position.set(Math.cos(latitude)*Math.cos(longitude)*2.71,Math.sin(latitude)*2.71,Math.cos(latitude)*Math.sin(longitude)*2.71);
    dummy.lookAt(dummy.position.clone().multiplyScalar(2));dummy.scale.set(Math.max(.2,Math.cos(latitude)),1,1);dummy.updateMatrix();mirrors.setMatrixAt(row*24+col,dummy.matrix);
  }
  mirrorball.add(mirrors);rod(scene,new THREE.Vector3(0,29.3,-21),new THREE.Vector3(0,33,-21),.045,chrome);
  glow(mirrorball,new THREE.Vector3(0,0,0),0xcdbdff,11,.13);

  const beamGeometry=new THREE.ConeGeometry(1,1,20,1,true);
  for(let i=0;i<6;i++){
    const color=i%2?0xe874ce:0x9786ff,source=new THREE.Vector3(-28+i*11.2,29,-39+(i%2)*20);
    const lamp=new THREE.SpotLight(color,1900,120,.25,.75,1.3);lamp.position.copy(source);
    lamp.castShadow=i<2;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.bias=-.001;lamp.shadow.normalBias=.08;
    lamp.shadow.camera.near=.5;lamp.shadow.camera.far=115;scene.add(lamp,lamp.target);
    const beam=new THREE.Mesh(beamGeometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.032,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));
    scene.add(beam);const pool=new THREE.Mesh(circleGeometry,new THREE.MeshBasicMaterial({map:glowMap,color,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));
    pool.rotation.x=-Math.PI/2;scene.add(pool);beams.push({beam,pool,source});lights.push(lamp);
    glow(scene,source,color,2.5);
  }

  function poseTexture(frame){
    let result=poseTextures.get(frame.key);
    if(!result){
      const c=document.createElement('canvas'),ratio=384/frame.h;
      c.width=Math.max(1,Math.round(frame.w*ratio));c.height=384;
      c.getContext('2d').drawImage(frame.image,frame.x,frame.y,frame.w,frame.h,0,0,c.width,c.height);
      const map=canvasTexture(c);result={map,aspect:c.width/c.height};poseTextures.set(frame.key,result);
    }
    return result;
  }
  function createCrown(material){
    const group=new THREE.Group(),base=new THREE.Mesh(new THREE.TorusGeometry(.6,.12,8,32),material);
    base.rotation.x=Math.PI/2;group.add(base);
    const tips=new THREE.InstancedMesh(crownTipGeometry,material,7);
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;dummy.position.set(Math.cos(a)*.58,.25,Math.sin(a)*.58);dummy.rotation.set(0,-a,0);dummy.scale.set(1,1,1);dummy.updateMatrix();tips.setMatrixAt(i,dummy.matrix);}
    group.add(tips);return group;
  }
  function createActor(player){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false}));
    sprite.center.set(.5,0);scene.add(sprite);
    const ringMaterial=new THREE.MeshBasicMaterial({color:0xc2a0ff,transparent:true,opacity:.8});
    const ring=floorRing(scene,1.3,ringMaterial);
    const shadow=new THREE.Mesh(circleGeometry,new THREE.MeshBasicMaterial({map:glowMap,color:0x000000,transparent:true,opacity:.48,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;scene.add(shadow);
    const label=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
    label.renderOrder=10;scene.add(label);
    const badge=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));badge.renderOrder=11;scene.add(badge);
    badge.material.onBeforeCompile=shader=>{shader.uniforms.rankSweepTime=badgeTime;shader.fragmentShader='uniform float rankSweepTime;\n'+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat rankShine=pow(max(0.0,1.0-abs(fract(vMapUv.x*.65+vMapUv.y*.12-rankSweepTime*.14)-.5)*15.0),3.0);\ndiffuseColor.rgb+=rankShine*.35*diffuseColor.a;');};
    const item={sprite,ring,shadow,label,badge,badgeKey:'',world:new THREE.Vector3(),travelVelocity:new THREE.Vector3(),opacity:1,height:PLAYER_HEIGHT,initialized:false,labelKey:'',wings:null,crown:null,wingMaterial:null};
    actors.set(player.id,item);return item;
  }
  function removeActor(actor){
    for(const key of ['sprite','ring','shadow','label','badge']){scene.remove(actor[key]);actor[key].material.dispose();}
    actor.label.material.map?.dispose();actor.badge.material.map?.dispose();
    if(actor.wings)wingLibrary.remove(actor.wings);if(actor.crown)scene.remove(actor.crown);
    actor.wingMaterial?.dispose();
  }

  const flights=createFlightRig(scene,wingLibrary,glowMap);

  const heartShape=new THREE.Shape();
  heartShape.moveTo(0,-.35);heartShape.bezierCurveTo(-1,.25,-.5,1,0,.45);heartShape.bezierCurveTo(.5,1,1,.25,0,-.35);
  const heartGeometry=new THREE.ExtrudeGeometry(heartShape,{depth:.1,bevelEnabled:false,curveSegments:8});
  const hearts=new THREE.InstancedMesh(heartGeometry,new THREE.MeshStandardMaterial({color:0xff73c6,emissive:0x9b2066,emissiveIntensity:.7,roughness:.3}),9);
  scene.add(hearts);hearts.visible=false;
  const sparks=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.08),new THREE.MeshBasicMaterial({color:0xffdc75}),36);
  scene.add(sparks);sparks.visible=false;
  const tmp=new THREE.Vector3(),screen=new THREE.Vector3(),cameraUp=new THREE.Vector3(),focusScreen=new THREE.Vector3();

  function render(now,room,options){
    if(contextLost)return {mode:'3D TẠM DỪNG',focus:'',fps:0,error:'Mất kết nối GPU. Đang chờ trình duyệt khôi phục.'};
    const dt=lastNow?clamp(now-lastNow,.001,.1):1/30;lastNow=now;
    const t=Math.max(0,now-options.epoch/1000),active=room.active,strength=effectEnvelope(active,now);
    if(!fpsStart)fpsStart=now;fpsFrames++;if(now-fpsStart>=1){fps=Math.round(fpsFrames/(now-fpsStart));fpsStart=now;fpsFrames=0;}
    if(lastTheme!==options.colors.a){
      lastTheme=options.colors.a;neonA.color.set(options.colors.a);neonB.color.set(options.colors.b);
      lights.forEach((light,i)=>{light.color.set(i%2?options.colors.b:options.colors.a);beams[i].beam.material.color.copy(light.color);beams[i].pool.material.color.copy(light.color);});
    }
    badgeTime.value=reduced?0:t;
    const leaders=room.giftLeaders,giftRanks=new Map(leaders.map((p,i)=>[p.id,i]));
    stageDisplay.update(leaders);
    podiumSigns.forEach((sign,index)=>{const p=leaders[index],key=p?`${index}-${p.name}-${p.gifts}`:String(index);if(sign.key!==key){sign.key=key;sign.label.material.map.dispose();sign.label.material.map=labelTexture(p?`#${index+1} ${p.name}`:'TOP '+(index+1),'#ffe2a1',false);sign.label.material.needsUpdate=true;}});
    const ranks=new Map(leaders.slice(0,3).map((p,i)=>[p.id,i])),ids=new Set(room.players.map(p=>p.id));
    for(const [id,actor] of actors)if(!ids.has(id)){removeActor(actor);actors.delete(id);}
    const items=[];
    for(let index=0;index<room.players.length;index++){
      const player=room.players[index],actor=actors.get(player.id)||createActor(player),rank=ranks.get(player.id);
      const target=rank===undefined?floorSlot(index):PODIUMS[rank];
      actor.groundY=target.y;
      tmp.set(target.x,target.y,target.z);
      const u=active?clamp((now-active.startAt)/active.duration,0,1):0;
      if(active?.userId===player.id&&active.action==='walk'){tmp.x+=Math.sin(u*Math.PI*2)*3.5;tmp.z+=(1-Math.cos(u*Math.PI*2))*2.5;}
      actor.height=rank===undefined?PLAYER_HEIGHT*characterScale(index):VIP_HEIGHT;
      if(active?.userId===player.id&&FLIGHT_ACTIONS.has(active.action)){
        const flightKey=active.action+'-'+active.startAt;
        if(actor.flightKey!==flightKey){actor.flightKey=flightKey;actor.flightBase={...target};actor.flightHeight=actor.height;}
        actor.height=actor.flightHeight;actor.flight=flightPose(actor.flightBase,actor.height,u,active.action,reduced);
      }else{actor.flightKey=null;actor.flight=null;}
      if(actor.flight)tmp.set(actor.flight.x,actor.flight.y,actor.flight.z);
      if(active?.partnerId===player.id){
        const leadIndex=room.players.findIndex(p=>p.id===active.userId),leadRank=ranks.get(active.userId),base=leadRank===undefined?floorSlot(leadIndex):PODIUMS[leadRank];
        const leadHeight=leadRank===undefined?PLAYER_HEIGHT*characterScale(leadIndex):VIP_HEIGHT;
        tmp.set(base.x+leadHeight*1.25,base.y,base.z);
      }
      if(!actor.initialized){actor.world.copy(tmp);actor.initialized=true;}else{
        const before=actor.world.clone();actor.world.lerp(tmp,reduced?1:1-Math.exp(-dt*7));actor.travelVelocity.copy(actor.world).sub(before).divideScalar(dt);
      }
      items.push({actor,player,index,rank,giftRank:giftRanks.get(player.id)});
    }
    const touring=options.cameraMode==='tour'&&!active,tour=tourFocus(t,items.length);
    const focusId=active?.userId||(touring?items[tour.index]?.player.id:room.selectedId);
    const focus=items.find(item=>item.player.id===focusId);
    const weight=options.cameraMode==='wide'?0:options.cameraMode==='close'?1:touring?tour.weight:strength;
    const focusPoint=focus?{x:focus.actor.world.x,y:focus.actor.world.y,z:focus.actor.world.z}:null;
    if(focusPoint&&active?.action==='pair')focusPoint.x+=focus.actor.height*.625;
    // Compensate the camera spring's tracking delay during a fast banked turn.
    if(focusPoint&&focus.actor.flight&&!reduced)for(const axis of ['x','y','z'])focusPoint[axis]+=focus.actor.travelVelocity[axis]*.2*weight;
    const idle=cinematicCamera(t,reduced),wide=options.cameraMode==='auto'?idle.camera:overviewCamera(t,reduced);
    const stageTour=options.cameraMode==='auto'&&!active?idle.stageWeight:0;
    let framingAction=active?.action||(focus?.player.aura?'wings':'camera');
    if(focus?.player.aura&&!FLIGHT_ACTIONS.has(framingAction)&&framingAction!=='pair')framingAction=WING_ACTIONS.has(framingAction)?framingAction:'wings';
    const targetCamera=focusPoint?blendCamera(wide,closeCamera(focusPoint,t,framingAction,reduced,focus.actor.height),weight):wide;
    cameraState=reduced?targetCamera:dampCamera(cameraState,targetCamera,velocity,dt,focus?.actor.flight?10:8);
    camera.position.set(cameraState.x,cameraState.y,cameraState.z);camera.lookAt(cameraState.tx,cameraState.ty,cameraState.tz);
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(H/(2*cameraState.focal)));camera.updateProjectionMatrix();camera.updateMatrixWorld();
    cameraUp.copy(UP).applyQuaternion(camera.quaternion);
    if(focus)focusScreen.copy(focus.actor.world).addScaledVector(cameraUp,focus.actor.height*.5).project(camera);
    mirrorball.visible=!(FLIGHT_ACTIONS.has(active?.action)&&strength>.01)&&stageTour<.05;
    mirrorball.rotation.y=reduced?0:t*.24;
    if(Math.floor(t*8)!==lastLed){
      lastLed=Math.floor(t*8);ledColors.forEach(({row,column},i)=>{
        const beat=.28+.65*Math.pow(Math.max(0,Math.sin(column*.26+row*.49+t*.65)),2);
        ledWall.setColorAt(i,new THREE.Color(column%7<3?options.colors.a:options.colors.b).multiplyScalar(beat));
      });ledWall.instanceColor.needsUpdate=true;
    }
    lights.forEach((light,i)=>{
      const end=new THREE.Vector3(Math.sin(t*.32+i*1.8)*28,.03,-25+Math.cos(t*.24+i*.7)*35);
      light.target.position.copy(end);const b=beams[i],delta=b.source.clone().sub(end),length=delta.length();
      b.beam.position.copy(end).add(b.source).multiplyScalar(.5);b.beam.quaternion.setFromUnitVectors(UP,delta.normalize());b.beam.scale.set(length*.12,length,length*.12);
      b.pool.position.copy(end);b.pool.scale.setScalar(length*.13);
    });
    const labels=[];
    for(const item of items){
      const {actor,player,index,rank,giftRank}=item,focused=player.id===focusId,partner=player.id===active?.partnerId,action=active?.userId===player.id?active.action:null;
      const phase=t*9.5+player.phase,energy=reduced?.12:1,bob=Math.pow(Math.max(0,Math.sin(phase)),1.4)*(action==='jump'?actor.height*.48:actor.height*.09)*energy;
      const flightLift=actor.flight?.lift||0,height=actor.height*(1-flightLift*.3);
      const feet=actor.world.clone();feet.y+=bob*(1-flightLift*.8)+actor.height*.36*flightLift;
      const distance=feet.distanceTo(camera.position),depth=tmp.copy(feet).applyMatrix4(camera.matrixWorldInverse).z*-1;
      const pixelHeight=height*cameraState.focal/Math.max(.5,depth),pixelWidth=pixelHeight*(actor.aspect||1);
      screen.copy(feet).addScaledVector(cameraUp,height*.5).project(camera);
      const focusDepth=focus?tmp.copy(focus.actor.world).applyMatrix4(camera.matrixWorldInverse).z*-1:0;
      const blocksFocus=!focused&&!partner&&focus&&depth<focusDepth+height*.5&&Math.abs(screen.x-focusScreen.x)<.8&&Math.abs(screen.y-focusScreen.y)<.9;
      const targetOpacity=(!focused&&!partner?1-weight*(blocksFocus?.98:.78):1)*(rank===undefined?1-stageTour*(pixelHeight>260?.96:.7):1);
      actor.opacity=lerp(actor.opacity,targetOpacity,1-Math.exp(-dt*10));
      actor.sprite.material.opacity=actor.opacity;actor.sprite.material.depthWrite=actor.opacity>.96;
      actor.sprite.visible=depth>.2;actor.sprite.position.copy(feet);
      actor.sprite.material.rotation=actor.flight?actor.flight.bank*.55:Math.sin(phase*.5)*.06*energy;
      const frame=getStickerFrame(action==='wukong'?'wukong':player.skin,t*8+player.phase,{time:t+player.phase,jump:action==='jump'&&Math.sin(phase)>.2});
      if(frame){const pose=poseTexture(frame);actor.sprite.material.map=pose.map;actor.aspect=pose.aspect;actor.sprite.material.needsUpdate=actor.mapKey!==frame.key;actor.mapKey=frame.key;actor.sprite.scale.set(height*pose.aspect,height,1);}
      actor.shadow.position.set(actor.world.x,actor.flight?actor.groundY*(1-flightLift)+.025:actor.world.y+.025,actor.world.z);actor.shadow.scale.set(actor.height*.45,actor.height*.25,1);actor.shadow.material.opacity=actor.opacity*.42*(1-bob/actor.height)*(1-flightLift*.85);
      actor.ring.visible=flightLift<.015&&(!!player.aura||focused||!!action);
      actor.ring.position.set(actor.world.x,actor.world.y+.045,actor.world.z);actor.ring.scale.setScalar(actor.height*(player.aura?.48:.36));
      actor.ring.material.color.set(player.aura==='gold'?0xffcf69:player.aura==='silver'?0xc8e8ff:options.colors.a);
      actor.ring.material.opacity=actor.opacity*(action==='jump'?.4+Math.abs(Math.sin(t*8))*.5:.8);
      const style=wingStyle(player),wingColor=WING_STYLES[style].color;
      actor.ring.material.color.set(player.aura?wingColor:options.colors.a);
      if(player.aura&&!actor.wings){
        actor.wingMaterial=gold.clone();actor.wingMaterial.transparent=true;
        actor.wings=wingLibrary.create(style);actor.crown=createCrown(actor.wingMaterial);scene.add(actor.wings,actor.crown);
      }
      if(actor.wings){
        const showWings=!!player.aura&&!FLIGHT_ACTIONS.has(action)&&action!=='pair'&&!partner&&actor.opacity>.04;
        actor.wings.visible=showWings;
        if(showWings){
          actor.wings.position.copy(feet).addScaledVector(cameraUp,height*.54);actor.wings.quaternion.copy(camera.quaternion);actor.wings.translateZ(-height*.45);
          wingLibrary.update(actor.wings,{style,time:t,phase:player.phase,opacity:actor.opacity,near:focused||pixelHeight>220,reduced,scale:height/PLAYER_HEIGHT});
        }
        actor.wingMaterial.color.set(wingColor);actor.wingMaterial.opacity=actor.opacity;actor.wingMaterial.depthWrite=actor.opacity>.96;
        actor.crown.visible=showWings&&(rank===0||action==='crown');
        actor.crown.position.copy(feet).addScaledVector(cameraUp,height+.4);actor.crown.rotation.y=t*.35;actor.crown.scale.setScalar(height/PLAYER_HEIGHT);
      }
      const labelKey=player.name+player.aura+style+giftRank+focused;
      if(actor.labelKey!==labelKey){actor.label.material.map?.dispose();actor.label.material.map=labelTexture(player.name,giftRank===0?'#ffe5a1':player.aura?wingColor:focused?'#d1ff72':'#eee6ff');actor.label.material.needsUpdate=true;actor.labelKey=labelKey;}
      actor.label.position.copy(feet).addScaledVector(cameraUp,height*(actor.crown?.visible?1.27:player.aura?1.1:1)+.14);
      const labelPixelHeight=focused&&weight>.5?45:34,labelWorldHeight=labelPixelHeight*Math.max(.5,depth)/cameraState.focal;
      const labelAspect=actor.label.material.map.image.width/80;
      actor.label.scale.set(labelWorldHeight*labelAspect,labelWorldHeight,1);
      actor.label.material.opacity=actor.opacity;actor.label.visible=false;actor.badge.visible=false;
      let badgeWidth=0,badgeHeight=0;
      if(giftRank!==undefined){
        const badgeKey=giftRank+'-'+player.gifts+'-'+player.name;
        if(actor.badgeKey!==badgeKey){actor.badge.material.map?.dispose();actor.badge.material.map=rankTexture(giftRank+1,player);actor.badge.material.needsUpdate=true;actor.badgeKey=badgeKey;}
        badgeHeight=focused&&weight>.5?40:31;badgeWidth=badgeHeight*actor.badge.material.map.image.width/90;
        const world=badgeHeight*Math.max(.5,depth)/cameraState.focal,pulse=reduced?1:1+Math.sin(t*2.8+giftRank)*.025;
        actor.badge.position.copy(actor.label.position).addScaledVector(cameraUp,(labelPixelHeight/2+badgeHeight/2+7)*Math.max(.5,depth)/cameraState.focal);
        actor.badge.scale.set(world*actor.badge.material.map.image.width/90*pulse,world*pulse,1);actor.badge.material.opacity=actor.opacity;
      }
      const projected=actor.label.position.clone().project(camera);
      labels.push({actor,focused,partner,rank,giftRank,depth,pixelHeight,pixelWidth,labelWidth:Math.max(labelPixelHeight*labelAspect,badgeWidth),labelHeight:labelPixelHeight+badgeHeight+(badgeHeight?7:0),badgeHeight,x:(projected.x*.5+.5)*W,y:(-.5*projected.y+.5)*H,priority:focused?0:partner?1:giftRank!==undefined?2+giftRank*.01:rank!==undefined?3:4,index});
    }
    // Reserve both rows of each TOP/name card before admitting ordinary labels.
    const occupied=[];let ordinaryLabels=0;
    labels.sort((a,b)=>a.priority-b.priority||a.depth-b.depth);
    for(const label of labels){
      if(label.actor.opacity<.75||label.x<30||label.x>W-30||label.y<245||label.y>H-240||label.depth<.2)continue;
      if(label.priority===4&&(ordinaryLabels>=14||label.pixelHeight<125||weight>.3))continue;
      const width=label.labelWidth,height=label.labelHeight;
      const rect={x:label.x-width/2,y:label.y-height+17,w:width,h:height};
      if(rect.y<235||occupied.some(r=>rect.x<r.x+r.w+8&&rect.x+rect.w>r.x-8&&rect.y<r.y+r.h+8&&rect.y+rect.h>r.y-8))continue;
      occupied.push(rect);label.actor.label.visible=true;label.actor.badge.visible=label.giftRank!==undefined;if(label.priority===4)ordinaryLabels++;
    }
    flights.update({active,actor:focus?.actor,time:t,progress:active?clamp((now-active.startAt)/active.duration,0,1):0,reduced});
    hearts.visible=active?.action==='pair'&&!!focus;
    if(hearts.visible)for(let i=0;i<9;i++){
      dummy.position.copy(focus.actor.world);dummy.position.x+=focus.actor.height*.6+Math.sin(i+t)*.5;dummy.position.y+=1+((t*.8+i*.5)%4.7);dummy.position.z+=Math.sin(i*2+t)*.6;
      dummy.rotation.set(0,t+i,Math.sin(t+i)*.2);dummy.scale.setScalar(.3+i%3*.09);dummy.updateMatrix();hearts.setMatrixAt(i,dummy.matrix);
    }
    if(hearts.visible)hearts.instanceMatrix.needsUpdate=true;
    sparks.visible=!!focus&&(WING_ACTIONS.has(active?.action)||['wukong','jump'].includes(active?.action));
    if(sparks.visible)for(let i=0;i<36;i++){
      const a=i/36*Math.PI*2+t*.5;dummy.position.copy(focus.actor.world);dummy.position.x+=Math.cos(a)*focus.actor.height*.9;dummy.position.y+=focus.actor.height*(.15+(i%7)/7);dummy.position.z+=Math.sin(a)*focus.actor.height*.65;
      dummy.rotation.set(t+i,t*.8,t);dummy.scale.setScalar(.7+(i%3)*.5);dummy.updateMatrix();sparks.setMatrixAt(i,dummy.matrix);
    }
    if(sparks.visible)sparks.instanceMatrix.needsUpdate=true;
    renderer.render(scene,camera);
    const visible=labels.filter(p=>p.x>-p.pixelWidth&&p.x<W+p.pixelWidth&&p.y>-p.pixelHeight&&p.y<H+200&&p.depth>.2&&p.actor.opacity>.2);
    canvas.dataset.visibleCharacters=String(visible.length);
    canvas.dataset.topBadges=String(labels.filter(label=>label.actor.badge.visible).length);
    canvas.dataset.focusWing=focus?.player.aura?wingStyle(focus.player):'';canvas.dataset.effectsAssets=String(wingLibrary.loaded);canvas.dataset.activeEffect=active?.action||'idle';
    canvas.dataset.minCharacterPx=String(visible.length?Math.round(Math.min(...visible.map(p=>p.pixelHeight))):0);
    return {error:wingLibrary.error,mode:FLIGHT_ACTIONS.has(active?.action)&&weight>.5?(active.action==='phoenix_fly'?'PHƯỢNG HOÀNG 3D':'PHI CÔNG 3D'):touring?'DẠO SÀN 3D':weight>.5?'CẬN CẢNH 3D':options.cameraMode==='auto'?idle.label:'TOÀN CẢNH 3D',focus:focus?.player.name,fps,wideShot:weight<.5,visible:visible.length,renderer:'WebGL 2'};
  }
  function dispose(){
    for(const actor of actors.values())removeActor(actor);actors.clear();
    for(const pose of poseTextures.values())pose.map.dispose();poseTextures.clear();
    flights.dispose();wingLibrary.dispose();stageDisplay.dispose();podiumSigns.forEach(sign=>{sign.label.material.map.dispose();sign.label.material.dispose();});environmentMap.dispose();glowMap.dispose();renderer.dispose();
  }
  return {render,dispose};
}
