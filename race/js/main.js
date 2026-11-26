import { el, motion, clamp, unavailable, warnOnce } from './common.js';

// The load event can precede the first paint. Keep the page's deferred
// font sheet inactive until fallback text has actually reached the screen.
function keepFontsAfterPaint() {
  const sheet=document.querySelector('link#font-css[media="print"]');
  if(!sheet || sheet.disabled || document.hidden ||
     !window.PerformanceObserver?.supportedEntryTypes?.includes('paint') ||
     performance.getEntriesByName('first-contentful-paint').length) return;
  const observer=new PerformanceObserver(entries=>{
    if(entries.getEntriesByName('first-contentful-paint').length) release();
  });
  function release() {
    observer.disconnect();clearTimeout(fallback);
    window.removeEventListener('beforeprint',release);
    sheet.disabled=false;
  }
  observer.observe({type:'paint',buffered:true});
  sheet.disabled=true;
  const fallback=setTimeout(release,3000);
  window.addEventListener('beforeprint',release,{once:true});
}

function near(selector, loader, margin='800px 0px') {
  const roots=document.querySelectorAll(selector);
  if(!roots.length) return;
  const begun=new WeakSet();
  function start(root) {
    if(begun.has(root)) return;
    begun.add(root);
    observer.unobserve(root);
    loader(root).catch(()=>unavailable(root,root.dataset.chart||selector));
  }
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries) if(e.isIntersecting) start(e.target);
  },{rootMargin:margin});
  roots.forEach(root=>{
    observer.observe(root);
    root.addEventListener('focusin',()=>start(root),{once:true});
  });
}

function reveal() {
  const nodes=new Set(document.querySelectorAll('[data-reveal]'));
  for(const group of document.querySelectorAll('[data-reveal-stagger]')) [...group.children].forEach((child,i)=>{
    child.style.setProperty('--i',i);
    nodes.add(child);
  });
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries) if(e.isIntersecting) {e.target.classList.add('is-in');observer.unobserve(e.target);}
  },{threshold:.15});
  nodes.forEach(node=>{
    const bounds=node.getBoundingClientRect();
    if(motion.matches||(bounds.top<innerHeight&&bounds.bottom>0)) node.classList.add('is-in');
    else observer.observe(node);
  });
  document.documentElement.classList.add('reveal-ready');
  motion.addEventListener('change',()=>{if(motion.matches){nodes.forEach(n=>n.classList.add('is-in'));observer.disconnect();}});
}

function countUp() {
  document.querySelectorAll('[data-count]').forEach(node=>{
    const original=node.textContent, match=/^(\s*[^\d−+\-]*)([+−-]?)(\d[\d,]*(?:\.\d+)?)(.*)$/s.exec(original);
    node.dataset.final=original;
    if(!match || motion.matches) return;
    const [,before,sign,printed,after]=match;
    const target=Number((sign==='−'?'-':sign)+printed.replaceAll(',',''));
    const from=Number(node.dataset.from || 0);
    if(!Number.isFinite(target)||!Number.isFinite(from)) return;
    node.setAttribute('aria-hidden','true');
    node.after(el('span','pl-sr',original.trim()));
    const places=(printed.split('.')[1]||'').length;
    const formatter=new Intl.NumberFormat('en-US',{minimumFractionDigits:places,maximumFractionDigits:places,useGrouping:printed.includes(',')});
    let elapsed=0,previous,frame=0,seen=false,done=false;
    function finish() {done=true;node.textContent=original;observer.disconnect();cancelAnimationFrame(frame);frame=0;}
    function tick(t) {
      if(previous!=null) elapsed+=Math.min(t-previous,1200);
      previous=t;
      if(elapsed>=1200||motion.matches) {finish();return;}
      const value=from+(target-from)*(1-2**(-10*elapsed/1200));
      node.textContent=before+(value<0?'−':sign==='+'?'+':'')+formatter.format(Math.abs(value))+after;
      frame=requestAnimationFrame(tick);
    }
    function sync() {
      if(done) return;
      if(motion.matches){finish();return;}
      if(seen&&!document.hidden&&!frame){previous=null;frame=requestAnimationFrame(tick);}
      if((!seen||document.hidden)&&frame){cancelAnimationFrame(frame);frame=0;}
    }
    const observer=new IntersectionObserver(([entry])=>{seen=entry.isIntersecting;sync();});
    observer.observe(node);
    document.addEventListener('visibilitychange',sync);
    motion.addEventListener('change',sync);
  });
}

function navigation() {
  const top=document.querySelector('.topbar'),nav=document.querySelector('#site-nav'),toggle=document.querySelector('.nav-toggle');
  const progress=document.querySelector('.topbar__progress');
  const links=[...document.querySelectorAll('[data-spy]')].map(a=>({a,target:a.hash?document.getElementById(decodeURIComponent(a.hash.slice(1))):null})).filter(o=>o.target);
  function menu(open) {
    toggle?.setAttribute('aria-expanded',String(open));
    nav?.classList.toggle('is-open',open);top?.classList.toggle('is-open',open);
  }
  toggle?.addEventListener('click',()=>menu(toggle.getAttribute('aria-expanded')!=='true'));
  nav?.addEventListener('click',e=>{if(e.target.closest('a')) menu(false);});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true'){menu(false);toggle.focus();}
  });
  let pending=false;
  function update() {
    pending=false;
    const extent=document.documentElement.scrollHeight-innerHeight;
    const fraction=extent>0?clamp(scrollY/extent,0,1):0;
    progress?.style.setProperty('--progress',fraction);
    top?.classList.toggle('is-scrolled',scrollY>8);
    const line=(top?.offsetHeight||0)+Math.min(120,innerHeight*.18);
    const active=fraction>=.998?links.at(-1):links.filter(v=>v.target.getBoundingClientRect().top<=line).at(-1);
    links.forEach(v=>{
      if(v===active) v.a.setAttribute('aria-current','location');else v.a.removeAttribute('aria-current');
    });
  }
  const request=()=>{if(!pending){pending=true;requestAnimationFrame(update);}};
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',request);
  new ResizeObserver(request).observe(document.body);
  update();
}

function copies() {
  const buttons=document.querySelectorAll('[data-copy-target]');
  if(!buttons.length) return;
  const live=document.querySelector('[data-live]') || el('span','pl-sr');
  live.setAttribute('aria-live','polite');if(!live.isConnected) document.body.append(live);
  buttons.forEach(b=>{
    const label=b.querySelector('[data-copy-label]') || b;
    const original=label.textContent;
    let timer;
    b.addEventListener('click',async()=>{
      const text=document.querySelector(b.dataset.copyTarget)?.textContent;
      if(!text) return;
      let ok=false;
      try {await navigator.clipboard.writeText(text);ok=true;} catch {
        const tmp=el('textarea','pl-sr');
        tmp.value=text;document.body.append(tmp);tmp.select();
        try{ok=document.execCommand('copy');}catch {ok=false;}
        tmp.remove();b.focus({preventScroll:true});
      }
      if(!ok) {live.textContent='Select the citation to copy it.';return;}
      live.textContent='Citation copied';label.textContent='Copied';
      clearTimeout(timer);timer=setTimeout(()=>{label.textContent=original;live.textContent='';},1600);
    });
  });
}

let katexReady;
function keyboardFormula(node) {
  const box=node.closest('.mini__math')||node;
  const name=box.closest('article')?.querySelector('h3,h4')?.textContent.trim() || 'Mathematical expression';
  function update(){
    if(box.scrollWidth>box.clientWidth+1 && box.clientWidth){
      box.tabIndex=0;box.setAttribute('role','region');box.setAttribute('aria-label',name+' formula');
    }else{
      box.removeAttribute('tabindex');box.removeAttribute('role');box.removeAttribute('aria-label');
    }
  }
  new ResizeObserver(update).observe(box);
  document.fonts?.ready.then(update);update();
}
function math(node) {
  if(!katexReady) {
    const base='https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';
    function load(tag,name,integrity) {
      return new Promise((resolve,reject)=>{
        const asset=document.createElement(tag);
        asset.crossOrigin='anonymous';asset.integrity=integrity;
        if(tag==='link'){asset.rel='stylesheet';asset.href=base+name;}else{asset.src=base+name;asset.async=true;}
        asset.onload=resolve;asset.onerror=reject;document.head.append(asset);
      });
    }
    katexReady=Promise.all([
      load('link','katex.min.css','sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+'),
      load('script','katex.min.js','sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg')
    ]).then(()=>window.katex).catch(()=>{warnOnce('Math typesetting');return null;});
  }
  return katexReady.then(katex=>{
    if(!katex) return;
    try{
      const display=node.dataset.display==='true';
      katex.render(node.dataset.tex,node,{displayMode:display,throwOnError:true,trust:false});
      node.classList.add('katex-rendered');
      if(display)keyboardFormula(node);
    }
    catch {warnOnce('Math expression');}
  });
}

document.documentElement.classList.add('js');
keepFontsAfterPaint();
navigation();reveal();countUp();copies();
near('[data-chart]',async n=>(await import('./charts.js')).mount(n));
near('[data-hero]',async n=>(await import('./hero.js')).mount(n),'200px 0px');
near('[data-player]',async n=>(await import('./player.js')).mount(n));
near('[data-tabs]',async n=>(await import('./tabs.js')).mount(n));
near('[data-compare]',async n=>(await import('./compare.js')).mount(n));
near('[data-lightbox]',async n=>(await import('./lightbox.js')).mount(n));
near('.op__math',box=>Promise.all([...box.querySelectorAll('[data-tex]')].map(math)));
near('[data-tex]:not(.op__math [data-tex])',math);
