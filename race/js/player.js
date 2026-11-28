import { el, button, pad, photo, highlight, clamp, motion, visibility, getJSON, instrumentStyles, unavailable } from './common.js';
import { icon } from './icons.js';

const tones={image_search:'ra',text_to_image_search:'ra',crop:'ra',web_search:'train',fetch:'train',answer:'ink',
  ground:'muted',ra:'ra',search:'train',ce:'ce',probe:'probe',teacher:'train'};
const stageNames={ground:'Ground targets',ra:'Referential Abstraction',search:'Retrieve evidence',
  ce:'Compositional Evidence',probe:'Question-only probe',teacher:'Teacher and SFT'};
let instances=0;

export async function mount(root) {
  const source=root.dataset.src || 'assets/data/episodes/index.json';
  const [listing]=await Promise.all([getJSON(source),instrumentStyles()]);
  if(!listing?.episodes?.length) {root.querySelector('.player__fallback')?.remove();return unavailable(root,source);}
  const prefix='episode-'+(++instances);
  const list=listing.episodes;
  // Preload the tiny episode JSONs in parallel so tab switching has zero async lag
  const cache=new Map();
  list.forEach(entry=>{cache.set(entry.file,getJSON(entry.file).catch(()=>null));});
  const tabs=el('div','pl-tabs'), panel=el('div','pl-panel'), title=el('h3','pl-title');
  tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label','Episodes');
  panel.id=prefix+'-panel';
  panel.setAttribute('role','tabpanel');
  root.tabIndex=0;
  root.setAttribute('role','region');
  root.setAttribute('aria-label','Episode player');
  root.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home Space');
  const subtitle=el('p','pl-subtitle'), provenance=el('details','pl-provenance');
  const sourceLabel=el('summary'), sourceDetail=el('p');provenance.append(sourceLabel,sourceDetail);
  const layout=el('div','pl-layout'), left=el('div','pl-prompt'), card=el('div','pl-turn');
  const images=el('div','pl-images'), candidates=el('ul','pl-candidates'), question=el('p','pl-question'), answer=el('p','pl-answer');
  const header=el('div','pl-turn-head'), position=el('span','pl-position'), badge=el('span','pl-tool');
  header.append(position,badge);
  const action=el('p','pl-action'), input=el('details','pl-input'), inputText=el('pre');
  input.append(el('summary','','Tool input'),inputText);
  const response=el('div','pl-response');
  response.tabIndex=-1;response.setAttribute('role','group');response.setAttribute('aria-label','Observation');
  const observed=el('p','pl-observation'), srText=el('span','pl-sr');
  observed.setAttribute('aria-hidden','true');
  const typedText=el('span','pl-typed');observed.append(typedText);
  const skip=button('Show all','pl-skip',()=>{stopAuto();finishText();});
  const head=el('div','pl-response-head');
  head.append(el('span','','Observation'),skip);
  const resultImage=el('img','pl-result-image');
  resultImage.loading='lazy';
  response.append(head,observed,srText,resultImage);
  response.addEventListener('click',()=>{stopAuto();finishText();});
  const cardContent=el('div','pl-turn-content');
  cardContent.append(header,action,input,response);card.append(cardContent);
  left.append(images,candidates,question,answer);
  layout.append(left,card);
  const controls=el('div','pl-controls'), playback=el('div','pl-playback'), speedBox=el('div','pl-speeds'), chips=el('div','pl-chips');
  speedBox.setAttribute('role','group'); speedBox.setAttribute('aria-label','Playback speed');
  chips.setAttribute('role','group'); chips.setAttribute('aria-label','Steps');
  playback.setAttribute('role','group');playback.setAttribute('aria-label','Playback');
  const makeControl=(name,label,classes,onClick)=>{
    const b=button('',classes,onClick);
    b.append(icon(name),el('span','',label));
    return b;
  };
  const play=makeControl('play','Play','pl-control pl-play',()=>{user=true;setPlay(!playing);});
  play.setAttribute('aria-label','Play episode');
  const prev=makeControl('prev','Prev','pl-control pl-prev',()=>go(turn-1));
  const next=makeControl('next','Next','pl-control pl-next',()=>go(turn+1));
  const reset=button('','pl-control pl-reset',()=>go(0));
  reset.append(icon('reset'));reset.title='Reset episode';reset.setAttribute('aria-label',reset.title);
  playback.append(prev,play,next);
  const speeds=[1,2,4].map(rate=>{
    const b=button(rate+'×','pl-speed',()=>{
      stopAuto();
      speed=rate;
      speeds.forEach((s,i)=>s.setAttribute('aria-pressed',String([1,2,4][i]===rate)));
    });
    b.setAttribute('aria-pressed',String(rate===1));
    speedBox.append(b);
    return b;
  });
  const scrubLabel=el('label','pl-scrubber'), range=el('input');
  range.type='range'; range.min=1; range.step=1;
  range.addEventListener('input',()=>go(Number(range.value)-1));
  const ticks=el('span','pl-ticks');ticks.setAttribute('aria-hidden','true');
  scrubLabel.append(el('span','pl-sr','Current step'),range,ticks);
  controls.append(playback,reset,speedBox,scrubLabel);
  const takeaway=el('aside','pl-takeaway'), live=el('span','pl-sr');
  live.classList.add('pl-status');live.setAttribute('role','status');
  live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');
  panel.append(title,subtitle,provenance,layout,controls,chips,takeaway);
  root.replaceChildren(tabs,panel,live);
  let episode, turn=0, selection=0, generation=0, playing=false, user=false, autoUsed=false, speed=1;
  let visible=0, raf=0, last=0, elapsed=0, typed=0, drawn=0, full='', textDuration=1;
  let tabButtons=[], chipButtons=[], previousEpisode, previousTurn, outgoing, incoming;
  for(const [i,entry] of list.entries()) {
    const b=button(entry.tab,'pl-tab',()=>{stopAuto(); select(i);});
    b.id=prefix+'-tab-'+i;
    b.setAttribute('role','tab');
    b.setAttribute('aria-controls',panel.id);
    b.addEventListener('keydown',event=>{
      let dest;
      if(event.key==='ArrowRight') dest=(i+1)%list.length;
      if(event.key==='ArrowLeft') dest=(i+list.length-1)%list.length;
      if(event.key==='Home') dest=0;
      if(event.key==='End') dest=list.length-1;
      if(dest==null) return;
      event.preventDefault();event.stopPropagation();
      stopAuto();tabButtons[dest].focus();select(dest);
    });
    tabs.append(b);tabButtons.push(b);
  }
  function needFrame() {
    return episode && visible>0 && !document.hidden && (playing || (!motion.matches && drawn<full.length));
  }
  function schedule() {
    if(needFrame() && !raf) {last=0;raf=requestAnimationFrame(tick);}
    if(!needFrame()&&raf) {cancelAnimationFrame(raf);raf=0;last=0;}
  }
  function finishText() {
    typed=textDuration;drawn=full.length;typedText.textContent=full;hideSkip();
    schedule();
  }
  function hideSkip() {
    if(document.activeElement===skip)response.focus({preventScroll:true});
    skip.hidden=true;
  }
  function tick(time) {
    raf=0;
    const dt=last?Math.min(time-last,150)*speed:0;
    last=time;
    if(drawn<full.length) {
      typed+=dt;
      const n=Math.min(full.length,Math.ceil(full.length*typed/textDuration));
      if(n!==drawn) {drawn=n;typedText.textContent=full.slice(0,n);}
      if(drawn>=full.length)hideSkip();
    }
    if(playing) {
      elapsed+=dt;
      if(elapsed>=Math.max(3000,textDuration+1700)) {
        if(turn<episode.turns.length-1) {render(turn+1);return;}
        setPlay(false);
      }
    }
    if(needFrame()) raf=requestAnimationFrame(tick);
  }
  function setPlay(value) {
    if(!episode) return;
    if(value && turn===episode.turns.length-1) render(0);
    playing=value;
    play.replaceChildren(icon(value?'pause':'play'),el('span','',value?'Pause':'Play'));
    play.setAttribute('aria-label',value?'Pause episode':'Play episode');
    root.classList.toggle('is-playing',value);
    schedule();
  }
  function stopAuto() { user=true; if(playing) setPlay(false); }
  function go(index) {
    if(!episode) return;
    stopAuto();
    render(clamp(index,0,episode.turns.length-1));
  }
  function render(index) {
    if(raf) cancelAnimationFrame(raf);
    raf=0;last=0;elapsed=0;
    turn=index;
    const t=episode.turns[turn], total=episode.turns.length, final=turn===total-1;
    incoming?.cancel();
    outgoing?.remove();outgoing=null;
    if(previousEpisode===episode && previousTurn!==turn && !motion.matches) {
      const ghost=cardContent.cloneNode(true);
      ghost.classList.add('pl-turn-out');ghost.inert=true;ghost.setAttribute('aria-hidden','true');
      card.append(ghost);outgoing=ghost;
      const direction=turn>previousTurn?1:-1;
      const timing={duration:240,easing:'ease-out'};
      const out=ghost.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateX('+(-8*direction)+'px)'}],timing);
      out.onfinish=()=>ghost.remove();
      incoming=cardContent.animate([{opacity:0,transform:'translateX('+(8*direction)+'px)'},{opacity:1,transform:'none'}],timing);
    }
    const changed=previousEpisode!==episode||previousTurn!==turn;
    previousEpisode=episode;previousTurn=turn;
    const unit=episode.kind==='construction'?'Step':'Turn';
    position.textContent=unit+' '+pad(t.n??turn+1)+' / '+pad(total);
    badge.dataset.tone=tones[t.tool]||'muted';
    const toolName=String(t.tool).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
    badge.textContent=episode.kind==='construction'&&stageNames[t.tool]?t.label+' · '+stageNames[t.tool]:toolName;
    action.textContent=t.summary;
    if(changed && user) live.textContent=unit+' '+(turn+1)+' of '+total+'. '+t.summary;
    input.hidden=t.input==null || t.input==='';
    input.open=false;
    inputText.textContent=typeof t.input==='string'?t.input:JSON.stringify(t.input,null,2);
    const observation=typeof t.observation==='string'?{text:t.observation}:t.observation||{};
    full=observation.text || '';
    typed=0;drawn=0;textDuration=Math.min(1600,Math.max(350,full.length*22));
    // Reserve the full paragraph's height without exposing partial text to assistive technology.
    observed.dataset.full=full;
    typedText.textContent='';srText.textContent=full;
    response.hidden=!full&&!observation.image;
    skip.hidden=!full || motion.matches;
    if(observation.image) {
      const img=observation.image;
      resultImage.alt=img.alt||observation.alt||'Observation image';
      resultImage.src=new URL(img.src||img,document.baseURI);
      resultImage.hidden=false;
    } else {resultImage.hidden=true;resultImage.removeAttribute('src');}
    for(const node of left.querySelectorAll('[data-candidate]')) node.classList.toggle('is-active',(t.focus||[]).includes(node.dataset.candidate));
    answer.hidden=!final||!episode.answer;
    answer.replaceChildren(el('strong','','Answer'),document.createTextNode(' '+(episode.answer||'')));
    const leaving=document.activeElement;
    prev.disabled=turn===0;next.disabled=final;
    if((leaving===prev&&prev.disabled)||(leaving===next&&next.disabled))chipButtons[turn]?.focus({preventScroll:true});
    range.max=total;range.value=turn+1;range.setAttribute('aria-valuetext',position.textContent);
    scrubLabel.style.setProperty('--step-progress',(total>1?turn/(total-1)*100:0)+'%');
    chipButtons.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===turn)));
    [...ticks.children].forEach((tick,j)=>tick.classList.toggle('is-current',j===turn));
    if(motion.matches) finishText(); else schedule();
  }
  async function select(i) {
    const token=++generation;
    selection=i;
    if(episode) setPlay(false);
    episode=null; schedule();
    tabButtons.forEach((b,j)=>{b.setAttribute('aria-selected',String(j===i)); b.tabIndex=j===i?0:-1;});
    panel.setAttribute('aria-labelledby',tabButtons[i].id);
    panel.setAttribute('aria-busy','true');
    const data=await (cache.get(list[i].file) || getJSON(list[i].file));
    if(token!==generation) return;
    panel.removeAttribute('aria-busy');
    root.querySelector('.viz-unavailable')?.remove();
    panel.hidden=!data?.turns?.length;
    if(panel.hidden) {unavailable(root,list[i].file);return;}
    episode=data;
    title.textContent=data.title;
    subtitle.textContent=data.subtitle||'';subtitle.hidden=!data.subtitle;
    provenance.open=false;provenance.hidden=!data.provenance;
    sourceLabel.textContent=data.kind==='construction'?'Construction steps documented in the paper':'Teacher trajectory';
    sourceLabel.title=data.provenance||'';sourceDetail.textContent=data.provenance||'';
    const photos=data.images||[],paired=photos.length>1;
    images.classList.toggle('pl-images--paired',paired);
    images.replaceChildren(...photos.map(img=>photo(img,'pl',true,paired?7/8:null)));
    const refs=data.construction?.ra||[];
    candidates.replaceChildren(...refs.map(ref=>{
      const item=el('li','pl-candidate'), words=el('span','pl-candidate-words');
      item.dataset.candidate=ref.candidate.split(':').at(-1).trim();
      words.append(el('strong','',ref.condition),el('span','',ref.status));
      item.append(el('b','',ref.candidate),words);return item;
    }));
    candidates.hidden=!refs.length;
    highlight(question,data.question,data.spans);
    takeaway.replaceChildren();
    if(data.takeaway) {
      takeaway.append(el('strong','','What changes?'),el('p','',data.takeaway.replace(/^What changes\?\s*/i,'')));
    }
    takeaway.hidden=!data.takeaway;
    chipButtons=data.turns.map((t,j)=>{
      const b=button(pad(t.n??j+1)+' '+t.label,'pl-chip',()=>go(j));
      b.dataset.tone=tones[t.tool]||'muted';
      b.setAttribute('aria-label',b.textContent+' — '+t.summary);
      return b;
    });
    chips.replaceChildren(...chipButtons);
    ticks.replaceChildren(...data.turns.map(()=>el('i')));
    render(0); tryAuto();
  }
  function tryAuto() {
    if(episode && visible>=.5 && !autoUsed && !user && !motion.matches) {autoUsed=true;setPlay(true);}
  }
  root.addEventListener('keydown',e=>{
    if(e.target.closest('[role=tablist],input,select,textarea')||e.altKey||e.ctrlKey||e.metaKey) return;
    if(e.key==='ArrowLeft') {e.preventDefault();go(turn-1);}
    else if(e.key==='ArrowRight') {e.preventDefault();go(turn+1);}
    else if(e.key==='Home') {e.preventDefault();go(0);}
    else if(e.code==='Space'&&!e.target.closest('button,summary,a')) {e.preventDefault();user=true;setPlay(!playing);}
  });
  root.addEventListener('pointerdown',event=>{if(!event.target.closest('.pl-play')) stopAuto();});
  root.addEventListener('focusin',e=>{if(!e.target.closest('.pl-play')) stopAuto();});
  visibility(root,ratio=>{
    visible=ratio;
    if(!visible && playing) setPlay(false); else tryAuto();
    schedule();
  });
  motion.addEventListener('change',()=>{if(motion.matches&&episode){
    incoming?.cancel();outgoing?.getAnimations().forEach(a=>a.cancel());outgoing?.remove();outgoing=null;
    setPlay(false);finishText();
  }});
  await select(selection);
}
