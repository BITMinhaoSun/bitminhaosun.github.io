import { el, button, getJSON, instrumentStyles, unavailable, visibility, motion } from './common.js';
import { renderPlot, animatePlot, dataTable, fmt, signed, wireTips, numeric } from './chart-kit.js';

const name = item => typeof item === 'string' ? item : (item?.label ?? item?.title ?? item?.name ?? item?.id ?? '');
const key = item => typeof item === 'string' ? item : (item?.id ?? '');
const matches = (item, regex) => regex.test([key(item), name(item), item?.role].join(' '));
const options = entries => entries.map(([id,label])=>({id,label}));
const legend = entries => entries.map(([label,tone])=>({label,tone}));
const avgIndex = cats => cats.findIndex(c=>matches(c,/\bavg\b|average/i));
const roleColor = (s,i) => {
  if (matches(s,/\brace\b|\bours\b|\btrained\b/i)) return 'race';
  if (matches(s,/\bra\b|ra.only/i)) return 'ra-mid';
  if (s.role==='base-2') return 'base-2';
  if (matches(s,/\bbase\b/i)) return 'base';
  return i === 0 ? 'base' : 'base-2';
};
const pairLegend=legend([['Base agent','base'],['RACE','race']]);
const categories = d => d.categories || [];
const itemAt = (s,i) => s?.values?.[i] ?? null;
const panelList = value => Array.isArray(value) ? value : Object.entries(value || {}).map(([id,p])=>({id,...p}));
const numericNote = v => typeof v === 'string' ? v : (v?.label || v?.text || '');
const asList = v => Array.isArray(v) ? v : v ? [v] : [];
const sourceRace = c => matches(c,/\brace\b|\bours\b|\btrained\b/i);

function resultsView(d, choice) {
  const base = d.rows.find(r=>r.id==='base'), race=d.rows.find(r=>r.id==='race');
  const delta=d.rows.find(r=>r.kind==='delta' || r.id==='delta');
  const groups=new Map(d.groups.map(g=>[g.id,g.label]));
  const groupsInOrder=[...new Set(d.columns.map(c=>c.group))];
  const rows=groupsInOrder.flatMap(id=>{
    const subset=d.columns.filter(c=>c.group===id);
    if(choice==='gain') subset.sort((a,b)=>(delta.scores[b.id]??-Infinity)-(delta.scores[a.id]??-Infinity));
    return subset.map(c=>({label:c.label,full:c.full,group:groups.get(id) || (id==='avg'?'Average':id),
      primary:c.primary,base:base.scores[c.id],race:race.scores[c.id],delta:delta.scores[c.id],printedDelta:delta.display?.[c.id]}));
  });
  return {choices:options([['order','Paper order'],['gain','By gain']]),legend:pairLegend,
    plots:[{kind:'pairs',title:'Base agent and RACE accuracy by benchmark',rows,delta:true,domain:[20,90]}],
    headers:['Benchmark','Base agent','RACE',delta.model],
    rows:rows.map(r=>[r.full||r.label,fmt(r.base),fmt(r.race),r.printedDelta??signed(r.delta)])};
}

function groupsView(title,groups,digits=1,items={}) {
  const rows=groups.flatMap(g=>g.items.map(a=>[g.label||title,a.label,fmt(a.value,digits),...(items.notesColumn?[a.note||'—']:[])]));
  return {plots:[{kind:items.kind || 'bars',title,groups,digits,layout:items.layout}],headers:['Measure','Setting','Value',...(items.notesColumn?['Sample']:[])],
    rows,...items};
}

function grouped(d,id) {
  const digits=d.decimals ?? 1, cats=categories(d);
  const masking=id==='masking';
  const toneOf=(s,i)=>masking ? (matches(s,/\bnone\b|unmasked/i)?'race':['base','base-2','muted'][Math.max(0,i-1)%3]) : roleColor(s,i);
  const groups=cats.filter(c=>!matches(c,/\bavg\b/i)).map(c=>{
    const i=cats.indexOf(c);
    return {label:name(c),items:d.series.map((s,j)=>({label:name(s),tone:toneOf(s,j),value:itemAt(s,i)}))};
  });
  return groupsView(d.title,groups,digits,{kind:'comparison',layout:masking?'single':'bundle',legend:d.series.map((s,i)=>({label:name(s),tone:toneOf(s,i)}))});
}

function ablation(d,choice) {
  const cats=categories(d), avg=avgIndex(cats);
  const indices=cats.map((c,i)=>i).filter(i=>choice==='each' ? i!==avg : i===avg);
  const panels=indices.map(i=>({label:name(cats[i]),items:d.series.map((s,j)=>{
    const step=d.steps?.find(st=>st.category===key(cats[i]) && st.to===s.id);
    const op=j===1?'RA':'CE';
    const short=['Base agent','RA','RACE'][j] || name(s);
    const annotation=step?.label || '';
    return {label:name(s),short,tone:roleColor(s,j),value:itemAt(s,i),
      step:annotation && !annotation.includes(op)?annotation+' '+op:annotation};
  })}));
  return {choices:options([['avg','Average'],['each','Per benchmark']]),plots:[{kind:'stairs',title:d.title,panels,digits:d.decimals}],
    headers:['Benchmark','Training data','Accuracy','Step'],rows:panels.flatMap(p=>p.items.map(it=>[p.label,it.label,fmt(it.value),it.step||'—']))};
}

function composition(d) {
  const i=avgIndex(categories(d));
  const items=d.series.map((s,j)=>{
    const meta=s.meta || {};
    const traj=meta.trajectories??meta.trajectory_count, share=meta.multi_image_share??meta.multi_image;
    const note=[traj==null?'':Number(traj).toLocaleString('en-US')+' trajectories',share==null?'':String(share).replace(/%$/,'')+'% multi-image'].filter(Boolean).join(' · ');
    return {label:name(s),value:itemAt(s,i),tone:roleColor(s,j),note};
  });
  return groupsView(d.title,[{items}],d.decimals,{notesColumn:true,notes:asList(d.annotations).map(a=>{
    if(!a.text) return numericNote(a);
    return a.label?.startsWith('+')?a.text.replace(a.label.slice(1),a.label):a.text;
  }).filter(Boolean)});
}

function audit(d,choice) {
  const ordered=d.series.slice().sort((a,b)=>{
    const order=s=>matches(s,/≥|three|3|verified/i)?1:matches(s,/both/i)?0:2;
    return order(a)-order(b);
  });
  const s=ordered.find(s=>s.id===choice) || ordered[0];
  const items=categories(d).map((c,i)=>({label:name(c),value:itemAt(s,i),tone:sourceRace(c)?'race':'base-2'}));
  return groupsView(name(s),[{items}],d.decimals,{choices:ordered.map(item=>({id:item.id,label:name(item)}))});
}

function removal(d) {
  const cats=categories(d);
  const items=d.series.length===1?cats.map((c,i)=>({label:name(c),value:itemAt(d.series[0],i),tone:i?'base':'race'}))
    :d.series.map((s,i)=>({label:name(s),value:itemAt(s,0),tone:i?'base':'race'}));
  return groupsView(d.title,[{items}],d.decimals,{layout:'thick',notes:d.n?['n = '+d.n]:[]});
}

function probe(d) {
  const items=categories(d).map((c,i)=>({label:name(c),value:itemAt(d.series[0],i),tone:i?'break':'probe'}));
  return {plots:[{kind:'shares',title:d.title,items,digits:d.decimals}],
    headers:['Outcome',name(d.series[0])],rows:items.map(item=>[item.label,fmt(item.value,d.decimals)+'%'])};
}

function checklist(d) {
  const cats=categories(d), series=d.series.filter(s=>matches(s,/\bbase\b|\brace\b/i) && !matches(s,/delta|change/i));
  const strict=cats.findIndex(c=>matches(c,/strict|every checklist/i)), missing=cats.findIndex(c=>matches(c,/incomplete|some.*missing|partial/i));
  const total=cats.findIndex(c=>matches(c,/mm.?bc.*acc|overall/i));
  const side=cats.map((c,i)=>({c,i})).filter(({c})=>matches(c,/checklist score|subgoal|checklist_score/i));
  const items=series.map((s,i)=>({label:name(s),total:itemAt(s,total),parts:[
    {label:name(cats[strict]),value:itemAt(s,strict),tone:i?'race':'base'},
    {label:name(cats[missing]),value:itemAt(s,missing),tone:i?'ra-mid':'base-2'}]}));
  const groups=side.map(({c,i})=>({label:name(c),items:series.map((s,j)=>({label:name(s),value:itemAt(s,i),tone:j?'race':'base'}))}));
  return {plots:[{kind:'checklistPanels',title:d.title,accuracy:name(cats[total]),items,groups}],
    legend:legend([[name(cats[strict]),'race'],[name(cats[missing]),'ra-mid']]),
    headers:['Metric',...series.map(name)],rows:[total,strict,missing,...side.map(s=>s.i)].filter(i=>i>=0).map(i=>[name(cats[i]),...series.map(s=>fmt(itemAt(s,i)))])};
}

function budget(d,choice) {
  const panels=panelList(d.panels);
  const p=panels.find(p=>p.id===choice)||panels[0];
  return {choices:panels.map(p=>({id:p.id,label:name(p)})),legend:pairLegend,plots:[{kind:'lines',title:name(p),panel:p}],
    headers:['Tool-call budget','Base agent','RACE','RACE − Base agent'],rows:p.budgets.map((v,i)=>[v,fmt(p.base[i]),fmt(p.race[i]),p.delta_labels?.[i]??signed(p.delta[i])])};
}

function variability(d) {
  const groups=categories(d).map((c,i)=>({label:name(c),items:d.series.map((s,j)=>({
    label:name(s),value:s.mean?.[i]??s.values?.[i]?.mean,std:s.std?.[i]??s.values?.[i]?.std,tone:roleColor(s,j)}))}));
  return {legend:pairLegend,plots:[{kind:'whiskers',title:d.title,groups,digits:d.decimals}],
    headers:['Benchmark','Setting','Mean','Standard deviation'],rows:groups.flatMap(g=>g.items.map(i=>[g.label,i.label,fmt(i.value),fmt(i.std)]))};
}

function rounds(d) {
  const cats=categories(d), panels=panelList(d.panels);
  const metrics=[['rounds','Interaction rounds per trajectory','Rounds'],['calls_per_round','Tool calls per round','Calls / round']].map(([id,title,short])=>{
    const p=d[id] || panels.find(p=>p.id===id) || {};
    const paired=(i,side)=>p[side]?.[i] ?? d.series?.find(s=>s.id===side)?.[id]?.[i] ?? d.rows?.[i]?.[id]?.[side] ?? null;
    const labels=cats.length?cats:d.rows||[];
    const rows=labels.map((c,i)=>{
      const limit=d.turn_limit?.[i]??d.turn_limits?.[i]??c.turn_limit??d.rows?.[i]?.turn_limit;
      return {label:name(c)||c.benchmark,base:paired(i,'base'),race:paired(i,'race'),note:limit!=null?'limit '+limit:''};
    });
    return {title:p.label || p.title || title,short,rows,digits:p.decimals??(id==='calls_per_round'?2:1)};
  });
  return {legend:pairLegend,plots:[{kind:'roundPairs',title:d.title,metrics}],headers:['Metric','Benchmark','Base agent','RACE','Turn limit'],rows:metrics.flatMap(p=>p.rows.map(r=>[p.title,r.label,fmt(r.base,p.digits),fmt(r.race,p.digits),r.note||'—']))};
}

function behavior(d) {
  const cats=categories(d);
  const bySource=cats.some(sourceRace);
  const sources=bySource?cats:d.series, measures=bySource?d.series:cats;
  const groups=measures.slice(0,2).map((m,i)=>({label:name(m),items:sources.map((s,j)=>({label:name(s),short:s.short||name(s),value:bySource?itemAt(m,j):itemAt(s,i),tone:sourceRace(s)?'race':'base-2'}))}));
  return groupsView(d.title,groups,d.decimals,{layout:'inline'});
}

function strata(d) {
  const groups=panelList(d.panels || d.tables);
  const panels=groups.length?groups:[d];
  const plots=panels.map(p=>{
    const rows=(p.rows||p.categories||[]).map((r,i)=>({label:r.stratum||name(r),full:name(r),base:r.base??p.base?.[i]??p.series?.[0]?.values[i],
      race:r.trained??r.race??p.race?.[i]??p.series?.[1]?.values[i]}));
    return {kind:'pairs',title:name(p)||d.title,rows,digits:d.decimals??1};
  });
  return {legend:pairLegend,plots,headers:['Benchmark','Stratum','Base agent','RACE'],rows:plots.flatMap(p=>p.rows.map(r=>[p.title,r.full||r.label,fmt(r.base),fmt(r.race)]))};
}

const views={'results-dumbbell':resultsView,'data-comparison':grouped,masking:grouped,ablation,
  'composition-control':composition,audit,'image-removal':removal,probe,checklist,budget,variability,rounds,'training-behavior':behavior,strata};

export async function mount(root) {
  const id=root.dataset.chart, isResults=id==='results-dumbbell';
  const path=root.dataset.src || 'assets/data/'+(isResults?'results':'evidence')+'.json';
  const [data]=await Promise.all([getJSON(path),instrumentStyles()]);
  const dataset=isResults?data:data?.[root.dataset.key || id.replaceAll('-','_')];
  const shell=el('div','viz-body');
  root.insertBefore(shell,root.querySelector('figcaption'));
  if(!dataset || !views[id]) return unavailable(shell,data?id:path);
  const toolbar=el('div','viz-switch'),legendBox=el('div','viz-legend'),charts=el('div','viz-plots'),tail=el('div','viz-tail');
  toolbar.setAttribute('role','group');
  toolbar.setAttribute('aria-label','Chart view');
  shell.append(toolbar,legendBox,charts,tail);
  wireTips(charts);
  let state, selection, previousWidth=0, visible=false, animated=false;
  const caption=root.querySelector('figcaption')?.textContent.trim();
  const title=root.closest('.ev')?.querySelector('.ev__kicker')?.textContent.trim() || dataset.title || 'Base agent and RACE accuracy by benchmark';
  const choice=()=>state.choices?.find(c=>c.id===selection)?.label;
  const draw=()=>{
    const width=Math.floor(charts.clientWidth);
    if(!width || !state) return;
    previousWidth=width;
    const active=charts.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;
    charts.replaceChildren();
    for(const p of state.plots){
      const block=el('div','viz-plot');
      charts.append(block);
      if(state.plots.length>1) block.append(el('p','viz-subtitle',p.title));
      const svg=renderPlot(p,width,block);
      const example=[...svg.querySelectorAll('.viz-mark[aria-label]')].at(-1)?.getAttribute('aria-label');
      const summary=[caption||p.title,state.plots.length>1?p.title:null,choice(),example].filter(Boolean);
      svg.setAttribute('aria-label',summary.map(s=>s.replace(/[.]$/,'')).join('. ')+'.');
      if(p.kind==='shares') {
        const labels=el('ul','viz-shares');
        labels.append(...p.items.map(item=>{
          const row=el('li');
          row.style.setProperty('--swatch','var(--'+item.tone+')');
          row.append(el('strong','',fmt(item.value,p.digits)+'%'),el('span','',item.label));
          return row;
        }));
        block.append(labels);
      }
    }
    if(active)[...charts.querySelectorAll('.viz-mark')].find(n=>n.getAttribute('aria-label')===active)?.focus({preventScroll:true});
    if(visible && !animated) { animated=true; animatePlot(charts); }
  };
  function select(value) {
    selection=value;
    state=views[id](dataset,(id==='masking'||id==='data-comparison')?id:value);
    if(!selection) selection=state.choices?.[0]?.id;
    if(!toolbar.childElementCount) {
      for(const o of state.choices||[]) {
        const b=button(o.label,'viz-option',()=>select(o.id));
        b.dataset.value=o.id;
        toolbar.append(b);
      }
    }
    toolbar.hidden=!toolbar.childElementCount;
    for(const b of toolbar.children) b.setAttribute('aria-pressed',String(b.dataset.value===selection));
    legendBox.replaceChildren(...(state.legend||[]).map(i=>{
      const tag=el('span','viz-key',i.label);
      tag.style.setProperty('--swatch','var(--'+i.tone+')');
      tag.dataset.hollow=String(i.tone==='base' && ['results-dumbbell','rounds','variability','budget','strata'].includes(id));
      return tag;
    }));
    const wasOpen=tail.querySelector('details')?.open || false;
    const table=dataTable(state.headers,state.rows,[title,choice()].filter(Boolean).join(' · '));
    table.open=wasOpen;
    tail.replaceChildren(...(state.notes||[]).filter(Boolean).map(s=>el('p','viz-note',s)),table);
    draw();
  }
  select();
  motion.addEventListener('change',()=>{
    if(motion.matches)charts.getAnimations({subtree:true}).forEach(a=>a.cancel());
  });
  new ResizeObserver(()=>{if(Math.floor(charts.clientWidth)!==previousWidth) draw();}).observe(charts);
  if(id==='checklist'||id==='budget')document.fonts.addEventListener('loadingdone',draw);
  visibility(root,ratio=>{
    visible=ratio>0;
    if(visible&&!animated&&charts.querySelector('svg')) { animated=true; animatePlot(charts); }
    for(const animation of charts.getAnimations({subtree:true})) {
      if(!visible) animation.pause(); else if(!motion.matches) animation.play();
    }
  });
}
