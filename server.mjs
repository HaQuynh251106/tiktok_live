import http from 'node:http';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStickerStore,MAX_STICKER_BYTES} from './sticker-store.mjs';
import {createAdminStore} from './admin-store.mjs';
import {MusicHub} from './music-hub.mjs';
import {RoomEngine,SKINS,MAX_PLAYERS,registerSkin} from './dist/room-core.mjs';
import {createLiveStore,TikTokLiveService} from './tiktok-live.mjs';
import {TikTokGameAdapter} from './tiktok-game.mjs';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const stickerStore=createStickerStore(root);
await stickerStore.load();stickerStore.catalog.forEach(item=>registerSkin(item.id));
const adminStore=await createAdminStore(path.join(path.dirname(root),'data'));
const music=new MusicHub(adminStore.config.music);
let room=new RoomEngine(adminStore.config.gifts);
const demoRoom=room;
let liveRoom=null,liveRoomId='',liveAdapter=null,roomMode='demo';
const names=['Minh Anh','Mèo Mướp','Khánh','Linh','Hoàng','Bảo Ngọc','Cá Con','Mây','Bắp'];
names.forEach(n=>room.addPlayer(n));
let theme='violet',cameraMode='auto',autoDemo=false,roomEpoch=Date.now(),serial=0,lastAuto=Date.now(),lastRevision=-1,announcement=null;
// A local upgrade can resume the existing demo room without discarding viewers.
if(process.env.NEON_ROOM_RESUME){
  const saved=JSON.parse(await fs.readFile(process.env.NEON_ROOM_RESUME,'utf8'));
  if(Array.isArray(saved.players)&&saved.players.length<=MAX_PLAYERS){
    for(const key of ['players','logs','totalGifts','selectedId','counter'])if(saved[key]!==undefined)room[key]=saved[key];
    room.players.forEach((p,i)=>{if(!SKINS.includes(p.skin))p.skin=p.skin==='chick'?'pink':p.skin==='frog'?'cat':SKINS[i%SKINS.length];});
    if(['violet','mint','sunset'].includes(saved.theme))theme=saved.theme;
    if(['auto','wide','close','tour'].includes(saved.cameraMode))cameraMode=saved.cameraMode;
    room.revision++;
  }
}
const clients=new Set();
const receiverStreams=new Map();
const liveStore=await createLiveStore(path.join(path.dirname(root),'data'));
const live=new TikTokLiveService({store:liveStore,onChange:broadcast,onConnected(roomId){
  if(!liveRoom||liveRoomId!==roomId){liveRoomId=roomId;liveRoom=new RoomEngine(adminStore.config.gifts);liveAdapter=new TikTokGameAdapter({room:()=>liveRoom,config:()=>liveStore.config,announce:text=>{announcement={text,expiresAt:Date.now()+6500};},changed:broadcast});}
  if(room!==liveRoom)roomEpoch=Date.now();room=liveRoom;roomMode='live';autoDemo=false;
},onEvent(event){liveAdapter?.receive(event);room.tick(Date.now()/1000);broadcast();}});
const port=Number(process.env.NEON_ROOM_PORT||8790);
if(!Number.isInteger(port)||port<1||port>65535){console.error('NEON_ROOM_PORT phải là số nguyên từ 1 đến 65535.');process.exit(1);}
function snapshot(){return {players:room.players,queue:room.queue,active:room.active,logs:room.logs,totalGifts:room.totalGifts,selectedId:room.selectedId,counter:room.counter,revision:room.revision,theme,cameraMode,customCast:stickerStore.catalog,autoDemo,roomEpoch,announcement,giftRules:adminStore.config.gifts,music:music.snapshot(),roomMode,tiktok:live.snapshot(),liveActivity:liveAdapter?.snapshot()||null};}
function broadcast(){const message=`data: ${JSON.stringify(snapshot())}\n\n`;for(const res of clients)res.write(message);}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function reset(){room.reset();names.forEach(n=>room.addPlayer(n));autoDemo=false;roomEpoch=Date.now();serial=0;}
function gift(kind,count){const p=room.selected;if(!p)return {ok:false,reason:'missing_user'};const result=room.receive({id:`local-${roomEpoch}-${++serial}`,gift:kind,repeatCount:count,streakId:`test-${serial}`,user:{id:p.id,name:p.name}});if(result.ok)announcement={text:`${p.name} tặng ${room.getGiftSpec(kind).giftName} ×${count}`,expiresAt:Date.now()+6500};return result;}
function command(cmd){
  if(roomMode==='live'&&['gift','populate','auto','reset','join'].includes(cmd.type))return {ok:false,reason:'live_mode',message:'Đang dùng phòng LIVE thật. Bấm Thử không cần LIVE để dùng quà và người mẫu.'};
  switch(cmd.type){
    case 'join':{if(typeof cmd.name!=='string'||!cmd.name.trim())return {ok:false,reason:'missing_name'};const p=room.addPlayer(cmd.name);if(!p)return {ok:false,reason:'room_full'};room.select(p.id);announcement={text:`${p.name} vừa vào sàn ✦`,expiresAt:Date.now()+6500};break;}
    case 'select':room.select(cmd.id);break;
    case 'shuffle':room.shuffle();break;
    case 'costume':room.costume(cmd.skin);break;
    case 'populate':if(!Number.isInteger(cmd.count)||cmd.count<1||cmd.count>MAX_PLAYERS)return {ok:false,reason:'invalid_count'};room.populate(cmd.count);break;
    case 'camera':if(!['auto','wide','close','tour'].includes(cmd.mode))return {ok:false,reason:'invalid_camera'};cameraMode=cmd.mode;room.revision++;break;
    case 'gift':return gift(cmd.gift,cmd.count);
    case 'skip':room.skip();break;
    case 'theme':if(!['violet','mint','sunset'].includes(cmd.theme))return {ok:false,reason:'invalid_theme'};theme=cmd.theme;room.revision++;break;
    case 'auto':autoDemo=!!cmd.enabled;lastAuto=Date.now();room.revision++;break;
    case 'reset':reset();announcement={text:'Phòng mới đã sẵn sàng ✦',expiresAt:Date.now()+6500};break;
    default:return {ok:false,reason:'unknown_command'};
  }
  return {ok:true};
}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.json':'application/json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host)){res.writeHead(403);res.end('Local access only');return;}
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(req.method==='GET'&&url.pathname==='/api/status'){json(res,200,{service:'neon-room',mode:roomMode==='live'?'live':'simulation',players:room.players.length});return;}
  if(req.method==='GET'&&url.pathname==='/api/admin/state'){json(res,200,snapshot());return;}
  if(req.method==='GET'&&url.pathname==='/song'){res.writeHead(302,{Location:'/?overlay=1'});res.end();return;}
  if(req.method==='GET'&&url.pathname==='/api/stream'){
    const clientId=url.searchParams.get('clientId'),role=url.searchParams.get('role');
    if(music.connect(clientId||'',role)){receiverStreams.get(clientId)?.end();receiverStreams.set(clientId,res);}
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(`data: ${JSON.stringify(snapshot())}\n\n`);clients.add(res);broadcast();req.on('close',()=>{clients.delete(res);if(receiverStreams.get(clientId)===res){receiverStreams.delete(clientId);music.disconnect(clientId);broadcast();}});return;
  }
  if(req.method==='POST'&&['/api/tiktok/settings','/api/tiktok/connect','/api/tiktok/disconnect','/api/tiktok/demo'].includes(url.pathname)){
    if(req.headers.origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(req.headers.origin)){json(res,403,{error:'Origin không được phép.'});return;}
    try{
      let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>4096){json(res,413,{error:'Dữ liệu quá lớn.'});return;}parts.push(part);}
      let data;try{data=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');}catch{throw Error('Dữ liệu JSON không hợp lệ.');}
      if(url.pathname==='/api/tiktok/settings'){
        if(live.enabled&&((data.username!==undefined&&data.username!==liveStore.config.username)||data.signApiKey||data.clearKey))throw Error('Bấm Ngắt trước khi đổi tài khoản hoặc khoá ký.');
        await liveStore.save(data);
      }
      if(url.pathname==='/api/tiktok/connect')await live.start(data);
      if(url.pathname==='/api/tiktok/disconnect')await live.disconnect();
      if(url.pathname==='/api/tiktok/demo'){await live.disconnect('Đang thử game, không nhận tương tác TikTok.');room=demoRoom;roomMode='demo';autoDemo=true;lastAuto=Date.now();roomEpoch=Date.now();}
      broadcast();json(res,200,{ok:true,tiktok:live.snapshot(),roomMode});
    }catch(error){json(res,400,{error:error.message||'Cài đặt TikTok không hợp lệ.'});}return;
  }
  if(req.method==='POST'&&['/api/admin/music','/api/admin/gifts','/api/music/command','/api/music/report'].includes(url.pathname)){
    if(req.headers.origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(req.headers.origin)){json(res,403,{error:'Origin không được phép.'});return;}
    try{
      let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>32768){json(res,413,{error:'Dữ liệu quá lớn.'});return;}parts.push(part);}
      const data=JSON.parse(Buffer.concat(parts).toString('utf8'));let accepted=true;
      if(url.pathname==='/api/admin/music'){await adminStore.save({music:data});music.configure(adminStore.config.music);}
      if(url.pathname==='/api/admin/gifts'){await adminStore.save({gifts:data});demoRoom.setGiftRules(adminStore.config.gifts);liveRoom?.setGiftRules(adminStore.config.gifts);}
      if(url.pathname==='/api/music/command')music.command(data);
      if(url.pathname==='/api/music/report')accepted=music.report(data);
      if(accepted)broadcast();json(res,200,{ok:true,accepted,music:music.snapshot(),giftRules:adminStore.config.gifts});
    }catch(error){json(res,400,{error:error.message||'Dữ liệu không hợp lệ.'});}return;
  }
  if(req.method==='POST'&&url.pathname==='/api/stickers'){
    if(req.headers.origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(req.headers.origin)){json(res,403,{error:'Origin không được phép.'});return;}
    let size=0;const parts=[];
    try{for await(const part of req){size+=part.length;if(size>MAX_STICKER_BYTES){json(res,413,{error:'Sticker tối đa 8 MB.'});return;}parts.push(part);}
      const item=await stickerStore.add(Buffer.concat(parts),url.searchParams.get('name'));registerSkin(item.id);room.costume(item.id);room.revision++;broadcast();json(res,201,{ok:true,item});
    }catch(error){json(res,400,{error:error.message});}return;
  }
  if(req.method==='POST'&&['/api/command','/api/event'].includes(url.pathname)){
    if(req.headers.origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(req.headers.origin)){json(res,403,{error:'Origin không được phép.'});return;}
    let size=0,parts=[];
    try{for await(const part of req){size+=part.length;if(size>16384){json(res,413,{error:'Dữ liệu quá lớn.'});return;}parts.push(part);}const data=JSON.parse(Buffer.concat(parts).toString('utf8'));const result=url.pathname==='/api/event'?roomMode==='live'?{ok:false,reason:'live_mode',message:'Phòng LIVE chỉ nhận sự kiện từ kết nối TikTok.'}:room.receive(data):command(data);if(!result.ok){json(res,400,{error:result.message||result.reason});return;}room.tick(Date.now()/1000);broadcast();json(res,200,result);}catch{json(res,400,{error:'Dữ liệu không hợp lệ.'});}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
  const relative=pathname==='/'?'index.html':pathname.slice(1),full=path.resolve(root,relative);
  if(!full.startsWith(root+path.sep)&&full!==path.join(root,'index.html')){res.writeHead(403);res.end();return;}
  try{const data=await fs.readFile(full);res.writeHead(200,{'Content-Type':types[path.extname(full)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('Not found');}
});
const clock=setInterval(()=>{room.tick(Date.now()/1000);if(roomMode==='live')liveAdapter?.flush();if(autoDemo&&Date.now()-lastAuto>6500){lastAuto=Date.now();const enabled=room.giftRules.filter(rule=>rule.enabled);if(enabled.length){room.select(room.players[Math.floor(Math.random()*room.players.length)].id);gift(enabled[Math.floor(Math.random()*enabled.length)].key,1);}}if(room.revision!==lastRevision){lastRevision=room.revision;broadcast();}},80);
const heartbeat=setInterval(()=>{for(const res of clients)res.write(': keepalive\n\n');},15000);
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Cổng ${port} đang được dùng. Đóng phiên Neon Room cũ hoặc đặt NEON_ROOM_PORT sang cổng khác rồi chạy lại.`:e.message);clearInterval(clock);clearInterval(heartbeat);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log(`\nNEON ROOM · Sàn nhảy TikTok LIVE\n\nQuản trị:   http://127.0.0.1:${port}/admin.html#tiktok\nĐiều khiển: http://127.0.0.1:${port}\nNguồn nhạc: http://127.0.0.1:${port}/music.html\nHình lên sóng: http://127.0.0.1:${port}/song\n\nGiữ cửa sổ này mở trong lúc dùng game. Ctrl+C để dừng.\nBắt đầu LIVE trong TikTok LIVE Studio rồi vào mục TikTok LIVE để bấm Nối.\n`);  if(process.argv.includes('--open')&&!process.argv.includes('--no-open'))openBrowser(`http://127.0.0.1:${port}/admin.html#tiktok`);
});
function openBrowser(url){
  const [program,args]=process.platform==='win32'?['rundll32.exe',['url.dll,FileProtocolHandler',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
  execFile(program,args,error=>{if(error)console.error(`Mở trình duyệt và truy cập ${url}`);}).unref();
}
function stop(){clearInterval(clock);clearInterval(heartbeat);live.disconnect();for(const res of clients)res.end();server.close(()=>process.exit(0));}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
