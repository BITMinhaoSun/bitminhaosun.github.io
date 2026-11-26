import { clamp, el, motion } from './common.js';

const ns = 'http:' + '//www.w3.org/2000/svg';
const color = name => 'var(--' + name + ')';
export const numeric = Number.isFinite;
export const fmt = (v, digits = 1) => numeric(v) ? v.toFixed(digits).replace('-', '−') : '—';
export const signed = (v, digits = 1) => numeric(v) ? (v > 0 ? '+' : '') + fmt(v, digits) : '—';

function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text != null) node.textContent = text;
  return node;
}

let tip, current, dismissed, hideTimer;
function hideTip() {
  clearTimeout(hideTimer);
  if (tip) tip.hidden = true;
  current = null;
}

function placeTip(x,y) {
  const rect=current.getBoundingClientRect();
  tip.style.left=clamp((x??rect.left+rect.width/2)-tip.offsetWidth/2,8,innerWidth-tip.offsetWidth-8)+'px';
  const above=(y??rect.top)-tip.offsetHeight-8;
  tip.dataset.side=above>=8?'above':'below';
  tip.style.top=clamp(above>=8?above:rect.bottom+8,8,innerHeight-tip.offsetHeight-8)+'px';
}

function leaveTip(event) {
  const to=event.relatedTarget;
  if(to && (tip?.contains(to)||current?.contains(to)))return;
  clearTimeout(hideTimer);
  hideTimer=setTimeout(()=>{
    if(current && current!==document.activeElement && !current.matches(':hover') && !tip.matches(':hover'))hideTip();
  },220);
}

function showTip(mark,event) {
  if(!tip) {
    tip=el('div','viz-tip');
    // The mark already exposes this exact value as its accessible name.
    tip.setAttribute('aria-hidden','true');tip.hidden=true;document.body.append(tip);
    tip.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
    tip.addEventListener('pointerleave',leaveTip);
    window.addEventListener('scroll',()=>{
      if(!current)return;
      const rect=current.getBoundingClientRect();
      if(current===document.activeElement && rect.bottom>0 && rect.top<innerHeight)placeTip();
      else hideTip();
    },{passive:true,capture:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&current){dismissed=current;hideTip();}});
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.viz-mark,.viz-tip'))hideTip();});
  }
  clearTimeout(hideTimer);
  if(dismissed===mark && event.type!=='click')return;
  dismissed=null;
  if(current===mark)return;
  current=mark;tip.textContent=mark.getAttribute('aria-label');tip.hidden=false;
  placeTip(event.clientX,event.clientY);
}

export function wireTips(host) {
  for(const type of ['pointerover','focusin','click'])host.addEventListener(type,event=>{
    const mark=event.target.closest('.viz-mark');
    if(mark)showTip(mark,event);
  });
  for(const type of ['pointerout','focusout'])host.addEventListener(type,event=>{
    if(dismissed && !dismissed.contains(event.relatedTarget))dismissed=null;
    leaveTip(event);
  });
}

export function dataTable(headers, rows, name) {
  const details = el('details', 'viz-data');
  const table = el('table');
  table.append(el('caption','pl-sr',name));
  const head = table.createTHead().insertRow();
  for (const h of headers) {
    const cell = el('th', '', h);
    cell.scope = 'col';
    head.append(cell);
  }
  const body = table.createTBody();
  rows.forEach(row => {
    const line = body.insertRow();
    row.forEach((value, index) => {
      const cell = el(index ? 'td' : 'th', '', value ?? '—');
      if (!index) cell.scope = 'row';
      line.append(cell);
    });
  });
  const scroll = el('div', 'viz-table-scroll');
  scroll.append(table);
  const summary=el('summary','','Data');
  summary.setAttribute('aria-label','Data — '+name);
  details.append(summary, scroll);
  return details;
}

function limits(values, includeZero = true) {
  const good = values.filter(numeric);
  if (!good.length) return [0, 1];
  const lo = Math.min(...good), hi = Math.max(...good);
  if (includeZero) return [Math.min(0, lo), Math.max(1, hi) * 1.06];
  const pad = (hi - lo || Math.abs(hi) || 1) * .12;
  return [lo - pad, hi + pad];
}
const scale = (a, b, lo, hi) => v => lo + (v - a) * (hi - lo) / (b - a || 1);
const cardLabelWidth = width => Math.min(112, Math.round(width*.3));

class Drawing {
  constructor(width, title) {
    this.w = width;
    this.y = 10;
    this.node = svg('svg', { class: 'viz-svg', role: 'img', 'aria-label': title, width: '100%' });
  }
  text(x, y, value, style = '', anchor = 'start', parent = this.node) {
    parent.append(svg('text', { x, y, class: 'viz-text ' + style, 'text-anchor': anchor }, value));
  }
  labelWidth(labels) {
    const ruler=svg('text',{class:'viz-text viz-label',visibility:'hidden','aria-hidden':'true'});
    this.node.append(ruler);
    let widest=0;
    for(const label of new Set(labels)){
      ruler.textContent=label;
      widest=Math.max(widest,ruler.getComputedTextLength());
    }
    ruler.remove();
    return Math.ceil(widest);
  }
  line(x1,y1,x2,y2,tone = 'line',weight = 1,parent = this.node) {
    const line = svg('line', { x1,y1,x2,y2,stroke:color(tone),'stroke-width':weight,'stroke-linecap':'round' });
    parent.append(line);
    return line;
  }
  mark(label, x, y, w, h) {
    const group = svg('g', { class: 'viz-mark', tabindex: 0, role: 'img', 'aria-label': label });
    group.append(svg('rect', { x, y, width: w, height: h, fill: 'transparent' }));
    this.node.append(group);
    return group;
  }
  dot(parent,x,y,tone,hollow = false,offset = 0) {
    const dot = svg('circle', { cx:x,cy:y,r:4.8,fill:color(hollow?'surface':tone),stroke:color(tone),'stroke-width':2 });
    dot.dataset.move = offset;
    parent.append(dot);
  }
  bar(parent,x,y,w,tone,h = 9) {
    parent.append(svg('rect', { x,y:y-h/2,width:Math.max(0,w),height:h,rx:2,fill:color(tone),class:'viz-grow' }));
  }
  group(label) {
    this.y += 18;
    this.text(2,this.y,label,'viz-heading');
    this.y += 11;
  }
  finish() {
    const h = Math.ceil(this.y + 10);
    this.node.setAttribute('viewBox','0 0 ' + this.w + ' ' + h);
    this.node.setAttribute('height',h);
    return this.node;
  }
}

function pairs(g, plot) {
  const compact = g.w < 540;
  const left = compact ? 101 : 134;
  const right = g.w - (plot.delta ? (compact ? 49 : 178) : (compact ? 10 : 116));
  const [lo,hi] = plot.domain || limits(plot.rows.flatMap(r=>[r.base,r.race]),false);
  const x = scale(lo,hi,left,right);
  const digits = plot.digits ?? 1;
  if (plot.delta) {
    if (!compact) {
      g.text(g.w-142,g.y+8,'Base agent','viz-muted','middle');
      g.text(g.w-76,g.y+8,'RACE','viz-ra','middle');
    }
    g.text(g.w-3,g.y+8,'Δ','viz-heading','end');
    g.y += 13;
  }
  if (plot.domain) {
    const step = compact ? 30 : 10;
    for (let v = lo; v <= hi; v += step) g.text(x(v),g.y+10,v,'viz-muted','middle');
    g.y += 15;
  }
  let group;
  for (const r of plot.rows) {
    if (r.group && r.group !== group) { g.group(r.group); group = r.group; }
    const h = compact || r.note ? 47 : 35, y = g.y + h / 2;
    g.line(1,g.y,g.w-1,g.y).classList.add('viz-grid');
    const base = fmt(r.base,digits), race = fmt(r.race,digits);
    const delta = r.printedDelta ?? signed(r.delta,digits);
    const label = [r.label,r.primary?'Primary benchmark':'','Base agent '+base,'RACE '+race,plot.delta ? 'Δ '+delta : '',r.note].filter(Boolean).join(' · ');
    const m = g.mark(label,0,g.y,g.w,h);
    g.text(2,y-1,r.label,'viz-label','start',m);
    if (compact || r.note) {
      const tail = [compact ? base+' → '+race : '',r.note].filter(Boolean).join(' · ');
      g.text(2,y+14,tail,'viz-muted','start',m);
    }
    if (r.primary && !compact) g.text(73,y-1,'primary','viz-muted','start',m);
    if (r.primary && compact) g.text(57,y-1,'primary','viz-muted','start',m);
    if (numeric(r.base) && numeric(r.race)) {
      const line = g.line(x(r.base),y,x(r.race),y,r.delta < 0 ? 'neg' : (plot.delta ? 'pos' : 'ra-mid'),3,m);
      line.classList.add('viz-grow');
    }
    if (numeric(r.base)) g.dot(m,x(r.base),y,'base',true);
    if (numeric(r.race)) g.dot(m,x(r.race),y,'race',false,numeric(r.base)?x(r.base)-x(r.race):0);
    if (!compact) {
      g.text(g.w-(plot.delta?142:77),y+4,base,'viz-number','middle',m);
      g.text(g.w-(plot.delta?76:19),y+4,race,'viz-number viz-ra','middle',m);
    }
    if (plot.delta) g.text(g.w-3,y+4,delta,'viz-number '+(r.delta < 0?'viz-neg':'viz-pos'),'end',m);
    g.y += h;
  }
}

function bars(g,plot) {
  const all = plot.groups.flatMap(group => group.items);
  const [,hi] = plot.domain || limits(all.map(item => item.value));
  const inline=plot.layout==='inline', bundle=plot.layout==='bundle', thick=plot.layout==='thick';
  const left=inline?cardLabelWidth(g.w):4, x=scale(0,hi,left,g.w-45);
  for (const group of plot.groups) {
    if (group.label && inline) {g.y+=10;g.text(2,g.y,group.label,'viz-heading');g.y+=4;}
    else if (group.label) g.group(group.label);
    for (const item of group.items) {
      const small=inline||bundle, h=thick?61:small?17:(item.note?47:32), y=g.y+(small?9:12);
      const value=fmt(item.value,plot.digits??1);
      const label=[group.label,item.label,value,item.note].filter(Boolean).join(' · ');
      const m=g.mark(label,0,g.y,g.w,h);
      if(!bundle) g.text(3,inline?y+4:y,item.short||item.label,'viz-label','start',m);
      const barY=thick?y+16:small?y:y+12;
      if(numeric(item.value)) g.bar(m,left,barY,x(item.value)-left,item.tone,thick?16:9);
      g.text(numeric(item.value)?x(item.value)+7:left,barY+4,value+(thick?'%':''),'viz-number','start',m);
      if(item.note) g.text(3,y+30,item.note,'viz-muted','start',m);
      g.y+=h;
    }
    if(group.label) g.y+=4;
  }
}

function comparison(g,plot) {
  const columns=plot.layout!=='single'&&g.w>=435?2:1, gap=22, cell=(g.w-gap*(columns-1))/columns;
  const [,max]=limits(plot.groups.flatMap(group=>group.items.map(i=>i.value)));
  const rows=Math.max(...plot.groups.map(group=>group.items.length));
  const pitch=16,groupH=rows*pitch+18;
  plot.groups.forEach((group,i)=>{
    const left=(i%columns)*(cell+gap)+2, top=3+Math.floor(i/columns)*groupH;
    const x=scale(0,max,left,left+cell-42);
    g.text(left,top+9,group.label,'viz-heading');
    group.items.forEach((item,j)=>{
      const y=top+20+j*pitch, value=fmt(item.value,plot.digits);
      const m=g.mark(group.label+' · '+item.label+' · '+value,left,y-pitch/2,cell-2,pitch);
      if(numeric(item.value)) g.bar(m,left,y,x(item.value)-left,item.tone,8);
      g.text((numeric(item.value)?x(item.value):left)+5,y+4,value,'viz-number','start',m);
    });
  });
  g.y=Math.ceil(plot.groups.length/columns)*groupH-2;
}

function roundPairs(g,plot) {
  const left=cardLabelWidth(g.w), pane=(g.w-left)/plot.metrics.length;
  const axes=plot.metrics.map((metric,i)=>{
    const values=metric.rows.flatMap(r=>[r.base,r.race]).filter(numeric);
    const min=values.length?Math.min(...values):0,max=values.length?Math.max(...values):1;
    const span=max-min||Math.abs(max)||1, unit=10**Math.floor(Math.log10(span));
    const step=span/unit>=5?2*unit:unit;
    const lo=Math.floor(min/step)*step,hi=Math.max(lo+step,Math.ceil(max/step)*step);
    g.text(left+pane*(i+.5),12,metric.short,'viz-heading','middle');
    return {lo,hi,x:scale(lo,hi,left+i*pane+5,left+(i+1)*pane-8)};
  });
  g.y=22;
  for(const [rowIndex,row] of plot.metrics[0].rows.entries()) {
    g.line(1,g.y,g.w-1,g.y).classList.add('viz-grid');
    g.text(2,g.y+14,row.label,'viz-label');
    if(row.note) g.text(2,g.y+31,row.note,'viz-muted viz-limit');
    plot.metrics.forEach((metric,i)=>{
      const r=metric.rows[rowIndex], base=fmt(r.base,metric.digits), race=fmt(r.race,metric.digits);
      const x=axes[i].x, y=g.y+10;
      const m=g.mark([row.label,row.note,metric.title,'Base agent '+base,'RACE '+race].filter(Boolean).join(' · '),left+i*pane,g.y,pane,36);
      if(numeric(r.base) && numeric(r.race)) g.line(x(r.base),y,x(r.race),y,'ra-mid',2,m);
      if(numeric(r.base)) g.dot(m,x(r.base),y,'base',true);
      if(numeric(r.race)) g.dot(m,x(r.race),y,'race');
      g.text(left+pane*(i+.5),g.y+29,base+' → '+race,'viz-number','middle',m);
    });
    g.y+=37;
  }
  for(const {lo,hi,x} of axes){
    g.line(x(lo),g.y,x(hi),g.y).classList.add('viz-grid');
    for(const v of [lo,hi]){
      g.line(x(v),g.y,x(v),g.y+4);
      g.text(x(v),g.y+16,Number(v.toPrecision(8)),'viz-muted viz-endpoint',v===lo?'start':'end');
    }
  }
  g.y+=17;
}

function shares(g,plot) {
  const left=1, width=g.w-2, height=15;
  g.node.append(svg('rect',{class:'viz-share-track',x:left,y:8,width,height,rx:3,fill:color('panel'),stroke:color('line')}));
  let offset=0;
  for(const part of plot.items) {
    if(!numeric(part.value)) continue;
    const length=width*part.value/100;
    const m=g.mark(part.label+' · '+fmt(part.value,plot.digits)+'%',left+offset,4,length,24);
    m.append(svg('rect',{x:left+offset,y:8,width:length,height,fill:color(part.tone),class:'viz-grow'}));
    offset+=length;
  }
  g.y=23;
}

function stairs(g,plot) {
  for (const p of plot.panels) {
    if (p.label) g.group(p.label);
    const n=p.items.length, x=scale(0,n-1,36,g.w-36);
    const [lo,hi]=limits(p.items.map(i=>i.value),false);
    const y=scale(lo,hi,g.y+90,g.y+22);
    p.items.forEach((item,i) => {
      if (!numeric(item.value)) return;
      const cx=x(i), cy=y(item.value), prev=p.items[i-1];
      if (prev && numeric(prev.value)) {
        const mid=(cx+x(i-1))/2;
        const line=svg('path',{d:'M'+x(i-1)+' '+y(prev.value)+'H'+mid+'V'+cy+'H'+cx,fill:'none',stroke:color(i===1?'ra-mid':'ce'),'stroke-width':2,class:'viz-grow'});
        g.node.append(line);
        if (item.step) g.text(mid,g.y+10,item.step,'viz-number '+(i===1?'viz-ra':'viz-ce'),'middle');
      }
      const m=g.mark(item.label+' · '+fmt(item.value,plot.digits),cx-23,cy-20,46,38);
      g.dot(m,cx,cy,item.tone);
      g.text(cx,cy-11,fmt(item.value,plot.digits),'viz-number','middle',m);
      g.text(cx,g.y+112,item.short,'viz-label','middle');
    });
    g.y+=130;
  }
}

function lines(g,plot) {
  g.y=4;
  const p=plot.panel, count=p.budgets.length;
  const observed=[...p.base,...p.race].filter(numeric);
  const lo=observed.length?Math.floor(Math.min(...observed)/5)*5:0;
  const hi=observed.length?Math.max(lo+5,Math.ceil(Math.max(...observed)/5)*5):5;
  const step=Math.max(5,Math.ceil((hi-lo)/25)*5);
  const compact=g.w<360 && count>2, right=g.w-(compact?16:32), first=29;
  let x=scale(0,count-1,first,right);
  if(compact){
    const needed=g.labelWidth([p.budgets.at(-1)])+g.labelWidth([p.budgets.at(-2)])/2+8;
    const prev=right-Math.max(needed,(right-first)/(count-1)),prefix=scale(0,count-2,first,prev);
    x=i=>i===count-1?right:prefix(i);
  }
  const y=scale(lo,hi,g.y+85,g.y+4);
  for(let v=lo;v<=hi;v+=step) {
    g.line(25,y(v),g.w-8,y(v)).classList.add('viz-grid');
    g.text(1,y(v)+4,v,'viz-muted viz-tick');
  }
  for(const [key,tone] of [['base','base'],['race','race']]) {
    let path='';
    p[key].forEach((v,i)=>{ if(numeric(v)) path+=(i && numeric(p[key][i-1])?' L':' M')+x(i)+' '+y(v); });
    g.node.append(svg('path',{d:path,fill:'none',stroke:color(tone),'stroke-width':2.2,class:'viz-grow'}));
    p[key].forEach((v,i)=>{
      if(!numeric(v)) return;
      const m=g.mark(p.budgets[i]+' · '+(key==='race'?'RACE':'Base agent')+' '+fmt(v,plot.digits),x(i)-10,y(v)-10,20,20);
      g.dot(m,x(i),y(v),tone,key==='base');
    });
  }
  g.text(2,g.y+124,'RACE − Base agent','viz-muted');
  p.budgets.forEach((v,i)=>{
    g.text(x(i),g.y+104,v,'viz-label',compact&&i===count-1?'end':'middle');
    g.text(x(i),g.y+142,p.delta_labels?.[i]??signed(p.delta[i],plot.digits),'viz-number viz-pos','middle');
  });
  g.y+=145;
}

function whiskers(g,plot) {
  const samples=plot.groups.flatMap(group=>group.items);
  const [lo,hi]=limits(samples.filter(s=>numeric(s.value)&&numeric(s.std)).flatMap(s=>[s.value-s.std,s.value+s.std]),false);
  const x=scale(lo,hi,66,g.w-93);
  for(const group of plot.groups) {
    g.line(0,g.y,g.w,g.y).classList.add('viz-grid');
    g.text(2,g.y+21,group.label,'viz-label');
    for(const item of group.items) {
      const y=g.y+11, val=fmt(item.value,plot.digits)+' ± '+fmt(item.std,plot.digits);
      const m=g.mark(group.label+' · '+item.label+' '+val,0,g.y,g.w,27);
      if(numeric(item.value)&&numeric(item.std)) {
        const a=x(item.value-item.std), b=x(item.value+item.std);
        g.line(a,y,b,y,item.tone,2,m);
        [a,b].forEach(cx=>g.line(cx,y-4,cx,y+4,item.tone,1.4,m));
        g.dot(m,x(item.value),y,item.tone,item.tone==='base');
      }
      g.text(g.w-4,y+4,val,'viz-number','end',m);
      g.y+=19;
    }
    g.y+=4;
  }
}

function checklistPanels(g,plot) {
  const wide=g.w>=464, gap=16, width=wide?(g.w-gap)/2:g.w;
  const [,hi]=limits(plot.items.map(i=>i.total));
  const labels=[...plot.items,...plot.groups.flatMap(group=>group.items)].map(item=>item.label);
  const start=2+g.labelWidth(labels)+8;
  const x=scale(0,hi,start,width-37);
  g.text(2,13,plot.accuracy,'viz-heading');
  g.y=20;
  for(const item of plot.items) {
    const y=g.y+8;
    const label=[item.label,...item.parts.map(p=>p.label+' '+fmt(p.value)), 'Total '+fmt(item.total)].join(' · ');
    const m=g.mark(label,0,g.y,width,21);
    g.text(2,y+4,item.label,'viz-label','start',m);
    let offset=0;
    for(const part of item.parts) {
      if(!numeric(part.value)) continue;
      g.bar(m,x(offset),y,x(offset+part.value)-x(offset),part.tone,11);
      offset+=part.value;
    }
    g.text(x(offset)+5,y+4,fmt(item.total),'viz-number','start',m);
    g.y+=22;
  }
  const left=wide?width+gap:0, top=wide?2:g.y+5;
  const max=limits(plot.groups.flatMap(group=>group.items.map(i=>i.value)))[1];
  const pos=scale(0,max,left+start,left+width-37);
  for(const [i,group] of plot.groups.entries()) {
    const y=top+i*52;
    g.text(left+2,y+11,group.label,'viz-heading');
    group.items.forEach((item,j)=>{
      const cy=y+25+j*15, value=fmt(item.value);
      const m=g.mark(group.label+' · '+item.label+' · '+value,left,cy-7,width,15);
      g.text(left+2,cy+4,item.label,'viz-label','start',m);
      if(numeric(item.value)) g.bar(m,pos(0),cy,pos(item.value)-pos(0),item.tone);
      g.text((numeric(item.value)?pos(item.value):pos(0))+5,cy+4,value,'viz-number','start',m);
    });
  }
  g.y=top+plot.groups.length*52;
}

const renderers={pairs,bars,comparison,roundPairs,shares,stairs,lines,whiskers,checklistPanels};
export function renderPlot(plot,width,host) {
  const g=new Drawing(width,plot.title);
  host.append(g.node);
  renderers[plot.kind](g,plot);
  return g.finish();
}

export function animatePlot(host) {
  if (motion.matches) return;
  host.querySelectorAll('.viz-grow,[data-move]').forEach((node,i)=>{
    const translate=node.dataset.move;
    const from = translate != null ? 'translateX('+translate+'px)' : 'scaleX(0)';
    node.animate([{transform:from,opacity:.25},{transform:'none',opacity:1}],{
      duration:700,delay:Math.min(i,12)*40,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'
    });
  });
}
