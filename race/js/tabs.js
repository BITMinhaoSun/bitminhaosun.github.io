const groups=new Map();
const selected=new Map();

export function mount(root) {
  const tabs=[...root.querySelectorAll('[role="tab"]')].filter(t=>t.closest('[data-tabs]')===root);
  if(!tabs.length) return;
  const panels=tabs.map(t=>document.getElementById(t.getAttribute('aria-controls')));
  for(const p of panels){
    if(p&&!p.querySelector('a[href],button,input,select,textarea,summary,[tabindex="0"]'))p.tabIndex=0;
  }
  const group=root.dataset.tabsSync;
  function activate(i,notify=false) {
    if(i<0||i>=tabs.length||!panels[i]) return;
    tabs.forEach((tab,j)=>{
      tab.tabIndex=j===i?0:-1;
      tab.setAttribute('aria-selected',String(j===i));
      if(panels[j]) panels[j].hidden=j!==i;
    });
    if(notify && group) {
      selected.set(group,i);
      for(const peer of groups.get(group)) if(peer!==activate) peer(i);
    }
  }
  if(group) {
    if(!groups.has(group)) groups.set(group,new Set());
    groups.get(group).add(activate);
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>activate(i,true));
    tab.addEventListener('keydown',e=>{
      const destinations={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i-1+tabs.length)%tabs.length,Home:0,End:tabs.length-1};
      if(!(e.key in destinations)) return;
      e.preventDefault();
      const next=destinations[e.key];
      activate(next,true);tabs[next].focus();
    });
  });
  activate(selected.get(group)??Math.max(0,tabs.findIndex(t=>t.getAttribute('aria-selected')==='true')));
}
