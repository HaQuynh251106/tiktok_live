const $=id=>document.getElementById(id);
export function setupTikTokAdmin({post,feedback,showPanel,readRules,renderRules,setDirty,isGiftsDirty}){
  let dirty=false,signature='',catalogSignature='',state=null,busy=false;
  const form=$('tiktok-form');
  function mark(value){dirty=value;$('tiktok-save-state').textContent=value?'Chưa lưu':'Đã lưu';$('tiktok-save-state').classList.toggle('dirty',value);}
  function values(){return {username:$('tiktok-username').value,joinWord:$('tiktok-join').value,joinOnMember:$('tiktok-members').checked,likesEvery:Number($('tiktok-likes').value),likeEffect:$('tiktok-like-effect').value,followEffect:$('tiktok-follow-effect').value,signApiKey:$('tiktok-key').value,clearKey:$('tiktok-clear-key').checked};}
  function buttons(){const connecting=['connecting','connected','retrying'].includes(state?.tiktok?.status);$('tiktok-connect').disabled=busy||connecting;$('tiktok-disconnect').disabled=busy||!connecting;$('tiktok-demo').disabled=busy;$('tiktok-save').disabled=busy;for(const id of ['tiktok-username','tiktok-key','tiktok-clear-key'])$(id).disabled=connecting;}
  async function action(endpoint,save=false){if(busy)return;$('tiktok-form-error').textContent='';busy=true;buttons();try{const result=await post('/api/tiktok/'+endpoint,save?values():{});if(save){mark(false);signature='';$('tiktok-key').value='';$('tiktok-clear-key').checked=false;}if(state)update({...state,tiktok:result.tiktok,roomMode:result.roomMode});feedback(endpoint==='settings'?'Đã lưu cài đặt TikTok trên máy.':result.tiktok.message);}catch(error){$('tiktok-form-error').textContent=error.message;feedback(error.message,true);}finally{busy=false;buttons();}}
  form.addEventListener('input',()=>mark(true));form.addEventListener('submit',event=>{event.preventDefault();action('settings',true);});
  $('tiktok-connect').addEventListener('click',()=>action('connect',true));$('tiktok-disconnect').addEventListener('click',()=>action('disconnect'));$('tiktok-demo').addEventListener('click',async()=>{await action('demo');showPanel('demo');});
  $('copy-stage-url').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+'/song');feedback('Đã sao chép link hình sân khấu.');}catch{feedback('Sao chép địa chỉ hiển thị bên cạnh nút.',true);}});$('tiktok-stage-url').textContent=location.origin+'/song';
  function mapGift(gift){
    if(isGiftsDirty()){feedback('Lưu bảng quà đang sửa trước khi gán quà vừa nhận.',true);return;}
    const rules=readRules();let rule=rules.find(r=>r.externalId===gift.giftId)||rules.find(r=>r.key===gift.mappedKey);
    if(!rule){if(rules.length>=32){feedback('Bảng đã đủ 32 loại quà. Xoá một quà không dùng trước.',true);return;}rule={key:'tiktok_'+gift.giftId,name:gift.name.slice(0,48),externalId:gift.giftId,coins:gift.coins??0,effect:'camera',enabled:true};rules.push(rule);}else rule.externalId=gift.giftId;
    renderRules(rules);setDirty('gifts');showPanel('gifts');
    const row=[...$('gift-rules').children].find(row=>row.dataset.key===rule.key);row?.scrollIntoView({block:'center',behavior:'smooth'});row?.querySelector('select')?.focus();feedback('Chọn hiệu ứng cho '+gift.name+', rồi bấm Lưu bảng quà.');
  }
  function update(next){
    state=next;const live=state.tiktok;if(!live)return;const config=live.config,key=JSON.stringify(config);
    if(!dirty&&key!==signature){signature=key;$('tiktok-username').value=config.username;$('tiktok-join').value=config.joinWord;$('tiktok-members').checked=config.joinOnMember;$('tiktok-likes').value=config.likesEvery;$('tiktok-like-effect').value=config.likeEffect;$('tiktok-follow-effect').value=config.followEffect;}
    $('tiktok-key-state').textContent=config.keyConfigured?'Đã lưu khoá trên máy. Để trống để giữ nguyên.':'Chưa lưu khoá. Thử Nối trước; chỉ nhập khi dịch vụ ký yêu cầu.';
    const labels={idle:'CHƯA NỐI',connecting:'ĐANG NỐI',connected:'ĐANG NHẬN LIVE',retrying:'ĐANG NỐI LẠI',error:'CHƯA NỐI ĐƯỢC',disconnected:'ĐÃ NGẮT'};
    $('tiktok-status').textContent=labels[live.status]||'CHƯA NỐI';$('tiktok-status').dataset.status=live.status;$('tiktok-message').textContent=live.message;$('tiktok-message').classList.toggle('error',live.status==='error');
    $('tiktok-viewers').textContent=live.viewers.toLocaleString('vi-VN');$('tiktok-received').textContent=live.received.toLocaleString('vi-VN');$('tiktok-room-id').textContent=live.roomId||'Chưa có';$('tiktok-room-mode').textContent=state.roomMode==='live'?'PHÒNG LIVE THẬT':'PHÒNG THỬ';
    const activity=state.liveActivity;$('tiktok-last-result').textContent=(activity?.pendingGifts?activity.pendingGifts+' lượt quà đợi hiệu ứng · ':'')+(activity?.lastResult||'Khi có quà thật, tên và ID quà sẽ xuất hiện ở đây. Gán ID để dùng đúng hiệu ứng bạn chọn.');
    const gifts=activity?.recentGifts||[],catalogKey=JSON.stringify([gifts,state.giftRules]);
    if(catalogKey!==catalogSignature){catalogSignature=catalogKey;const list=$('tiktok-recent-gifts');list.replaceChildren();for(const gift of gifts){const row=document.createElement('li'),text=document.createElement('span'),title=document.createElement('strong'),hint=document.createElement('small'),button=document.createElement('button');title.textContent=gift.name;const rule=state.giftRules.find(r=>r.externalId===gift.giftId)||state.giftRules.find(r=>r.key===gift.mappedKey);hint.textContent='ID '+gift.giftId+' · '+gift.coins+' xu'+(rule?' · '+(rule.enabled?'Đã gán':'Đang tắt'):' · Chưa gán');text.append(title,hint);button.type='button';button.className='small-button';button.textContent=rule?'Sửa hiệu ứng':'Gán hiệu ứng';button.addEventListener('click',()=>mapGift(gift));row.append(text,button);list.append(row);}}
    buttons();
  }
  return {update};
}
