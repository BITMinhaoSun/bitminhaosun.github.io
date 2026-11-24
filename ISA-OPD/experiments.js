// Without JavaScript, each experiment is a regular, linkable section.
(() => {
  const navigation = document.querySelector('.experiment-nav');
  const tabs = Array.from(navigation.querySelectorAll('a'));
  const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));
  navigation.setAttribute('role', 'tablist');

  function displayTab(index) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
  }

  function selectTab(index) {
    displayTab(index);
    if (location.hash !== tabs[index].hash) history.pushState(null, '', tabs[index].hash);
  }

  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      selectTab(index);
    });
    tab.addEventListener('keydown', event => {
      const keys = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
        ' ': index
      };
      if (!(event.key in keys)) return;
      event.preventDefault();
      selectTab(keys[event.key]);
      tabs[keys[event.key]].focus();
    });
  });

  function syncLocation() {
    const target = document.getElementById(location.hash.slice(1));
    const index = panels.findIndex(panel => target && panel.contains(target));
    if (index >= 0) displayTab(index);
    else if (!target || target.id === 'results') displayTab(0);
  }
  displayTab(0);
  syncLocation();
  window.addEventListener('hashchange', syncLocation);
  window.addEventListener('pageshow', syncLocation);

  for (const gallery of document.querySelectorAll('[data-switch]')) {
    const select = document.getElementById(gallery.dataset.switch);
    const figures = gallery.querySelectorAll('[data-view]');
    function displayFigure() {
      figures.forEach(figure => { figure.hidden = figure.dataset.view !== select.value; });
    }
    select.addEventListener('change', displayFigure);
    displayFigure();
    select.hidden = false;
    select.closest('label')?.removeAttribute('hidden');
  }
})();
