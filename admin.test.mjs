import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {RoomEngine,defaultGiftRules,validateGiftRules} from './dist/room-core.mjs';
import {defaultConfig,soundCloudUrl,soundCloudEmbedUrl,validateMusic} from './dist/admin-config.mjs';
import {SoundCloudPlayer} from './dist/soundcloud-player.mjs';
import {createAdminStore} from './admin-store.mjs';
import {MusicHub} from './music-hub.mjs';

test('gift remapping preserves the active scene, accepts external IDs and disables future events',()=>{
  const room=new RoomEngine(),user={id:'viewer',name:'Quỳnh'};
  room.receive({gift:'rose',user});room.tick(10);assert.equal(room.active.action,'camera');
  const rules=defaultGiftRules();Object.assign(rules[0],{effect:'wings',externalId:'999',name:'Quà VIP'});rules.push({key:'custom_dance',name:'Nhảy mới',effect:'jump',enabled:true,externalId:'1000'});room.setGiftRules(rules);
  assert.equal(room.active.action,'camera');assert.equal(room.players.length,1);
  assert.equal(room.receive({giftId:999,user}).ok,true);assert.equal(room.queue[0].action,'wings');assert.equal(room.queue[0].giftName,'Quà VIP');assert.equal(room.players[0].aura,'gold');
  assert.equal(room.receive({giftId:1000,user}).ok,true);assert.equal(room.queue[1].action,'jump');
  rules[0].enabled=false;room.setGiftRules(rules);assert.equal(room.receive({gift:'rose',user}).reason,'gift_disabled');
  room.reset();assert.equal(room.receive({gift:'rose',user}).reason,'gift_disabled');assert.equal(room.receive({gift:'constructor',user}).reason,'unknown_gift');
});

test('config validation rejects ambiguous mappings and non-SoundCloud URLs',()=>{
  const rules=defaultGiftRules();rules[0].externalId='123';rules[1].externalId='123';assert.throws(()=>validateGiftRules(rules),/không trùng/);
  rules[1].externalId='';rules[0].effect='arbitrary';assert.throws(()=>validateGiftRules(rules),/Hiệu ứng/);
  assert.equal(soundCloudUrl('https://www.soundcloud.com/forss/flickermood?utm_source=test'),'https://soundcloud.com/forss/flickermood');
  assert.equal(soundCloudUrl(''),'');
  for(const url of ['https://soundcloud.com.evil.test/a/b','http://soundcloud.com/a/b','https://soundcloud.com:444/a/b','https://evil@soundcloud.com/a/b','https://on.soundcloud.com/abc','javascript:alert(1)'])assert.throws(()=>soundCloudUrl(url));
  assert.throws(()=>validateMusic({...defaultConfig().music,volume:101}));
});

test('admin settings persist atomically and concurrent saves keep both sections',async t=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'neon-admin-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
  const store=await createAdminStore(folder),music={url:'https://soundcloud.com/forss/flickermood',volume:35,loop:true,target:'obs'},gifts=defaultGiftRules();gifts[0].effect='jump';
  await Promise.all([store.save({music}),store.save({gifts})]);const reloaded=await createAdminStore(folder);
  assert.deepEqual(reloaded.config.music,music);assert.equal(reloaded.config.gifts[0].effect,'jump');
  await assert.rejects(store.save({music:{...music,volume:-1}}));assert.deepEqual((await createAdminStore(folder)).config,reloaded.config);
  assert.equal(Object.hasOwn(JSON.parse(await fs.readFile(path.join(folder,'admin-config.json'))),'playing'),false);
});

test('SoundCloud sources resolve related-track links and official embeds without accepting discovery pages',()=>{
  const related='https://soundcloud.com/discover/sets/personalized-tracks::listener:123456';
  assert.equal(soundCloudUrl(related),related);
  assert.equal(soundCloudEmbedUrl(related),'https://api.soundcloud.com/tracks/123456');
  assert.equal(soundCloudEmbedUrl(related.replaceAll(':','%3A').replace('https%3A','https:')),'https://api.soundcloud.com/tracks/123456');
  const api='https://api.soundcloud.com/playlists/123456?secret_token=s-private';
  assert.equal(soundCloudUrl('https://w.soundcloud.com/player/?'+new URLSearchParams({url:api,auto_play:'true'})),api);
  const urn='https://api.soundcloud.com/tracks/soundcloud%3Atracks%3A123456';
  assert.equal(soundCloudUrl('https://w.soundcloud.com/player/?'+new URLSearchParams({url:urn})),urn);
  assert.equal(soundCloudEmbedUrl('https://m.soundcloud.com/artist/song?secret_token=s-private&utm_source=share'),'https://soundcloud.com/artist/song?secret_token=s-private');
  for(const url of ['https://soundcloud.com/discover/sets/chill','https://soundcloud.com/listener/likes','https://soundcloud.com/search/sounds','https://api.soundcloud.com/users/123','https://api.soundcloud.com/tracks/soundcloud:playlists:123456','https://w.soundcloud.com/player/?url=https://evil.test/song'])assert.throws(()=>soundCloudUrl(url));
});

function widgetHarness(t,{sounds=[{title:'A track'}]}={}){
  const originals=new Map(['window','document','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const listeners={},requests=[],children=[];let plays=0,command;
  const widget={bind:(event,fn)=>listeners[event]=fn,getSounds:cb=>cb(sounds),setVolume:()=>{},play:()=>{plays++;},pause:()=>{},getCurrentSoundIndex:cb=>cb(0),getCurrentSound:cb=>cb({title:'A track',user:{username:'Artist'}}),getPosition:cb=>cb(3250)};
  const Widget=()=>widget;Widget.Events=Object.fromEntries(['READY','PLAY','PAUSE','PLAY_PROGRESS','SEEK','FINISH','ERROR'].map(key=>[key,key]));
  globalThis.window={SC:{Widget}};globalThis.document={createElement:tag=>({tag}),head:{append:()=>{}}};
  globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);requests.push({url,...body});return command&&url==='/api/music/command'?command(body):{ok:true,json:async()=>({ok:true})};};
  const player=new SoundCloudPlayer({replaceChildren:()=>{children.length=0;},append:child=>children.push(child)});
  t.after(()=>{clearTimeout(player.timer);clearTimeout(player.loadTimer);for(const [key,descriptor] of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  return {player,listeners,requests,children,plays:()=>plays,command:fn=>command=fn,setSounds:value=>sounds=value};
}
const testMusic=(extra={})=>({...defaultConfig().music,url:'https://soundcloud.com/artist/song',revision:1,playing:false,ownerId:null,action:'load',positionMs:0,...extra});

test('widget rejects empty data as a load error and recovers after changing the source',async t=>{
  const h=widgetHarness(t,{sounds:[]}),{player,listeners,requests,children}=h;
  await player.update(testMusic({url:'https://soundcloud.com/discover/sets/personalized-tracks::listener:123456',ownerId:player.clientId,playing:true}));
  assert.equal(new URL(children[0].src).searchParams.get('url'),'https://api.soundcloud.com/tracks/123456');
  listeners.READY();assert.equal(player.ready,false);assert.ok(player.loadError);assert.equal(requests.at(-1).status,'error');assert.equal(h.plays(),0);
  player.apply();assert.equal(requests.filter(r=>r.status==='error').length,1);
  h.setSounds([{title:'A track'}]);await player.update(testMusic({revision:2,ownerId:player.clientId,playing:true}));assert.equal(player.loadError,'');assert.equal(player.ready,false);
  listeners.READY();assert.equal(player.ready,true);assert.equal(h.plays(),1);
});

test('pressing Play inside the widget claims the configured receiver and reports actual playback',async t=>{
  const h=widgetHarness(t),{player,listeners,requests}=h;
  h.command(body=>({ok:true,json:async()=>({music:testMusic({revision:2,playing:true,ownerId:body.clientId,action:'play'})})}));
  await player.update(testMusic());listeners.READY();await listeners.PLAY();
  assert.equal(player.isOwner,true);assert.equal(player.playing,true);assert.equal(requests.filter(r=>r.url==='/api/music/command').length,1);
  assert.equal(requests.at(-1).status,'playing');assert.equal(requests.at(-1).title,'A track');assert.equal(requests.at(-1).positionMs,3250);
});

test('transport sends widget play during the click and ignores an older server response after pause',async t=>{
  const h=widgetHarness(t),{player,listeners}=h;let respond;
  h.command(()=>new Promise(resolve=>respond=resolve));
  await player.update(testMusic());listeners.READY();const playing=player.transport('play');assert.equal(h.plays(),1);
  await player.update(testMusic({revision:3,action:'pause'}));
  respond({ok:true,json:async()=>({music:testMusic({revision:2,playing:true,ownerId:player.clientId,action:'play'})})});await playing;
  assert.equal(player.state.revision,3);assert.equal(player.state.playing,false);assert.equal(h.plays(),1);
});

test('an admin widget cannot steal playback assigned to OBS and widget errors cancel the blocked timer',async t=>{
  const h=widgetHarness(t),{player,listeners,requests}=h;
  await player.update(testMusic({target:'obs',playing:true,ownerId:'obs-first'}));listeners.READY();await listeners.PLAY();assert.equal(requests.length,0);
  await player.update(testMusic({revision:2,playing:true,ownerId:player.clientId}));assert.ok(player.timer);
  listeners.ERROR();assert.equal(player.ready,false);assert.ok(player.loadError);assert.equal(requests.at(-1).status,'error');
});

test('music transport has one owner, rejects stale reports and pauses when its receiver closes',()=>{
  const hub=new MusicHub({...defaultConfig().music,url:'https://soundcloud.com/forss/flickermood'});
  hub.connect('admin-first','admin');hub.connect('admin-second','admin');hub.connect('obs-first','obs');hub.connect('obs-second','obs');
  hub.command({action:'play',clientId:'admin-first'});const revision=hub.state.revision;
  hub.report({clientId:'admin-first',revision,status:'blocked'});assert.equal(hub.state.playing,true);assert.equal(hub.state.status,'blocked');
  assert.equal(hub.state.ownerId,'admin-first');assert.equal(hub.report({clientId:'admin-second',revision,status:'playing'}),false);
  hub.command({action:'play',clientId:'admin-second'});assert.equal(hub.report({clientId:'admin-first',revision,status:'playing'}),false);assert.equal(hub.state.ownerId,'admin-second');
  hub.configure({...hub.config,volume:20});assert.equal(hub.state.ownerId,'admin-second');assert.equal(hub.state.playing,true);
  hub.configure({...hub.config,target:'obs'});assert.equal(hub.state.playing,false);hub.command({action:'play',clientId:'admin-first'});assert.equal(hub.state.ownerId,'obs-first');
  hub.disconnect('obs-second');assert.equal(hub.state.playing,true);hub.disconnect('obs-first');assert.equal(hub.state.playing,false);assert.equal(hub.state.ownerId,null);
  assert.throws(()=>hub.command({action:'play',clientId:'admin-first'}),/Chưa có nguồn/);
  hub.configure({...hub.config,target:'admin'});hub.command({action:'play',clientId:'admin-first'});hub.command({action:'pause',clientId:'admin-first'});
  assert.equal(hub.report({clientId:'admin-first',revision:hub.state.revision,status:'playing'}),false);assert.equal(hub.state.playing,false);
});

test('admin HTTP endpoints save mappings, block foreign writes and retain settings after restart',{timeout:20000},async t=>{
  const root=path.dirname(fileURLToPath(import.meta.url)),folder=await fs.mkdtemp(path.join(os.tmpdir(),'Neon Admin Source '));
  for(const name of ['dist','server.mjs','sticker-store.mjs','admin-store.mjs','music-hub.mjs','tiktok-live.mjs','tiktok-game.mjs'])await fs.cp(path.join(root,name),path.join(folder,name),{recursive:true});
  const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));const base=`http://127.0.0.1:${port}`;
  let child;const streams=[];
  async function stop(){if(child?.exitCode===null){const ended=once(child,'exit');child.kill('SIGTERM');await ended;}}
  t.after(async()=>{streams.forEach(a=>a.abort());await stop();await fs.rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:200});});
  async function start(){const env={...process.env,NEON_ROOM_PORT:String(port)};delete env.NEON_ROOM_RESUME;child=spawn(process.execPath,[path.join(folder,'server.mjs'),'--no-open'],{env});child.stdout.resume();let error='';child.stderr.on('data',d=>error+=d);for(let i=0;i<60;i++){if(child.exitCode!==null)throw Error(error);try{if((await fetch(base+'/api/status',{signal:AbortSignal.timeout(200)})).ok)return;}catch{}await delay(75);}throw Error('Server did not start: '+error);}
  async function send(endpoint,body,headers={}){return fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});}
  const get=async()=>await(await fetch(base+'/api/admin/state')).json();
  await start();assert.equal((await fetch(base+'/admin.html')).status,200);assert.equal((await fetch(base+'/music.html')).status,200);
  assert.equal((await fetch(base+'/song',{redirect:'manual'})).status,302);
  assert.equal((await send('/api/tiktok/settings',{username:'quynh_test'},{Origin:'https://evil.test'})).status,403);
  assert.equal((await send('/api/tiktok/connect',{})).status,400);
  assert.equal((await send('/api/tiktok/settings',{username:'https://www.tiktok.com/@quynh_test/live',signApiKey:'private-http-test-key'})).status,200);
  const safe=await get();assert.equal(safe.tiktok.config.keyConfigured,true);assert.equal(safe.tiktok.config.username,'quynh_test');assert.doesNotMatch(JSON.stringify(safe),/private-http-test-key|signApiKey/);
  const malformed=await fetch(base+'/api/tiktok/settings',{method:'POST',body:'{"signApiKey":"private-http-test-key"'});assert.equal(malformed.status,400);assert.doesNotMatch(await malformed.text(),/private-http-test-key/);
  const music={url:'https://soundcloud.com/forss/flickermood',volume:42,loop:true,target:'admin'};
  assert.equal((await send('/api/admin/music',music,{Origin:'https://evil.test'})).status,403);
  assert.equal((await send('/api/admin/music',music)).status,200);
  const rules=defaultGiftRules();rules[0].effect='jump';rules[0].name='Hoa nhảy';assert.equal((await send('/api/admin/gifts',rules)).status,200);
  assert.equal((await send('/api/command',{type:'gift',gift:'rose',count:1})).status,200);assert.equal((await get()).active.action,'jump');
  await t.test('manual demo comments, hearts and gifts use the same game rules without a TikTok connection',async()=>{
    assert.equal((await send('/api/demo/event',{type:'chat',name:'Quỳnh thử',comment:'vào'},{Origin:'https://evil.test'})).status,403);
    assert.equal((await send('/api/demo/event',{type:'chat',name:'Quỳnh thử',comment:'vào'})).status,200);
    let demo=await get();const person=demo.players.find(p=>p.name==='Quỳnh thử');assert.ok(person);assert.equal(demo.tiktok.status,'idle');assert.equal(demo.demoActivity.stats.comments,1);
    assert.equal((await send('/api/demo/event',{type:'like',playerId:person.id,count:20})).status,200);
    demo=await get();assert.equal(demo.totalGifts,1);assert.equal(demo.demoActivity.stats.likes,20);assert.ok(demo.queue.some(e=>e.action==='jump'&&e.userId===person.id));
    assert.equal((await send('/api/demo/event',{type:'gift',playerId:person.id,gift:'rose',count:5})).status,200);
    demo=await get();assert.equal(demo.totalGifts,6);assert.equal(demo.players.find(p=>p.id===person.id).gifts,5);assert.equal(demo.players.filter(p=>p.name==='Quỳnh thử').length,1);assert.equal(demo.demoActivity.events[0].type,'gift');assert.equal(demo.roomMode,'demo');assert.equal(demo.tiktok.status,'idle');
    assert.equal((await send('/api/demo/event',{type:'gift',name:'A',gift:'missing',count:1})).status,400);
    assert.equal((await send('/api/demo/event',{type:'like',name:'A',count:-1})).status,400);
    assert.equal((await send('/api/tiktok/demo',{})).status,200);assert.equal((await get()).autoDemo,false);
  });
  const controller=new AbortController();streams.push(controller);const stream=await fetch(base+'/api/stream?clientId=admin-test&role=admin',{signal:controller.signal});await stream.body.getReader().read();
  assert.equal((await send('/api/music/command',{action:'play',clientId:'admin-test'})).status,200);let state=await get();assert.equal(state.music.ownerId,'admin-test');
  assert.equal((await send('/api/music/report',{clientId:'wrong-owner',revision:state.music.revision,status:'playing'})).status,200);assert.equal((await get()).music.status,'starting');
  controller.abort();await stop();await start();state=await get();assert.equal(state.tiktok.config.keyConfigured,true);assert.equal(state.tiktok.status,'idle');assert.doesNotMatch(JSON.stringify(state),/private-http-test-key|signApiKey/);assert.equal(state.giftRules[0].effect,'jump');assert.equal(state.music.url,music.url);assert.equal(state.music.volume,42);assert.equal(state.music.playing,false);assert.equal(state.music.ownerId,null);
});
