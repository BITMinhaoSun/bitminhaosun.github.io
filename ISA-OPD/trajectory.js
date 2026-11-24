(() => {
  const study = document.getElementById('case-study');
  if (!study) return;
  const lanes = study.querySelectorAll('.trace-lane');
  if (!lanes.length) return;

  for (const lane of lanes) {
    const path = lane.querySelector('.trace-path');
    const nodes = [...path.querySelectorAll('[role="tab"]')];
    function selectNode(selected) {
      for (const node of nodes) {
        const active = node === selected;
        node.setAttribute('aria-selected', String(active));
        node.tabIndex = active ? 0 : -1;
        document.getElementById(node.getAttribute('aria-controls')).hidden = !active;
      }
    }
    for (const node of nodes) {
      const panel = document.getElementById(node.getAttribute('aria-controls'));
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', node.id);
      panel.tabIndex = 0;
      panel.querySelector('h4').hidden = true;
      node.addEventListener('click', () => selectNode(node));
    }
    path.addEventListener('keydown', event => {
      const current = nodes.indexOf(event.target);
      const positions = {
        ArrowLeft: (current + nodes.length - 1) % nodes.length,
        ArrowRight: (current + 1) % nodes.length,
        Home: 0,
        End: nodes.length - 1
      };
      if (current < 0 || !Object.hasOwn(positions, event.key)) return;
      event.preventDefault();
      const next = nodes[positions[event.key]];
      selectNode(next);
      next.focus();
    });
    selectNode(nodes[0]);
    path.hidden = false;
  }
  study.querySelector('.trace-instruction').hidden = false;
})();
