import { svgNode } from './icons.js';

let instance = 0;

function point(element, edge, origin) {
  const fragments = element.getClientRects();
  if (!fragments.length) return null;
  const box = edge === 'bottom' ? fragments[fragments.length - 1] : fragments[0];
  if (!box.width || !box.height) return null;
  // Slot coordinates stay fixed while a newly selected layer slides into place.
  const layer = element.closest('.hd-layer');
  const transform = layer && getComputedStyle(layer).transform;
  const shift = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform) : null;
  return {
    x: box.left - origin.left - (shift?.m41 || 0) + box.width * ({left: 0, right: 1}[edge] ?? .5),
    y: box.top - origin.top - (shift?.m42 || 0) + box.height * ({top: 0, bottom: 1}[edge] ?? .5),
  };
}

function curve(a, b, route, lane) {
  const start = 'M ' + a.x + ' ' + a.y + ' ';
  const midX = (a.x + b.x) / 2 + lane;
  const midY = (a.y + b.y) / 2 + lane;
  if (route === 'above' || route === 'below') {
    const y = route === 'above' ? Math.min(a.y, b.y) - 12 : Math.max(a.y, b.y) + 12;
    const lead = Math.min(18, Math.max(3, (b.x - a.x) / 4));
    return start + 'Q ' + a.x + ' ' + y + ' ' + (a.x + lead) + ' ' + y +
      ' H ' + (b.x - lead) + ' Q ' + (b.x - 3) + ' ' + y + ' ' + b.x + ' ' + b.y;
  }
  if (route === 'vertical') {
    return start + 'C ' + a.x + ' ' + midY + ' ' + b.x + ' ' + midY + ' ' + b.x + ' ' + b.y;
  }
  if (route === 'bypass') {
    const endY=b.y-7, bend=Math.min(44,Math.abs(endY-a.y)/2);
    return start+'C '+a.x+' '+(a.y+bend)+' '+b.x+' '+(endY-bend)+' '+b.x+' '+endY;
  }
  return start + 'C ' + midX + ' ' + a.y + ' ' + midX + ' ' + b.y + ' ' + b.x + ' ' + b.y;
}

// Measure stationary slots. Only their inner cards move, so a connector never chases a moving endpoint.
export function wireLayer(shell) {
  const prefix = 'hd-line-' + (++instance) + '-';
  const svg = svgNode('svg', {'class':'hd-wires','aria-hidden':'true',focusable:'false'});
  const defs = svgNode('defs');
  const paths = svgNode('g');
  const parcel = svgNode('g', {'class':'hd-parcel', opacity:0});
  parcel.append(svgNode('rect',{x:-7,y:-5,width:14,height:10,rx:2}),
    svgNode('path',{d:'M-4 -1H4 M-4 2H1'}));
  svg.append(defs, paths, parcel);
  shell.append(svg);
  const wires = new Map();
  let origin, used, travel = [];

  function begin() {
    origin = shell.getBoundingClientRect();
    used = new Set();
    travel = [];
  }
  function connect(id, from, to, tone, options = {}) {
    if (!from || !to) return;
    const a = point(from, options.from || 'right', origin);
    const b = point(to, options.to || 'left', origin);
    if (!a || !b) return;
    let wire = wires.get(id);
    if (!wire) {
      const maskId = prefix + id;
      const mask = svgNode('mask',{id:maskId,maskUnits:'userSpaceOnUse',x:0,y:0,width:'100%',height:'100%'});
      const pen = svgNode('path',{pathLength:1,fill:'none',stroke:'white','stroke-width':7,'stroke-linecap':'round'});
      mask.append(pen); defs.append(mask);
      const path = svgNode('path',{'class':'hd-wire',fill:'none',mask:'url(#'+maskId+')'});
      paths.append(path);
      wire = {path,pen,on:false}; wires.set(id,wire);
    }
    const d = curve(a,b,options.route,options.lane || 0);
    if (wire.path.getAttribute('d') !== d) {
      wire.path.setAttribute('d',d);
      wire.pen.setAttribute('d',d);
    }
    wire.path.dataset.tone = tone;
    wire.path.classList.toggle('hd-dashed', Boolean(options.dashed));
    if (!wire.on) {
      wire.path.classList.add('is-on');
      if (!options.still) {
        wire.pen.animate([{strokeDashoffset:1},{strokeDashoffset:0}], {
          duration:620, delay:options.delay || 0, fill:'backwards', easing:'cubic-bezier(.16,1,.3,1)'
        });
      }
      wire.on = true;
    }
    used.add(id);
    if (options.travel) travel.push({path:wire.path,length:wire.path.getTotalLength()});
  }
  function end() {
    for (const [id, wire] of wires) {
      if (used.has(id)) continue;
      wire.path.classList.remove('is-on');
      wire.on = false;
    }
  }
  function broken(id, value, normal) {
    const wire = wires.get(id);
    if (!wire) return;
    wire.path.classList.toggle('hd-dashed',value);
    wire.path.dataset.tone = value ? 'break' : normal;
  }
  function packet(fraction) {
    if (fraction <= 0 || fraction >= 1 || !travel.length) {
      parcel.setAttribute('opacity',0);
      return;
    }
    let distance = fraction * travel.reduce((sum,part)=>sum+part.length,0);
    let part = travel[0];
    for (const next of travel) {
      part = next;
      if (distance <= part.length) break;
      distance -= part.length;
    }
    const p = part.path.getPointAtLength(Math.min(distance,part.length));
    parcel.setAttribute('transform','translate('+p.x+' '+p.y+')');
    parcel.setAttribute('opacity',1);
  }
  return {begin,connect,end,broken,packet};
}
