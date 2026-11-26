import { clamp, el, highlight, photo } from './common.js';
import { icon } from './icons.js';
import { wireLayer } from './hero-wires.js';

const names = ['shortcut','abstraction','evidence','composition','probe','training'];
const easing = 'cubic-bezier(.16,1,.3,1)';

function makeRail(example) {
  const root = el('div','hd-rail');
  const track = el('div','hd-rail-track');
  const short = ['Image','Targets','Evidence','Answer'];
  const nodes = (example.chain || ['Image candidates','Resolved targets','Retrieved evidence','Answer']).map((label,i)=>{
    const node = el('div','hd-node');
    node.append(el('span','hd-node-dot',i+1),el('span','hd-node-full',label),el('span','hd-node-short',short[i]));
    track.append(node);
    return node;
  });
  const edges = (example.chain_edges || ['RA','Search','CE']).map((label,i)=>{
    const edge = el('span','hd-link');
    edge.dataset.edge = i;
    edge.append(el('span','hd-link-label',label),el('i','hd-rail-cross','×'));
    track.append(edge);
    return edge;
  });
  root.append(track);
  return {root,nodes,edges};
}

function surface(className, label, symbol) {
  const node = el('div',className);
  if (symbol) node.append(icon(symbol));
  if (label) node.append(el('span','',label));
  return node;
}

function makeTraining(data) {
  const root = el('div','hd-training');
  const flow = el('div','hd-flow');
  const cards = el('div','hd-stream');
  cards.setAttribute('aria-hidden','true');
  for (let i=0; i<14; i++) {
    const card = el('i');
    card.style.setProperty('--slot',i);
    card.style.setProperty('--rise',(i%3)+'px');
    cards.append(card);
  }
  const teacher = surface('hd-train-node hd-teacher',null,'paper');
  teacher.append(el('span','','Teacher'),el('strong','',data.teacher));
  const filter = surface('hd-train-node hd-filter','Correct final answers kept','filter');
  const corpus = surface('hd-train-node hd-corpus',null,'bundle');
  corpus.append(el('strong','',data.corpus),el('span','','trajectories'));
  const sft = surface('hd-train-node hd-sft','SFT');
  const model = surface('hd-train-node hd-model',data.model);
  flow.append(cards,teacher,filter,corpus,sft,model);
  [...flow.children].forEach((node,i)=>node.style.setProperty('--step',i));

  const metric = el('div','hd-metric');
  const before = el('div','hd-score hd-score-base');
  const after = el('div','hd-score hd-score-race');
  const value = el('strong','hd-score-value');
  const hasScores = Number.isFinite(data.base) && Number.isFinite(data.race);
  const baseLabel = hasScores ? data.base.toFixed(1) : '—';
  before.append(el('strong','hd-score-value',baseLabel),el('span','','Base agent'));
  value.setAttribute('aria-hidden','true');
  after.setAttribute('role','group');after.setAttribute('aria-label',hasScores?data.race.toFixed(1):'—');
  after.append(value,el('span','',data.model+' · average accuracy, ten benchmarks'));
  metric.append(before,el('span','hd-score-arrow','→'),after);
  metric.hidden = !hasScores;
  root.append(flow,metric);
  function paint(progress) {
    if (!hasScores) return;
    const t = clamp((progress-.36)/.47,0,1);
    const printed = (data.base+(data.race-data.base)*(1-(1-t)**2)).toFixed(1);
    const next = printed === baseLabel && t < 1 ? '' : printed;
    if (value.textContent !== next) value.textContent = next;
    metric.classList.toggle('is-counting',Boolean(next));
  }
  return {root,paint};
}

function withVariable(text) {
  const label = el('span','hd-fact-value');
  const match = /^(.*\s)([a-z])$/i.exec(text || '');
  if (match) label.append(document.createTextNode(match[1]),el('var','',match[2]));
  else label.textContent = text || '';
  return label;
}

export function createInstrument({shortcut,example,training}, staticIndex) {
  const fixed = staticIndex != null;
  const frame = el('div','hd-instrument');
  const shell = el('div','hd-shell');
  const rail = makeRail(example);
  const scene = el('div','hd-scene');
  const board = el('div','hd-columns');
  const columns = Array.from({length:4},()=>{
    const col = el('div','hd-column');
    board.append(col);
    return col;
  });
  scene.append(board);
  const strip = el('div','hd-strip');
  const questions = [shortcut,example].map(item=>{
    const p = el('p','hd-question');
    highlight(p,item.question,item.spans);
    return p;
  });
  const questionStack = el('div','hd-question-stack');
  const stripLabel=el('span','hd-strip-label','Question');
  const summary=el('p','hd-corpus-summary',training.summary);
  questionStack.append(...questions);
  strip.append(stripLabel,questionStack,summary);
  shell.append(rail.root,scene,strip);
  frame.append(shell);

  const pieces = [];
  function layer(parent, body, stages, className='') {
    const wrap = el('div','hd-layer '+className);
    wrap.append(body); parent.append(wrap);
    pieces.push({wrap,stages});
    return wrap;
  }
  const oldPhoto = photo(shortcut.image,'hd',false);
  const stamp = el('span','hd-stamp',shortcut.bypass_label || 'Image bypassed');
  stamp.append(icon('close'));
  oldPhoto.append(stamp);
  layer(columns[0],oldPhoto,[0],'hd-old-image');
  const image = photo(example.image,'hd');
  layer(columns[0],image,[1,2,3],'hd-real-image');
  const boxes = [...image.querySelectorAll('[data-candidate]')];

  const named = surface('hd-short-card hd-named','Target named in text','named');
  if (shortcut.spans?.[0]?.text) named.append(el('em','',shortcut.spans[0].text));
  const web = surface('hd-short-card hd-web',shortcut.chain?.[1] || 'Web search','search');
  const shortcutAnswer = surface('hd-short-card hd-short-answer',shortcut.chain?.at(-1) || 'Answer','answer');
  [named,web,shortcutAnswer].forEach((node,i)=>layer(columns[i+1],node,[0]));

  const chips = el('div','hd-rows');
  const facts = el('div','hd-rows');
  const waiting = el('div','hd-rows');
  const targets = [], evidence = [];
  for (const candidate of example.candidates) {
    const chip = el('div','hd-target');
    const face = el('div','hd-target-face');
    const letter = el('b','hd-letter',candidate.id);
    const words = el('span','hd-target-words');
    words.append(el('strong','',candidate.condition),el('small','',candidate.status));
    const matched = candidate.matched ?? /matches/i.test(candidate.status);
    chip.dataset.matched = String(matched);
    face.append(letter,words,icon(matched?'check':'close'));
    chip.append(face); chips.append(chip); targets.push(chip);

    const slot = el('div','hd-fact');
    const ink = el('div','hd-fact-face');
    ink.append(el('b','hd-letter',candidate.id),withVariable(candidate.value));
    const missingLabel=el('span','hd-fact-missing',candidate.id+' · Evidence withheld');
    slot.append(ink,missingLabel); facts.append(slot); evidence.push(slot);

    const ghost = el('div','hd-future-fact');
    ghost.append(el('b','hd-letter',candidate.id),el('i'));
    waiting.append(ghost);
  }
  waiting.setAttribute('role','group');waiting.setAttribute('aria-label','Evidence pending');
  layer(columns[1],chips,[1,2,3]);
  layer(columns[2],waiting,[1]);
  layer(columns[2],facts,[2,3]);
  const pending = el('div','hd-pending');
  const pendingText = el('span');
  pending.append(el('b','','?'),pendingText);
  layer(columns[3],pending,[1,2]);
  const answer = el('div','hd-formula');
  const expression = el('strong','hd-equation',example.compose.expr);
  const answerLabel = el('span','hd-answer-label',example.compose.answer);
  answer.append(expression,answerLabel,el('small','hd-note',example.compose.note));
  layer(columns[3],answer,[3]);

  const probe = el('div','hd-probe-board');
  const withheld = surface('hd-withheld','Image withheld','withheld');
  const gate = surface('hd-gate','Question-only search probe','search');
  const lanes = el('div','hd-lanes');
  const upper = surface('hd-lane hd-upper','Identity or answer recovered → revise or discard');
  const lower = surface('hd-lane hd-lower','No shortcut found → keep');
  lanes.append(upper,lower);
  const kept = surface('hd-kept','Retained','check');
  probe.append(withheld,gate,lanes,kept);
  layer(scene,probe,[4],'hd-overlay');
  const flight = el('div','hd-flight',example.question);
  flight.setAttribute('aria-hidden','true');
  shell.append(flight);
  const train = makeTraining(training);
  layer(scene,train.root,[5],'hd-overlay');

  const wire = wireLayer(shell);
  let index = -1, progress = 1, missing = -2, geometryFrame = 0, compact = false, flightVector;
  const entered = [];
  function move(node, from, delay) {
    if (!from || !node) return;
    const a = from.getBoundingClientRect(), b = node.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const dx = (a.left+a.width/2)-(b.left+b.width/2);
    const dy = (a.top+a.height/2)-(b.top+b.height/2);
    const animation = node.animate([
      {transform:'translate('+dx+'px,'+dy+'px) scale(.85)',opacity:0},
      {transform:'none',opacity:1}
    ],{duration:610,delay,easing,fill:'backwards'});
    entered.push(animation);
  }
  function layout(still = true) {
    if (index < 0 || !frame.isConnected) return;
    compact = fixed || matchMedia('(max-width:640px)').matches;
    frame.classList.toggle('hd-compact',compact);
    wire.begin();
    const connect = (id,a,b,tone,settings={})=>wire.connect(id,a,b,tone,{still:fixed||still,...settings});
    if (index === 0) {
      if(!compact)connect('shortcut',named,questions[0].querySelector('mark'),'break',{
        from:'bottom',to:'top',route:'bypass',dashed:true});
      connect('named-web',named,web,'muted',compact ? {from:'bottom',to:'top',route:'vertical'} : {});
      connect('web-answer',web,shortcutAnswer,'muted',{delay:95});
    }
    if (index >= 1 && index <= 3) {
      targets.forEach((target,i)=>{
        const box = boxes.find(b=>b.dataset.candidate===example.candidates[i].id);
        connect('box-'+i,box,target,i?'muted':'ra',{
          from:i?'bottom':'top',route:i?'below':'above',delay:i*100});
        if (index >= 2) connect('fact-'+i,target,evidence[i],'train',
          compact ? {from:'left',to:'right',lane:i?5:-5,delay:i*100} : {delay:i*100});
        if (index === 3) connect('answer-'+i,evidence[i],answer,'ce',{delay:i*100});
      });
      applyMissing();
    }
    if (index === 4) {
      const options = {from:'bottom',to:'top',route:'vertical'};
      connect('gate-upper',gate,upper,'muted',options);
      connect('gate-lower',gate,lower,'probe',{...options,travel:true});
      connect('lane-kept',lower,kept,'probe',compact?{...options,travel:true}:{travel:true});
      if(!fixed){
        const from = questions[1].getBoundingClientRect(), to = gate.getBoundingClientRect(), origin=shell.getBoundingClientRect();
        const width = Math.min(from.width, compact ? 184 : 285);
        flight.style.width = width+'px';
        flight.style.left = (to.left+to.width/2-origin.left-width/2)+'px';
        flight.style.top = (to.top+to.height/2-origin.top-flight.offsetHeight/2)+'px';
        flightVector = {x:from.left+from.width/2-to.left-to.width/2,y:from.top+from.height/2-to.top-to.height/2};
      }
    }
    wire.end();
    paint(progress);
  }
  function arrange() {
    if (geometryFrame) return;
    geometryFrame=requestAnimationFrame(()=>{geometryFrame=0;layout();});
  }
  function applyMissing() {
    if (index !== 3) return;
    evidence.forEach((node,i)=>{
      const absent = missing===i;
      node.classList.toggle('hd-absent',absent);
      wire.broken('answer-'+i,absent,'ce');
    });
    rail.edges[2].classList.toggle('is-broken',missing>=0);
    expression.textContent=missing>=0?'?':example.compose.expr;
    answer.classList.toggle('hd-undetermined',missing>=0);
  }
  function paint(p) {
    progress=p;
    if (index===0) frame.classList.toggle('hd-struck',p>=.13);
    if (index===1) {
      const active=p<.4?0:p<.79?1:-1;
      boxes.forEach((box,i)=>box.classList.toggle('hd-pulsing',!fixed&&i===active));
    }
    if (index===3) {
      const absent=p>.2&&p<.38?0:p>.53&&p<.72?1:-1;
      if (absent!==missing) {missing=absent;applyMissing();}
    }
    if (index===4) {
      const t=clamp((p-.07)/.34,0,1);
      if (flightVector && !fixed && t>0 && t<1) {
        const left=(1-t)**2;
        flight.style.transform='translate('+flightVector.x*left+'px,'+flightVector.y*left+'px) scale('+(1-.55*t)+')';
        flight.style.opacity=String(Math.min(1,t*6,(1-t)*5)*.9);
      } else flight.style.opacity=0;
      wire.packet(clamp((p-.43)/.39,0,1));
      kept.classList.toggle('is-active',p>=.8);
    }
    if (index===5) train.paint(p);
  }
  function show(next, p=0, still=false) {
    if (next===index) {paint(p);return;}
    entered.splice(0).forEach(animation=>animation.cancel());
    const previous=index;
    index=next;progress=p;missing=-2;
    frame.dataset.scene=names[index];
    strip.hidden=fixed&&index>=2;
    stripLabel.textContent=index===5?'Training':'Question';
    questionStack.hidden=index===5;
    summary.hidden=index!==5;
    frame.classList.toggle('hd-end',fixed||still||p>.85);
    board.setAttribute('aria-hidden',String(index>3));
    for (const {wrap,stages} of pieces) {
      const visible=stages.includes(index);
      wrap.classList.toggle('hd-on',visible); wrap.setAttribute('aria-hidden',String(!visible));
    }
    questions.forEach((q,i)=>{
      const visible=index!==5&&i===(index===0?0:1);
      q.classList.toggle('hd-on',visible);q.setAttribute('aria-hidden',String(!visible));
    });
    pendingText.textContent=index===1?'Awaiting evidence':'Awaiting composition';
    rail.nodes.forEach((node,i)=>node.classList.toggle('is-active',i<=Math.min(index,3)));
    rail.edges.forEach((edge,i)=>{
      edge.classList.toggle('is-active',i<=Math.min(index-1,2));
      edge.classList.toggle('is-broken',index===0&&i===0);
    });
    boxes.forEach(box=>box.classList.remove('hd-pulsing'));
    evidence.forEach(node=>node.classList.remove('hd-absent'));
    flight.style.opacity=0;wire.packet(0);
    layout(still);
    if (previous>=0 && !fixed && !still && frame.isConnected) {
      if (index===1) targets.forEach((slot,i)=>move(slot.firstElementChild,boxes[i],i*100));
      if (index===2) evidence.forEach((slot,i)=>move(slot.firstElementChild,targets[i],i*100));
      if (index===3) move(expression,evidence[0],90);
    }
    paint(p);
  }
  const observer = new ResizeObserver(arrange);
  observer.observe(shell);
  observer.observe(questionStack);
  frame.querySelectorAll('img').forEach(img=>img.addEventListener('load',arrange,{once:true}));
  document.fonts?.ready.then(()=>{if(frame.isConnected) arrange();});
  return {frame,show,paint,arrange,destroy(){
    observer.disconnect();
    if (geometryFrame) cancelAnimationFrame(geometryFrame);
    entered.forEach(a=>a.cancel());
    frame.remove();
  }};
}
