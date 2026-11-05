import {EFFECTS} from './room-core.mjs';
const $=id=>document.getElementById(id);
export function setupDemoAdmin({post}){
 let state=null,peopleSignature='',giftsSignature='',eventsSignature='',busy=false;
 const viewer=$('demo-viewer'),name=$('demo-name'),status=$('demo-feedback');
 function syncName(){const fresh=viewer.value==='';$('demo-new-viewer').hidden=!fresh;name.disabled=!fresh;name.required=fresh;}
 viewer.addEventListener('change',syncName);
 function buttons(){const blocked=state?.roomMode!=='demo'||['connecting','connected','retrying'].includes(state?.tiktok?.status);document.querySelectorAll('[data-demo-type],#demo-send-comment,#demo-auto-toggle').forEach(b=>b.disabled=blocked||busy);$('demo-mode-note').textContent=blocked?'Đang nối TikTok. Bấm Mở phòng mô phỏng để quay lại thử.':'MÔ PHỎNG · Tương tác thử không gửi đến TikTok';$('demo-start').hidden=!blocked;}
 async function send(type){
  if(busy)return;if(!viewer.value&&!name.reportValidity())return;
  const comment=$('demo-comment');if(type==='chat'&&!comment.reportValidity())return;
  busy=true;buttons();try{const result=await post('/api/demo/event',{type,playerId:viewer.value||undefined,name:name.value,comment:comment.value,count:type==='like'?Number($('demo-like-count').value):type==='gift'?Number($('demo-gift-count').value):1,gift:$('demo-gift').value});status.textContent=result.message;status.classList.remove('error');}
  catch(error){status.textContent=error.message;status.classList.add('error');}finally{busy=false;buttons();}
 }
 $('demo-comment-form').addEventListener('submit',event=>{event.preventDefault();send('chat');});document.querySelectorAll('[data-demo-type]').forEach(button=>button.addEventListener('click',()=>send(button.dataset.demoType)));
 $('demo-auto-toggle').addEventListener('click',async()=>{try{await post('/api/command',{type:'crowd-demo',enabled:!state?.autoDemo});}catch(error){status.textContent=error.message;status.classList.add('error');}});
 $('demo-start').addEventListener('click',async()=>{try{await post('/api/tiktok/demo',{});}catch(error){status.textContent=error.message;}});
 return {update(next){state=next;const people=JSON.stringify(state.players.map(p=>[p.id,p.name]));if(people!==peopleSignature){peopleSignature=people;const selected=viewer.value;viewer.replaceChildren(new Option('＋ Người xem mới',''));for(const p of state.players)viewer.append(new Option(p.name,p.id));viewer.value=[...viewer.options].some(o=>o.value===selected)?selected:'';syncName();}
 const gifts=JSON.stringify(state.giftRules);if(gifts!==giftsSignature){giftsSignature=gifts;const picker=$('demo-gift'),selected=picker.value;picker.replaceChildren();for(const r of state.giftRules.filter(r=>r.enabled))picker.append(new Option(EFFECTS[r.effect].icon+' '+r.name+' · '+r.coins.toLocaleString('vi-VN')+' xu → '+EFFECTS[r.effect].label,r.key));if([...picker.options].some(o=>o.value===selected))picker.value=selected;}
 const activity=state.demoActivity,stats=activity?.stats||{};$('demo-comments').textContent=stats.comments||0;$('demo-likes').textContent=stats.likes||0;$('demo-gifts').textContent=state.roomMode==='demo'?state.totalGifts:0;$('demo-coins').textContent=(state.roomMode==='demo'?state.totalCoins||0:0).toLocaleString('vi-VN');$('demo-threshold').textContent=`Đủ ${state.tiktok.config.likesEvery} tim/người tạo hiệu ứng; tối đa một lượt mỗi 10 giây.`;
 const events=activity?.events||[],signature=JSON.stringify(events);if(signature!==eventsSignature){eventsSignature=signature;const list=$('demo-events');list.replaceChildren();for(const e of events.slice(0,8)){const li=document.createElement('li');li.textContent=({chat:'💬 ',like:'♥ ',gift:'🎁 ',follow:'✦ '}[e.type]||'')+e.text;list.append(li);}}
 $('demo-auto-toggle').textContent=state.autoDemo?'■ Dừng tự chạy':'▶ Chạy 100 người';$('demo-auto-status').textContent=state.autoDemo?`Đang chạy ${state.players.length} người · bình luận, tim và quà tự động. Camera có khoảng dạo sàn giữa các hiệu ứng.`:'Thêm đủ 100 nhân vật, chạy liên tục bình luận, tim và quà.';
 $('demo-join-hint').textContent=`Bình luận “${state.tiktok.config.joinWord||'nội dung bất kỳ'}” để nhân vật vào sàn. Dùng cùng tên để tiếp tục thả tim và tặng quà cho người đó.`;buttons();
 }};
}
