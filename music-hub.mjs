export class MusicHub{
  constructor(config){this.config=config;this.clients=new Map();this.state={revision:0,playing:false,ownerId:null,action:'pause',positionMs:0,title:'',artist:'',status:'idle',error:''};}
  connect(id,role){if(!/^[a-zA-Z0-9-]{8,80}$/.test(id)||!['admin','obs'].includes(role))return false;this.clients.set(id,role);return true;}
  disconnect(id){this.clients.delete(id);if(this.state.ownerId===id){Object.assign(this.state,{playing:false,ownerId:null,action:'pause',status:'disconnected',error:'Cửa sổ phát nhạc đã đóng. Bấm Phát để chọn lại nơi phát.'});this.state.revision++;}}
  snapshot(){return {...this.config,...this.state,receivers:{admin:[...this.clients.values()].filter(v=>v==='admin').length,obs:[...this.clients.values()].filter(v=>v==='obs').length}};}
  configure(config){const changed=config.url!==this.config.url||config.target!==this.config.target;this.config=config;if(changed)Object.assign(this.state,{revision:this.state.revision+1,playing:false,ownerId:null,action:'load',positionMs:0,title:'',artist:'',status:config.url?'ready':'idle',error:''});}
  command({action,clientId}){
    if(!this.clients.has(clientId))throw Error('Trang đang kết nối lại. Thử lại sau một giây.');
    if(!['play','pause','next','prev'].includes(action))throw Error('Lệnh nhạc không hợp lệ.');
    if(action==='pause'){Object.assign(this.state,{playing:false,action,status:'paused',error:''});this.state.revision++;return;}
    if(!this.config.url)throw Error('Lưu link bài hát hoặc playlist trước khi phát.');
    const owner=this.config.target==='admin'?(this.clients.get(clientId)==='admin'?clientId:null):[...this.clients].find(([,role])=>role==='obs')?.[0];
    if(!owner)throw Error(this.config.target==='obs'?'Chưa có nguồn nhạc OBS. Thêm link Nguồn nhạc OBS vào Browser Source trước.':'Chọn phát tại trang admin để nghe ở cửa sổ này.');
    Object.assign(this.state,{ownerId:owner,playing:true,action,status:'starting',error:''});this.state.revision++;
  }
  report(data){
    if(data.clientId!==this.state.ownerId||data.revision!==this.state.revision||!this.clients.has(data.clientId))return false;
    if(data.status==='playing'&&!this.state.playing)return false;
    if(!['playing','paused','ended','error','blocked','progress'].includes(data.status))throw Error('Trạng thái nhạc không hợp lệ.');
    if(Number.isFinite(data.positionMs))this.state.positionMs=Math.max(0,Math.min(data.positionMs,86400000));
    for(const key of ['title','artist'])if(typeof data[key]==='string')this.state[key]=data[key].replace(/[\u0000-\u001f]/g,'').slice(0,160);
    if(data.status==='progress')return true;
    this.state.status=data.status;
    if(data.status==='playing')this.state.playing=true;
    if(['paused','ended','error'].includes(data.status))this.state.playing=false;
    this.state.error=data.status==='error'?'SoundCloud không phát được bài này. Kiểm tra link, quyền truy cập hoặc chọn bài khác.':data.status==='blocked'?'Bấm Play trên trình phát SoundCloud bên dưới để cho phép âm thanh.':'';
    return true;
  }
}
