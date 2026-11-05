import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn,exec,execFile} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));

async function availablePort(){
  const reservation=net.createServer();
  reservation.listen(0,'127.0.0.1');
  await once(reservation,'listening');
  const port=reservation.address().port;
  await new Promise(resolve=>reservation.close(resolve));
  return port;
}

test('packaged room starts from a folder with spaces and synchronizes all effects',{timeout:35000},async t=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'Neon Room Windows '));
  for(const name of ['dist','server.mjs','sticker-store.mjs','admin-store.mjs','music-hub.mjs','tiktok-live.mjs','tiktok-game.mjs','Mo-Neon-Room.cmd','package.json','package-lock.json'])await fs.cp(path.join(root,name),path.join(folder,name),{recursive:true});
  await fs.symlink(path.join(root,'node_modules'),path.join(folder,'node_modules'),process.platform==='win32'?'junction':'dir');
  const port=await availablePort(),base=`http://127.0.0.1:${port}`;
  const options={cwd:os.tmpdir(),env:{...process.env,NEON_ROOM_PORT:String(port)}};
  delete options.env.NEON_ROOM_RESUME;
  // On Windows this exercises the actual double-click entry point, including cd /d.
  const child=process.platform==='win32'
    ?exec(`"${path.join(folder,'Mo-Neon-Room.cmd')}" --no-open`,options)
    :spawn(process.execPath,[path.join(folder,'server.mjs'),'--no-open'],options);
  child.stdin?.end();
  let output='',spawnError;
  child.stdout.on('data',data=>output+=data.toString());
  child.stderr.on('data',data=>output+=data.toString());
  child.on('error',error=>spawnError=error);
  const exited=once(child,'exit');
  t.after(async()=>{
    if(child.exitCode===null){
      if(process.platform==='win32')await new Promise(resolve=>execFile('taskkill.exe',['/PID',String(child.pid),'/T','/F'],()=>resolve()));
      else child.kill('SIGTERM');
      await exited;
    }
    await fs.rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  });
  let ready=false;
  for(let i=0;i<100;i++){
    if(spawnError)throw spawnError;
    if(child.exitCode!==null)throw new Error(`Launcher stopped early: ${output}`);
    try{const res=await fetch(base+'/api/status',{signal:AbortSignal.timeout(300)});ready=res.ok&&(await res.json()).service==='neon-room';}catch{}
    if(ready)break;
    await delay(100);
  }
  assert.ok(ready,`Server never became ready: ${output}`);

  const command=async body=>{
    const res=await fetch(base+'/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal(res.status,200);
    assert.equal((await res.json()).ok,true);
  };
  const snapshot=async()=>{
    const abort=new AbortController();
    const timer=setTimeout(()=>abort.abort(),3000);
    try{
      const res=await fetch(base+'/api/stream',{signal:abort.signal});
      assert.equal(res.status,200);
      const reader=res.body.getReader(),decoder=new TextDecoder();
      let text='';
      for(;;){const {value,done}=await reader.read();if(done)throw new Error('SSE closed before sending state');text+=decoder.decode(value,{stream:true});const message=text.split('\n').find(line=>line.startsWith('data: ')&&text.includes('\n\n'));if(message)return JSON.parse(message.slice(6));}
    }finally{clearTimeout(timer);abort.abort();}
  };

  const html=await (await fetch(base+'/?overlay=1')).text();
  assert.match(html,/width="1080" height="1920"/);
  assert.match(html,/Windows/);
  for(const name of ['three.module.js','three.core.js']){
    const module=await fetch(base+'/vendor/'+name);assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
  }
  for(const name of ['meme-crew','pink-plane','monkey-king','golden-wings','animal-crew','wings-ice','wings-fire','wings-galaxy','wings-storm']){
    const res=await fetch(base+'/assets/'+name+'.png');
    assert.equal(res.status,200);
    assert.equal(res.headers.get('content-type'),'image/png');
    const data=new Uint8Array(await res.arrayBuffer());
    assert.deepEqual([...data.slice(0,8)],[137,80,78,71,13,10,26,10]);
  }
  assert.equal((await fetch(base+'/stickers.mjs')).status,200);
  await command({type:'join',name:'Quỳnh Windows'});
  await command({type:'costume',skin:'pink'});
  let state=await snapshot();
  const player=state.players.find(p=>p.id===state.selectedId);
  assert.equal(player.name,'Quỳnh Windows');
  assert.equal(player.skin,'pink');
  assert.equal(state.players.length,10);
  for(const [gift,action] of Object.entries({rose:'camera',tiktok:'swap',icecream:'walk',doughnut:'fly',pair:'pair',crown:'crown',jump:'jump',wukong:'wukong',wings:'wings',ice_wings:'ice_wings',fire_wings:'fire_wings',galaxy_wings:'galaxy_wings',storm_wings:'storm_wings',phoenix_fly:'phoenix_fly'})){
    await command({type:'skip'});
    await command({type:'gift',gift,count:1});
    state=await snapshot();
    assert.equal(state.active.action,action);
    assert.equal(state.active.userId,player.id);
  }
  assert.equal(state.totalGifts,14);
  const vip=state.players.find(p=>p.id===player.id);assert.equal(vip.aura,'gold');assert.ok(vip.prestige>0);
  await command({type:'camera',mode:'wide'});await command({type:'populate',count:100});
  state=await snapshot();assert.equal(state.cameraMode,'wide');assert.equal(state.players.length,100);
  await command({type:'camera',mode:'tour'});assert.equal((await snapshot()).cameraMode,'tour');
  const png=await fs.readFile(path.join(folder,'dist/assets/animal-crew.png'));
  const upload=await fetch(base+'/api/stickers?name=Local%20Sticker',{method:'POST',body:png});assert.equal(upload.status,201);
  const {item}=await upload.json();assert.match(item.id,/^custom_/);assert.equal((await fetch(base+'/assets/'+item.file)).status,200);
  state=await snapshot();assert.equal(state.customCast.length,1);assert.equal(state.players.find(p=>p.id===state.selectedId).skin,item.id);
  const badSticker=await fetch(base+'/api/stickers?name=bad',{method:'POST',body:'invalid image'});assert.equal(badSticker.status,400);
  const forbidden=await fetch(base+'/api/command',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({type:'reset'})});
  assert.equal(forbidden.status,403);

  const conflict=spawn(process.execPath,[path.join(folder,'server.mjs'),'--no-open'],options);
  let conflictOutput='';
  conflict.stderr.on('data',data=>conflictOutput+=data.toString());
  conflict.stdout.resume();
  const [code]=await once(conflict,'exit');
  assert.equal(code,1);
  assert.match(conflictOutput,/đang được dùng/);
  assert.equal((await snapshot()).totalGifts,14);
});
