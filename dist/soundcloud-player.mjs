let sdkPromise;
function loadSDK(){
  if(window.SC?.Widget)return Promise.resolve(window.SC);
  return sdkPromise??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://w.soundcloud.com/player/api.js';script.onload=()=>resolve(window.SC);script.onerror=()=>{sdkPromise=null;script.remove();reject(Error('Chưa tải được SoundCloud. Kiểm tra mạng rồi tải lại trang.'));};document.head.append(script);});
}
export async function post(url,data){const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw Error(result.error||'Không lưu được thay đổi.');return result;}
export const timeLabel=ms=>{const s=Math.floor((ms||0)/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};

export class SoundCloudPlayer{
  constructor(container,onError=()=>{}){this.container=container;this.onError=onError;this.clientId=crypto.randomUUID();this.state=null;this.widget=null;this.ready=false;this.url=null;this.generation=0;this.appliedRevision=-1;this.lastProgress=0;this.lastPosition=0;this.startedAt=0;this.playing=false;this.timer=null;}
  async update(state){
    if(!state)return;this.state=state;
    if(this.url!==state.url){this.url=state.url;await this.build(state.url);return;}
    this.apply();
  }
  async build(url){
    const generation=++this.generation;clearTimeout(this.timer);this.widget=null;this.ready=false;this.playing=false;this.appliedRevision=-1;this.container.replaceChildren();
    if(!url){const empty=document.createElement('div');empty.className='music-empty';empty.textContent='Dán link SoundCloud để mở trình phát.';this.container.append(empty);return;}
    const frame=document.createElement('iframe');frame.title='Trình phát SoundCloud';frame.allow='autoplay';frame.height='166';frame.width='100%';frame.src='https://w.soundcloud.com/player/?'+new URLSearchParams({url,auto_play:'false',color:'#b7f270',hide_related:'true',show_comments:'false',show_reposts:'false',show_teaser:'false',visual:'false'});this.container.append(frame);
    try{
      const SC=await loadSDK();if(generation!==this.generation)return;const widget=this.widget=SC.Widget(frame);
      const alive=fn=>(...args)=>{if(generation===this.generation)fn(...args);};
      widget.bind(SC.Widget.Events.READY,alive(()=>{this.ready=true;this.apply();}));
      widget.bind(SC.Widget.Events.PLAY,alive(()=>{
        if(!this.isOwner||!this.state.playing){widget.pause();return;}this.playing=true;clearTimeout(this.timer);
        const revision=this.state.revision;
        widget.getCurrentSoundIndex(index=>{if(generation===this.generation)this.soundIndex=index;});
        widget.getCurrentSound(sound=>{if(generation===this.generation)widget.getPosition(positionMs=>{if(generation===this.generation&&revision===this.state?.revision){this.lastPosition=positionMs;this.report('playing',{title:sound?.title||'',artist:sound?.user?.username||'',positionMs});}});});
      }));
      // Playlist transitions emit a brief PAUSE before the next track's PLAY.
      // Check the settled widget state before turning that into a transport pause.
      widget.bind(SC.Widget.Events.PAUSE,alive(()=>{const revision=this.state?.revision;setTimeout(()=>{if(generation!==this.generation||revision!==this.state?.revision||!this.isOwner||!this.playing)return;widget.isPaused(paused=>{if(paused&&generation===this.generation&&revision===this.state?.revision){this.playing=false;this.report(this.state.playing&&this.lastPosition<250&&Date.now()-this.startedAt<8000?'blocked':'paused');}});},350);}));
      widget.bind(SC.Widget.Events.PLAY_PROGRESS,alive(event=>{this.lastPosition=event.currentPosition;if(this.isOwner&&Date.now()-this.lastProgress>3000){this.lastProgress=Date.now();this.report('progress',{positionMs:event.currentPosition});}}));
      widget.bind(SC.Widget.Events.SEEK,alive(event=>this.report('progress',{positionMs:event.currentPosition})));
      widget.bind(SC.Widget.Events.FINISH,alive(()=>{if(!this.isOwner)return;if(this.state.loop){this.lastPosition=0;this.startedAt=Date.now();widget.skip(this.soundIndex||0);widget.seekTo(0);widget.play();}else{const revision=this.state.revision;widget.getSounds(sounds=>widget.getCurrentSoundIndex(index=>{if(generation===this.generation&&revision===this.state?.revision&&this.isOwner&&index>=sounds.length-1){this.playing=false;this.report('ended');}}));}}));
      widget.bind(SC.Widget.Events.ERROR,alive(()=>{this.playing=false;clearTimeout(this.timer);this.report('error');this.onError('SoundCloud không tải được bài. Kiểm tra link hoặc chọn bài khác.');}));
    }catch(error){this.onError(error.message);}
  }
  get isOwner(){return this.state?.ownerId===this.clientId;}
  apply(){
    if(!this.widget||!this.ready||!this.state)return;
    const state=this.state;this.widget.setVolume(state.volume);
    if(!this.isOwner||!state.playing){this.widget.pause();clearTimeout(this.timer);return;}
    if(this.appliedRevision===state.revision)return;
    this.appliedRevision=state.revision;this.startedAt=Date.now();this.lastPosition=state.positionMs||0;
    if(state.action==='next')this.widget.next();
    if(state.action==='prev')this.widget.prev();
    this.widget.play();clearTimeout(this.timer);
    this.timer=setTimeout(()=>{if(this.isOwner&&this.state.playing&&!this.playing)this.report('blocked');},8000);
  }
  async transport(action){
    const result=await post('/api/music/command',{action,clientId:this.clientId});
    await this.update(result.music);
  }
  report(status,extra={}){
    if(!this.isOwner)return;
    post('/api/music/report',{clientId:this.clientId,revision:this.state.revision,status,...extra}).catch(error=>this.onError(error.message));
  }
}
