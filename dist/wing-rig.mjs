import * as THREE from './vendor/three.module.js';
import {WING_STYLES,wingPose} from './effect-math.mjs';

export function createWingLibrary(glowMap){
  const maps=new Map(),images=new Map(),plane=new THREE.PlaneGeometry(1,1),dummy=new THREE.Object3D();
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.19,.2,-.23,.68,0,1);shape.bezierCurveTo(.27,.62,.2,.18,0,0);
  const feather=new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1,steps:1,curveSegments:5});
  const crystal=new THREE.OctahedronGeometry(.075);let disposed=false,loaded=0,error='';
  for(const spec of Object.values(WING_STYLES)){
    if(maps.has(spec.file))continue;
    const pair=[new THREE.Texture(),new THREE.Texture()];
    pair.forEach((map,index)=>{map.colorSpace=THREE.SRGBColorSpace;map.repeat.set(.5,1);map.offset.set(index*.5,0);map.minFilter=THREE.LinearFilter;});maps.set(spec.file,pair);
    const image=new Image();image.onload=()=>{if(disposed)return;pair.forEach(map=>{map.image=image;map.needsUpdate=true;});loaded++;};image.onerror=()=>{error='Chưa tải được hình '+spec.label+'. Hãy tải lại trang.';};image.src=new URL('./assets/'+spec.file,import.meta.url).href;images.set(spec.file,image);
  }
  function create(style='gold'){
    const group=new THREE.Group(),sides=[],details=[],feathers=[],halos=[];
    const metal=new THREE.MeshStandardMaterial({color:0xffce72,metalness:.7,roughness:.3,emissive:0x5b3512,emissiveIntensity:.3,transparent:true});
    for(const direction of [-1,1]){
      const pivot=new THREE.Group();pivot.position.set(direction*.08,0,0);group.add(pivot);sides.push(pivot);
      const layer=new THREE.InstancedMesh(feather,metal,24);
      for(let i=0;i<24;i++){
        const band=i<14?0:1,j=band?i-14:i,count=band?10:14,u=j/(count-1);
        dummy.position.set(direction*(.15+u*1.6),.1+Math.sin(u*Math.PI)*.55-band*.18,band*.08);dummy.rotation.set(.1*Math.sin(u*3),direction*.08,-direction*(.8+u*.92));dummy.scale.set(band?.9:1,band?.65+u*.7:1.05+u*1.15,1);dummy.updateMatrix();layer.setMatrixAt(i,dummy.matrix);
      }
      pivot.add(layer);feathers.push(layer);
      const material=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.075,side:THREE.DoubleSide,toneMapped:false});
      material.userData.recolor={value:0};material.userData.tint={value:new THREE.Color('#dcefff')};
      material.onBeforeCompile=shader=>{
        shader.uniforms.wingRecolor=material.userData.recolor;shader.uniforms.wingTint=material.userData.tint;
        shader.fragmentShader='uniform float wingRecolor;\nuniform vec3 wingTint;\n'+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat featherLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb=mix(diffuseColor.rgb,featherLuma*wingTint,wingRecolor);');
      };
      const detail=new THREE.Mesh(plane,material);detail.position.set(direction*1.95,.28,.18);detail.scale.set(4.2,3.9,1);pivot.add(detail);details.push(detail);
      const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:0xffda88,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false}));halo.position.set(direction*2,.5,-.2);halo.scale.set(4.3,4.3,1);pivot.add(halo);halos.push(halo);
    }
    const particles=new THREE.InstancedMesh(crystal,new THREE.MeshBasicMaterial({color:0xffe5a2,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),20);group.add(particles);
    group.userData={sides,details,feathers,halos,metal,particles,style:null};setStyle(group,style);return group;
  }
  function setStyle(group,style){
    const spec=WING_STYLES[style]||WING_STYLES.gold,data=group.userData;if(data.style===style)return;data.style=style;
    data.metal.color.set(spec.color);data.metal.emissive.set(spec.color).multiplyScalar(.15);
    data.details.forEach((mesh,index)=>{mesh.material.map=maps.get(spec.file)[index];mesh.material.userData.recolor.value=style==='silver'?1:0;mesh.material.userData.tint.value.set('#d2eaff');mesh.material.needsUpdate=true;mesh.scale.set(4.2,style==='galaxy'?4.25:3.9,1);});
    data.halos.forEach(halo=>halo.material.color.set(spec.color));data.particles.material.color.set(spec.accent);
  }
  function update(group,{style='gold',time=0,phase=0,opacity=1,near=false,reduced=false,scale=1,recolor=null}={}){
    setStyle(group,style);const data=group.userData,spec=WING_STYLES[style]||WING_STYLES.gold,pose=wingPose(style,time,phase,reduced);
    group.scale.set(scale,scale*pose.stretch,scale);
    if(recolor){data.metal.color.set(recolor);data.metal.emissive.set(recolor).multiplyScalar(.22);}
    data.metal.opacity=opacity;data.metal.depthWrite=opacity>.96;
    data.details.forEach(mesh=>{mesh.material.opacity=opacity;mesh.material.depthWrite=opacity>.96;if(recolor){mesh.material.userData.recolor.value=1;mesh.material.userData.tint.value.set(recolor);}});
    data.feathers.forEach(mesh=>mesh.visible=spec.feathered&&near);
    data.sides.forEach((side,index)=>{const direction=index===0?-1:1;side.rotation.y=direction*pose.flap;side.rotation.z=direction*pose.sweep;side.position.y=pose.lift;});
    data.halos.forEach(halo=>{halo.visible=near;halo.material.opacity=opacity*.15*pose.pulse;});
    data.particles.visible=near&&opacity>.1;
    if(data.particles.visible){
      data.particles.material.opacity=opacity*pose.pulse;
      for(let i=0;i<20;i++){
        const side=i%2?1:-1,u=(i/20+time*(style==='fire'?.25:.08))%1,a=i*2.4+time*.5;
        dummy.position.set(side*(.7+u*3.3),style==='fire'?-.7+u*3.6:.4+Math.sin(a)*1.9,.45+Math.cos(a)*.25);dummy.rotation.set(time+i,time*.8,time);dummy.scale.setScalar(style==='ice'?.8+u:style==='storm'?.5+pose.pulse:.45+Math.sin(i+time*3)**2);dummy.updateMatrix();data.particles.setMatrixAt(i,dummy.matrix);
      }data.particles.instanceMatrix.needsUpdate=true;
    }
  }
  function remove(group){group.removeFromParent();const data=group.userData;data.metal.dispose();data.details.forEach(mesh=>mesh.material.dispose());data.halos.forEach(mesh=>mesh.material.dispose());data.particles.material.dispose();}
  function dispose(){disposed=true;maps.forEach(pair=>pair.forEach(map=>map.dispose()));plane.dispose();feather.dispose();crystal.dispose();}
  return {create,update,remove,dispose,get loaded(){return loaded;},get error(){return error;}};
}
