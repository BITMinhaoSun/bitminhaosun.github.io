import { clamp, motion, visibility } from './common.js';

export function mount(root) {
  const handle=root.querySelector('.compare__handle'), layer=root.querySelector('.compare__layer--b');
  if(!handle||!layer) return;
  root.classList.add('cmp-ready');
  handle.setAttribute('role','slider');
  handle.setAttribute('aria-orientation','horizontal');
  handle.setAttribute('aria-valuemin','0');handle.setAttribute('aria-valuemax','100');
  if(!handle.hasAttribute('aria-label')&&!handle.hasAttribute('aria-labelledby')) handle.setAttribute('aria-label','Compare the two questions');
  handle.tabIndex=0;
  if(handle.tagName==='BUTTON') handle.type='button';
  const first=root.querySelector('.compare__layer--a')?.getAttribute('aria-label') || 'first view';
  const second=layer.getAttribute('aria-label') || 'second view';
  let value=50, pointer=null, nudgeFrame=0, nudged=motion.matches;
  function set(next) {
    value=clamp(Math.round(next),0,100);
    root.style.setProperty('--cmp-pos',clamp(next,0,100)+'%');
    handle.setAttribute('aria-valuenow',value);
    handle.setAttribute('aria-valuetext',value+'% '+first+', '+(100-value)+'% '+second);
  }
  function move(e) {
    const rect=root.getBoundingClientRect();
    if(rect.width) set(100*(e.clientX-rect.left)/rect.width);
  }
  function cancelNudge() {
    nudged=true;
    if(nudgeFrame) {cancelAnimationFrame(nudgeFrame);nudgeFrame=0;set(50);}
  }
  function nudge(now) {
    const stops=[50,40,60,50], start=now;
    const tick=time=>{
      const t=clamp((time-start)/1400,0,1)*3, part=Math.min(2,Math.floor(t));
      const eased=(1-Math.cos(Math.PI*(t-part)))/2;
      set(stops[part]+(stops[part+1]-stops[part])*eased);
      nudgeFrame=t<3?requestAnimationFrame(tick):0;
    };
    tick(now);
  }
  visibility(root,ratio=>{
    if(ratio>=.45 && !nudged && !motion.matches) {nudged=true;nudgeFrame=requestAnimationFrame(nudge);}
    else if(!ratio && nudgeFrame) cancelNudge();
  });
  motion.addEventListener('change',()=>{if(motion.matches) cancelNudge();});
  handle.addEventListener('focus',cancelNudge);
  root.addEventListener('dragstart',e=>e.preventDefault());
  root.addEventListener('pointerdown',e=>{
    if(e.button!==0||pointer!==null||e.target.closest('a,input,button:not(.compare__handle)')) return;
    cancelNudge();
    if(e.pointerType!=='touch') e.preventDefault();
    pointer=e.pointerId;
    handle.focus({preventScroll:true});
    root.setPointerCapture(pointer);
    move(e);
  });
  root.addEventListener('pointermove',e=>{if(pointer===e.pointerId) move(e);});
  root.addEventListener('pointerup',e=>{if(e.pointerId===pointer) move(e);});
  root.addEventListener('lostpointercapture',e=>{if(e.target===root&&e.pointerId===pointer) pointer=null;});
  handle.addEventListener('keydown',e=>{
    const destinations={ArrowLeft:value-5,ArrowRight:value+5,Home:0,End:100};
    if(!(e.key in destinations)) return;
    e.preventDefault();set(destinations[e.key]);
  });
  set(50);
}
