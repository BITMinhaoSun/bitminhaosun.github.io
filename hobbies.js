(() => {
  const album = document.querySelector('.hobby-album');
  if (!album) return;
  const strip = album.querySelector('.album-tabs');
  const photos = album.querySelector('.album-photos');
  const panels = Array.from(photos.querySelectorAll('.album-panel'));
  const viewer = document.querySelector('.album-viewer');
  const names = panels.map(panel => panel.querySelector('.album-name').textContent);
  const tabs = panels.map((panel, index) => {
    const thumb = panel.querySelector('img').cloneNode(false);
    thumb.alt = '';
    thumb.width = thumb.height = 37;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = panel.id + '-tab';
    tab.className = 'album-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.append(thumb, names[index]);
    strip.append(tab);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => select(index));
    return tab;
  });
  let selected = 0;
  function select(index) {
    selected = (index + panels.length) % panels.length;
    panels.forEach((panel, i) => {
      const active = selected === i;
      panel.hidden = !active;
      tabs[i].tabIndex = active ? 0 : -1;
      tabs[i].setAttribute('aria-selected', String(active));
    });
  }
  strip.addEventListener('keydown', event => {
    const destinations = {ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: panels.length - 1};
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    select(destinations[event.key]);
    tabs[selected].focus();
  });
  let start;
  photos.addEventListener('touchstart', event => {
    start = event.touches.length === 1 ? event.touches[0] : null;
  }, {passive: true});
  photos.addEventListener('touchcancel', () => { start = null; });
  photos.addEventListener('touchend', event => {
    if (!start) return;
    const end = event.changedTouches[0];
    const dx = end.clientX - start.clientX;
    const dy = end.clientY - start.clientY;
    start = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (event.cancelable) event.preventDefault();
    select(selected + (dx < 0 ? 1 : -1));
  }, {passive: false});
  if (typeof viewer?.showModal === 'function') {
    photos.addEventListener('click', event => {
      const link = event.target.closest('.album-open');
      if (!link || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      const image = viewer.querySelector('img');
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      viewer.querySelector('#album-viewer-title').textContent = names[selected];
      viewer.showModal();
    });
    viewer.querySelector('button').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  }
  select(0);
  strip.hidden = false;
  album.classList.add('is-interactive');
})();
