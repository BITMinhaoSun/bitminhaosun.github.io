(() => {
  const studies = document.getElementById('model-studies');
  const tablist = studies.querySelector('.study-tabs');
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  function showStudy(selected) {
    for (const tab of tabs) {
      const current = tab === selected;
      tab.setAttribute('aria-selected', String(current));
      tab.tabIndex = current ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel.hidden = !current;
    }
  }

  for (const tab of tabs) {
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', () => showStudy(tab));
  }
  tablist.addEventListener('keydown', event => {
    const index = tabs.indexOf(event.target);
    const count = tabs.length;
    if (index < 0) return;
    const keyTargets = {
      ArrowLeft: (index + count - 1) % count,
      ArrowRight: (index + 1) % count,
      Home: 0,
      End: count - 1,
    };
    if (!Object.hasOwn(keyTargets, event.key)) return;
    event.preventDefault();
    const selected = tabs[keyTargets[event.key]];
    showStudy(selected);
    selected.focus();
  });
  showStudy(tabs[0]);
  tablist.hidden = false;

  const weightStudy = studies.querySelector('.weight-study');
  const reading = weightStudy.querySelector('output');
  function showWeight() {
    reading.textContent = weightStudy.querySelector('input:checked').dataset.note;
  }
  weightStudy.addEventListener('change', showWeight);
  showWeight();
  reading.hidden = false;
})();
