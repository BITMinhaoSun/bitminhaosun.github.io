const dataCache = new Map();
const warnings = new Set();
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=preference.matches;
preference.addEventListener('change',event=>{reduced=event.matches;});
// Keep frame loops on the same preference until the browser delivers its change event.
export const motion={
  get matches(){return reduced;},
  addEventListener:preference.addEventListener.bind(preference)
};
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const pad = value => String(value).padStart(2, '0');

let stylesReady;
export function instrumentStyles() {
  if (stylesReady) return stylesReady;
  const href = new URL('components.css',import.meta.url).href;
  const anchor = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>link.href===href);
  const sheet = document.createElement('link');
  sheet.rel='stylesheet';sheet.href=new URL('instruments.css',import.meta.url).href;
  stylesReady=new Promise((resolve,reject)=>{
    sheet.onload=resolve;
    sheet.onerror=()=>{sheet.remove();stylesReady=null;reject(Error('Component styles unavailable'));};
    if(anchor) anchor.after(sheet);else document.head.append(sheet);
  });
  return stylesReady;
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function button(text, className, action) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

export function warnOnce(key) {
  if (warnings.has(key)) return;
  warnings.add(key);
  console.warn('Unavailable:', key);
}

export function unavailable(root, key) {
  warnOnce(key);
  const note = el('p', 'viz-unavailable', 'Unavailable');
  note.setAttribute('role', 'status');
  root.append(note);
  return note;
}

export function getJSON(path) {
  const url = new URL(path, document.baseURI);
  if (!dataCache.has(url.href)) {
    const request = fetch(url).then(response => {
      if (!response.ok) throw new Error('Missing data');
      return response.json();
    }).catch(() => {
      dataCache.delete(url.href);
      warnOnce(path);
      return null;
    });
    dataCache.set(url.href, request);
  }
  return dataCache.get(url.href);
}

// Preserve the original question, including punctuation and repeated phrases.
export function highlight(node, text = '', spans = [], length = Infinity) {
  const fragment = document.createDocumentFragment();
  const question = String(text);
  const limit = Math.min(length, question.length);
  const matches = [];
  for (const span of spans || []) {
    if (!span.text) continue;
    const start = question.indexOf(span.text);
    if (start >= 0) matches.push({ start, end: start + span.text.length, tone: span.tone });
  }
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  let end = 0;
  for (const match of matches) {
    if (match.start < end || match.start >= limit) continue;
    fragment.append(question.slice(end, match.start));
    const mark = el('mark', 'hd-mark', question.slice(match.start, Math.min(match.end, limit)));
    mark.dataset.tone = match.tone || 'ra';
    fragment.append(mark);
    end = match.end;
  }
  if (end < limit) fragment.append(question.slice(end, limit));
  node.replaceChildren(fragment);
}

export function photo(info, prefix, withBoxes = true, cropRatio = null) {
  const figure = el('figure', prefix + '-photo');
  const frame = el('div', prefix + '-frame');
  const img = el('img');
  img.alt = info.alt || '';
  img.decoding = 'async';
  if (info.width && info.height) {
    img.width = info.width;
    img.height = info.height;
    frame.style.aspectRatio = info.width + ' / ' + info.height;
  }
  if(cropRatio)frame.style.aspectRatio=String(cropRatio);
  if (info.src) img.src = new URL(info.src, document.baseURI);
  frame.append(img);
  if (withBoxes) for (const box of info.boxes || []) {
    const bounds = el('span', prefix + '-box');
    bounds.dataset.candidate = box.id;
    bounds.dataset.tone = box.tone || 'ra';
    bounds.setAttribute('aria-hidden', 'true');
    if (![box.x,box.y,box.w,box.h].every(Number.isFinite)) continue;
    const ratio=cropRatio&&info.width&&info.height?info.width/info.height/cropRatio:1;
    const sx=Math.max(1,ratio),sy=Math.max(1,1/ratio);
    const coords=[clamp(box.x,0,1)*sx-(sx-1)/2,clamp(box.y,0,1)*sy,clamp(box.w,0,1)*sx,clamp(box.h,0,1)*sy];
    for (const [i, prop] of ['left','top','width','height'].entries()) {
      bounds.style[prop] = coords[i] * 100 + '%';
    }
    bounds.append(el('b', '', box.id));
    frame.append(bounds);
  }
  figure.append(frame);
  if (prefix === 'pl' && info.caption) figure.append(el('figcaption', '', info.caption));
  return figure;
}

// A full-height stage on a small screen can still occupy the whole viewport.
export function visibility(node, callback) {
  let ratio = 0;
  const update = () => callback(document.hidden ? 0 : ratio);
  const observer = new IntersectionObserver(([entry]) => {
    const height = Math.min(entry.boundingClientRect.height, entry.rootBounds?.height || innerHeight);
    ratio = entry.isIntersecting && height > 0 ? entry.intersectionRect.height / height : 0;
    update();
  }, { threshold: Array.from({ length: 51 }, (_, n) => n / 50) });
  observer.observe(node);
  document.addEventListener('visibilitychange', update);
}
