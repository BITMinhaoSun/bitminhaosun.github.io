import { el, button, clamp } from './common.js';

let dialog,viewport,img,caption,tools,panHint,opener,zoomable,scale=1,x=0,y=0,origin;
const fingers=new Map();
function position() {
  const limitX=Math.max(0,(img.offsetWidth*scale-viewport.clientWidth)/2);
  const limitY=Math.max(0,(img.offsetHeight*scale-viewport.clientHeight)/2);
  x=clamp(x,-limitX,limitX); y=clamp(y,-limitY,limitY);
  img.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';
  viewport.classList.toggle('lb-zoomed',scale>1);
  panHint.hidden=!zoomable||scale<=1;
  const minus=tools.querySelector('.lb-minus'),plus=tools.querySelector('.lb-plus'),focused=document.activeElement;
  minus.disabled=scale<=1;
  plus.disabled=scale>=6;
  if(focused===plus&&plus.disabled)minus.focus({preventScroll:true});
  if(focused===minus&&minus.disabled)plus.focus({preventScroll:true});
}
function zoom(next,px,py) {
  if(!zoomable) return;
  const rect=viewport.getBoundingClientRect();
  const cx=(px??rect.left+rect.width/2)-rect.left-rect.width/2;
  const cy=(py??rect.top+rect.height/2)-rect.top-rect.height/2;
  const target=clamp(next,1,6), factor=target/scale;
  x=cx-(cx-x)*factor; y=cy-(cy-y)*factor; scale=target;position();
}
function gesture() {
  const [a,b]=fingers.values();
  if(!a) {origin=null;return;}
  origin={x,y,scale,cx:b?(a.x+b.x)/2:a.x,cy:b?(a.y+b.y)/2:a.y,
    distance:b?Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)):0};
}
function create() {
  dialog=el('dialog','lb-dialog');
  dialog.setAttribute('aria-label','Enlarged figure');
  caption=el('p','lb-caption');caption.id='enlarged-figure-caption';
  dialog.setAttribute('aria-describedby',caption.id);
  const frame=el('div','lb-frame'),bar=el('div','lb-bar');
  const close=button('Close','lb-close',()=>dialog.close());
  close.autofocus=true;
  tools=el('div','lb-tools');
  const minus=button('−','lb-minus',()=>zoom(scale/1.5)),plus=button('+','lb-plus',()=>zoom(scale*1.5));
  minus.setAttribute('aria-label','− Zoom out');plus.setAttribute('aria-label','+ Zoom in');
  tools.append(minus,plus,button('Reset','lb-reset',()=>zoom(1)));
  panHint=el('span','lb-pan-hint','Arrow keys pan the enlarged image.');panHint.hidden=true;
  bar.append(caption,panHint,tools,close);
  viewport=el('div','lb-viewport');
  img=el('img','lb-image');img.draggable=false;img.addEventListener('load',position);
  viewport.append(img);frame.append(bar,viewport);dialog.append(frame);document.body.append(dialog);
  dialog.addEventListener('click',e=>{if(e.target===dialog) dialog.close();});
  dialog.addEventListener('keydown',e=>{
    const delta={ArrowLeft:[56,0],ArrowRight:[-56,0],ArrowUp:[0,56],ArrowDown:[0,-56]}[e.key];
    if(delta && zoomable && scale>1 && !e.altKey && !e.ctrlKey && !e.metaKey){
      e.preventDefault();x+=delta[0];y+=delta[1];position();return;
    }
    if(e.key!=='Tab') return;
    const buttons=[...dialog.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey && document.activeElement===first) {e.preventDefault();last.focus();}
    if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first.focus();}
  });
  dialog.addEventListener('close',()=>{
    document.documentElement.classList.remove('lb-locked');
    fingers.clear();origin=null;img.removeAttribute('src');opener?.focus({preventScroll:true});
  });
  viewport.addEventListener('wheel',e=>{
    if(!zoomable) return;
    e.preventDefault();zoom(scale*Math.exp(-clamp(e.deltaY,-180,180)*.004),e.clientX,e.clientY);
  },{passive:false});
  viewport.addEventListener('dblclick',e=>zoom(scale>1?1:2.4,e.clientX,e.clientY));
  viewport.addEventListener('pointerdown',e=>{
    if(!zoomable||e.button!==0) return;
    viewport.setPointerCapture(e.pointerId);fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture();
  });
  viewport.addEventListener('pointermove',e=>{
    if(!fingers.has(e.pointerId)||!origin) return;
    fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const [a,b]=fingers.values();
    if(b&&origin.distance) {
      scale=origin.scale;x=origin.x;y=origin.y;
      zoom(origin.scale*Math.hypot(b.x-a.x,b.y-a.y)/origin.distance,origin.cx,origin.cy);
      x+=(a.x+b.x)/2-origin.cx; y+=(a.y+b.y)/2-origin.cy;
    } else {x=origin.x+a.x-origin.cx;y=origin.y+a.y-origin.cy;}
    position();
  });
  viewport.addEventListener('lostpointercapture',e=>{fingers.delete(e.pointerId);gesture();});
  window.addEventListener('resize',()=>{if(dialog.open) position();});
}
export function mount(link) {
  if(!link.href || !window.HTMLDialogElement) return;
  if(!link.textContent.trim()) {
    const label=el('span','lb-trigger','↗ Enlarge');
    link.append(label);
  }
  link.setAttribute('aria-haspopup','dialog');
  link.addEventListener('click',e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0) return;
    e.preventDefault();
    if(!dialog) create();
    opener=link;zoomable=link.dataset.zoom==='true';tools.hidden=!zoomable;
    viewport.classList.toggle('lb-can-zoom',zoomable);
    img.alt=link.querySelector('img')?.alt||link.dataset.caption||'Figure';
    caption.textContent=link.dataset.caption||img.alt;
    scale=1;x=0;y=0;
    img.src=link.href;
    dialog.showModal();document.documentElement.classList.add('lb-locked');position();
  });
}
