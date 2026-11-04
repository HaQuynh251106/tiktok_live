import * as THREE from './vendor/three.module.js';
import {FLIGHT_ACTIONS} from './effect-math.mjs';

export function createFlightRig(scene,wingLibrary,glowMap){
  const root=new THREE.Group(),airplane=new THREE.Group(),phoenix=new THREE.Group(),geometries=new Set(),materials=new Set(),dummy=new THREE.Object3D();
  root.add(airplane,phoenix);scene.add(root);root.visible=false;
  const geometry=value=>{geometries.add(value);return value;},material=options=>{const value=new THREE.MeshStandardMaterial(options);materials.add(value);return value;};
  const boxGeometry=geometry(new THREE.BoxGeometry(1,1,1)),sphere=geometry(new THREE.SphereGeometry(1,28,16)),cylinder=geometry(new THREE.CylinderGeometry(1,1,1,12));
  const red=material({color:0xe6324e,metalness:.38,roughness:.26}),cream=material({color:0xffe7d0,metalness:.25,roughness:.32}),chrome=material({color:0xbfc9df,metalness:.9,roughness:.18}),dark=material({color:0x24192d,metalness:.45,roughness:.3});
  const purple=material({color:0x8b41ef,metalness:.62,roughness:.23,emissive:0x39186c,emissiveIntensity:.65}),blue=material({color:0x49c7ff,metalness:.48,roughness:.2,emissive:0x1c8df0,emissiveIntensity:.6}),pink=material({color:0xd076ff,metalness:.5,roughness:.23}),gold=material({color:0xffdb8c,metalness:.65,roughness:.25});
  function mesh(parent,geo,mat,position,scale){const item=new THREE.Mesh(geo,mat);item.position.set(...position);item.scale.set(...scale);item.castShadow=true;parent.add(item);return item;}
  const box=(parent,mat,position,scale)=>mesh(parent,boxGeometry,mat,position,scale);
  function rod(parent,a,b,radius,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from),item=mesh(parent,cylinder,mat,[0,0,0],[radius,delta.length(),radius]);item.position.copy(from).add(to).multiplyScalar(.5);item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return item;}
  function glow(parent,position,color,size,opacity){const mat=new THREE.SpriteMaterial({map:glowMap,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});materials.add(mat);const item=new THREE.Sprite(mat);item.position.set(...position);item.scale.set(size,size,1);parent.add(item);return item;}

  // Two real wing decks, braces, open cockpit, wheels and a spinning propeller.
  mesh(airplane,sphere,red,[0,0,0],[3.15,.63,.72]);
  mesh(airplane,sphere,cream,[2.75,0,0],[.75,.56,.59]);
  box(airplane,red,[-.15,-.18,0],[1.65,.13,7.8]);box(airplane,red,[-.15,1.52,0],[1.65,.14,8.4]);
  for(const z of [-2.9,2.9]){
    for(const x of [-.72,.43])rod(airplane,[x,-.1,z],[x,1.48,z],.055,cream);
    rod(airplane,[-.72,-.08,z],[.43,1.47,z],.026,chrome);
    box(airplane,cream,[-.15,1.601,z],[1.66,.015,.24]);
  }
  box(airplane,cream,[-2.5,.27,0],[1.1,.1,3.2]);box(airplane,red,[-2.5,.92,0],[1.1,1.65,.12]);
  const cockpit=mesh(airplane,geometry(new THREE.TorusGeometry(.55,.1,8,32)),dark,[.5,.61,0],[1,1,1]);cockpit.rotation.x=Math.PI/2;
  const seat=mesh(airplane,sphere,dark,[.5,.62,0],[.48,.14,.47]);
  for(const z of [-1,1]){
    rod(airplane,[.35,-.3,z*.35],[.8,-1,z],.065,chrome);
    const wheel=mesh(airplane,cylinder,dark,[.8,-.98,z],[.39,.19,.39]);wheel.rotation.x=Math.PI/2;
  }
  const propeller=new THREE.Group();propeller.position.set(3.55,0,0);airplane.add(propeller);
  mesh(propeller,sphere,chrome,[0,0,0],[.23,.23,.23]);box(propeller,cream,[0,0,0],[.1,2.65,.19]);box(propeller,cream,[0,0,0],[.1,.19,2.65]);
  const propBlur=mesh(propeller,geometry(new THREE.CircleGeometry(1.34,40)),new THREE.MeshBasicMaterial({color:0xe9f8ff,side:THREE.DoubleSide,transparent:true,opacity:.09,depthWrite:false}),[.01,0,0],[1,1,1]);materials.add(propBlur.material);propBlur.rotation.y=Math.PI/2;
  glow(airplane,[-3.2,-.1,0],0x77eaff,2.3,.6);

  // A purple bird mount with a long neck, hinged feather wings and flowing tail.
  mesh(phoenix,sphere,purple,[-.1,-.12,0],[2.55,.65,.8]);mesh(phoenix,sphere,pink,[1,.04,0],[1.25,.56,.62]);
  const neckCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.9,0,0),new THREE.Vector3(1.6,.3,0),new THREE.Vector3(2.05,1.05,0),new THREE.Vector3(2.7,1.38,0)]);
  mesh(phoenix,geometry(new THREE.TubeGeometry(neckCurve,28,.3,10,false)),purple,[0,0,0],[1,1,1]);mesh(phoenix,sphere,purple,[2.68,1.35,0],[.57,.39,.43]);
  const beak=mesh(phoenix,geometry(new THREE.ConeGeometry(.25,.85,8)),gold,[3.29,1.29,0],[1,1,1]);beak.rotation.z=-Math.PI/2;
  for(const direction of [-1,1]){
    mesh(phoenix,sphere,cream,[2.8,1.49,direction*.36],[.16,.16,.07]);mesh(phoenix,sphere,dark,[2.88,1.49,direction*.413],[.073,.09,.025]);
    glow(phoenix,[2.9,1.48,direction*.44],0x8cefff,.5,.45);
  }
  const plumeGeometry=geometry(new THREE.ConeGeometry(.18,1.25,6));
  for(let i=0;i<4;i++){const plume=mesh(phoenix,plumeGeometry,i%2?blue:pink,[2.17-i*.19,1.73+i*.04,0],[1,1+i*.2,.55]);plume.rotation.z=.6+i*.12;}
  const birdWings=wingLibrary.create('fire');birdWings.position.set(-.35,.16,0);birdWings.rotation.set(-.12,Math.PI/2,0);phoenix.add(birdWings);
  const tails=[],tailGeometry=geometry(new THREE.ConeGeometry(.28,4.6,8));
  for(let i=0;i<11;i++){
    const side=(i-5)/5,tail=mesh(phoenix,tailGeometry,i%3===0?blue:i%2?pink:purple,[-3.6,-.1,side*1.05],[.8,1+(1-Math.abs(side))*.45,.3]);tail.rotation.set(side*.15,side*.12,Math.PI/2);tails.push(tail);
  }
  glow(phoenix,[-5.7,.08,0],0x69edff,3.3,.65);

  const trailGroup=new THREE.Group();scene.add(trailGroup);trailGroup.visible=false;
  const sampleCount=72,history=[],ribbons=[];
  for(let layer=0;layer<2;layer++){
    const positions=new Float32Array(sampleCount*2*3),colors=new Float32Array(sampleCount*2*3),indices=[];
    for(let i=0;i<sampleCount-1;i++){const v=i*2;indices.push(v,v+1,v+2,v+1,v+3,v+2);}
    const geo=geometry(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setIndex(indices);
    const mat=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.48,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});materials.add(mat);
    const ribbon=new THREE.Mesh(geo,mat);ribbon.frustumCulled=false;trailGroup.add(ribbon);ribbons.push({ribbon,positions,colors});
  }
  const sparkMaterial=new THREE.MeshBasicMaterial({color:0xc0faff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false});materials.add(sparkMaterial);
  const sparks=new THREE.InstancedMesh(geometry(new THREE.OctahedronGeometry(.075)),sparkMaterial,32);sparks.frustumCulled=false;trailGroup.add(sparks);
  let lastKey='',lastSample=0;const tailWorld=new THREE.Vector3();
  function update({active,actor,time,progress,reduced=false}){
    const flying=FLIGHT_ACTIONS.has(active?.action)&&actor&&actor.flight?.lift>.015;
    root.visible=!!flying;trailGroup.visible=!!flying;if(!flying){history.length=0;lastKey='';return;}
    const bird=active.action==='phoenix_fly',pose=actor.flight,scale=actor.height/3.65;
    const key=active.userId+'-'+active.startAt+'-'+active.action;if(key!==lastKey){lastKey=key;history.length=0;lastSample=0;}
    airplane.visible=!bird;phoenix.visible=bird;root.position.copy(actor.world);root.rotation.set(pose.bank,pose.yaw,pose.pitch,'YXZ');root.scale.setScalar(scale*pose.lift);
    propeller.rotation.x=reduced?0:time*42;
    if(bird){
      wingLibrary.update(birdWings,{style:'fire',time,phase:0,near:true,reduced,scale:1.18,recolor:'#a58bff'});
      tails.forEach((tail,i)=>{tail.rotation.z=Math.PI/2+Math.sin(time*3.7-i*.25)*.095*(reduced?.1:1);tail.rotation.y=(i-5)*.025+Math.sin(time*2.7-i*.3)*.08*(reduced?.1:1);});
    }
    root.updateMatrixWorld(true);tailWorld.set(bird?-5.8:-3.2,-.05,0).applyMatrix4(root.matrixWorld);
    if(time-lastSample>=1/30){history.unshift(tailWorld.clone());if(history.length>sampleCount)history.pop();lastSample=time;}
    while(history.length<sampleCount)history.push(tailWorld.clone());
    ribbons.forEach(({ribbon,positions,colors},layer)=>{
      const tint=new THREE.Color(layer?(bird?'#9e47ff':'#4789ff'):'#24cfff');
      for(let i=0;i<sampleCount;i++){
        const fade=1-i/(sampleCount-1),width=actor.height*(layer?.085:.16)*fade*pose.lift,point=history[i];
        for(let side=0;side<2;side++){
          const index=(i*2+side)*3;positions[index]=point.x;positions[index+1]=point.y+(side?1:-1)*width+Math.sin(i*.22+time*4)*width*.3;positions[index+2]=point.z+(layer?width*.3:-width*.3);
          colors[index]=tint.r*fade;colors[index+1]=tint.g*fade;colors[index+2]=tint.b*fade;
        }
      }ribbon.geometry.attributes.position.needsUpdate=true;ribbon.geometry.attributes.color.needsUpdate=true;ribbon.material.opacity=.48*pose.lift;
    });
    for(let i=0;i<32;i++){
      const point=history[Math.min(sampleCount-1,i)],fade=1-i/32;dummy.position.copy(point);dummy.position.y+=Math.sin(time*5+i)*scale*.3;dummy.position.z+=Math.cos(i*2.4)*scale*.4;dummy.rotation.set(time+i,time,time);dummy.scale.setScalar(scale*fade*(.55+Math.sin(time*7+i)**2));dummy.updateMatrix();sparks.setMatrixAt(i,dummy.matrix);
    }sparks.instanceMatrix.needsUpdate=true;
  }
  function dispose(){wingLibrary.remove(birdWings);root.removeFromParent();trailGroup.removeFromParent();geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());}
  return {update,dispose};
}
