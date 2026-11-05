// Official TikTok artwork, bundled locally. Provenance: assets/gifts/sources.json.
const bundledIds=new Set(['5655','5269','5827','5585','5660','6097','10994','5659','5566','1322340','1347193','5586','5509','6437']);
export function giftImageUrl(id){return bundledIds.has(String(id))?`./assets/gifts/${id}.webp`:'./assets/gifts/unknown.svg';}
export function renderGiftIcon(element,{iconUrl,icon='✦',giftName='Quà tặng'}={}){
  const signature=JSON.stringify([iconUrl,icon,giftName]);
  if(element.dataset.art===signature)return;
  element.dataset.art=signature;element.replaceChildren();
  if(iconUrl){const image=document.createElement('img');image.src=iconUrl;image.alt=giftName;image.width=40;image.height=40;image.decoding='async';element.append(image);}
  else element.textContent=icon;
}
