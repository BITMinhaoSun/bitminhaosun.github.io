import { button, el, getJSON, instrumentStyles, motion, pad, unavailable, visibility } from './common.js';
import { createInstrument } from './hero-stage.js';

const durations = [4500, 5000, 3500, 6000, 4000, 5000];

export async function mount(root) {
  const stage = root.querySelector('.hero-demo__stage');
  const list = root.querySelector('.hero-demo__captions');
  const captions = [...(list?.children || [])];
  if (!stage || captions.length !== durations.length) return;
  const [examples, results, evidence] = await Promise.all([
    ...['examples','results','evidence'].map(id => getJSON('assets/data/'+id+'.json')),instrumentStyles()]);
  if (!examples?.fig1a?.image || !examples?.fig1c?.candidates?.length || !examples.fig1c.compose)
    return unavailable(stage,'Hero examples');
  const rows = results?.rows || [];
  const base = rows.find(r=>r.id==='base');
  const trained = rows.find(r=>r.id==='race');
  const teacher = rows.find(r=>r.id==='qwen37_plus')?.model;
  const backbone = base?.model.replace(/\s*\(.*$/,'') || 'the base agent';
  const data = {shortcut:examples.fig1a, example:examples.fig1c, training:{
    summary:(teacher || 'The teacher')+' solves the retained tasks, and its correct trajectories train '+backbone+' in one SFT stage.',
    base:base?.scores.avg, race:trained?.scores.avg,
    model:trained?.model.replace(/\s*\(.*$/,'') || 'Trained agent',
    teacher:teacher || '',
    corpus:evidence?.key_numbers?.items?.find(r=>r.id==='trajectories')?.display || ''
  }};
  const controls = el('div','hd-controls'), dots = el('div','hd-dots'), counter = el('span','hd-counter');
  const status=el('span','pl-sr hd-status');
  status.setAttribute('role','status');status.setAttribute('aria-live','off');status.setAttribute('aria-atomic','true');
  dots.setAttribute('role','group'); dots.setAttribute('aria-label','Scenes');
  const buttons = captions.map((caption,i)=>{
    const b = button('','hd-dot',()=>select(i,true));
    b.setAttribute('aria-label','Scene '+(i+1)+' of '+captions.length+', '+(caption.querySelector('strong')?.textContent||caption.textContent).trim());
    dots.append(b);
    return b;
  });
  let views = [], mounted, index = 0, elapsed = 0, previous = 0, frame = 0;
  let inView = false, hovered = false, focused = false, paused = false;
  const play = button('Pause','hd-play',()=>{
    paused = !paused;
    play.textContent = paused ? 'Play' : 'Pause';
    play.setAttribute('aria-label',play.textContent+' scenes');
    sync();
  });
  play.setAttribute('aria-label','Pause scenes');
  controls.append(counter,dots,play,status);
  root.querySelector('.hero-demo__controls').append(controls);
  function select(i,manual=false) {
    const changed=i!==index || !status.textContent;
    index=i; elapsed=manual?durations[i]*.92:0; previous=0;
    views[0].show(i,elapsed/durations[i]);
    buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));
    captions.forEach((c,j)=>{
      c.classList.toggle('is-active',i===j);
      c.setAttribute('aria-hidden',String(i!==j));
    });
    counter.textContent=pad(i+1)+' / '+pad(captions.length);
    if(changed){
      status.setAttribute('aria-live',manual?'polite':'off');
      status.textContent='Scene '+(i+1)+' of '+captions.length+'. '+captions[i].textContent.trim();
    }
  }
  function tick(now) {
    if (previous) elapsed+=Math.min(now-previous,150);
    previous=now;
    if (elapsed>=durations[index]) select((index+1)%durations.length);
    else views[0].paint(elapsed/durations[index]);
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    const run = !motion.matches && inView && !hovered && !focused && !paused && !document.hidden;
    root.classList.toggle('is-playing',run);
    if (run && !frame) {previous=0;frame=requestAnimationFrame(tick);}
    if (!run && frame) {cancelAnimationFrame(frame);frame=0;previous=0;}
  }
  function layout() {
    if (frame) cancelAnimationFrame(frame);
    frame=0;previous=0;
    views.forEach(view=>view.destroy()); views=[]; mounted?.remove();
    root.classList.add('hd-ready');
    root.classList.toggle('is-static',motion.matches);
    root.classList.toggle('is-enhanced',!motion.matches);
    list.hidden=controls.hidden=motion.matches;
    if (motion.matches) {
      mounted=el('div','hd-boardwalk'); stage.append(mounted);
      captions.forEach((caption,i)=>{
        const tile=el('figure','hd-tile'), copy=el('figcaption');
        copy.append(...[...caption.childNodes].map(n=>n.cloneNode(true)));
        const view=createInstrument(data,i);
        tile.append(view.frame,copy);mounted.append(tile);views.push(view);view.show(i,1,true);
      });
    } else {
      const view=createInstrument(data);
      mounted=view.frame;stage.append(mounted);views.push(view);select(index);
    }
    sync();
  }
  root.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hovered=true;sync();}});
  root.addEventListener('pointerleave',()=>{hovered=false;sync();});
  root.addEventListener('focusin',()=>{focused=true;sync();});
  root.addEventListener('focusout',e=>{focused=root.contains(e.relatedTarget);sync();});
  motion.addEventListener('change',layout);
  visibility(root,ratio=>{inView=ratio>0;sync();});
  layout();
}
