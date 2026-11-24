(() => {
  const panel = document.querySelector('.efficiency-experiment');
  if (!panel) return;
  const sourceRows = Array.from(panel.querySelectorAll('tbody tr'));
  const summary = panel.querySelector('#efficiency-summary');
  const chart = panel.querySelector('#efficiency-chart');
  const measure = panel.querySelector('#efficiency-measure');

  function element(tag, className, content) {
    const node = document.createElement(tag);
    node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function draw() {
    const group = panel.querySelector('input[name="efficiency-group"]:checked').value;
    const groupedRows = sourceRows.filter(row => row.dataset.effGroup && (group === 'all' || row.dataset.effGroup === group));
    const aggregate = sourceRows.find(row => row.dataset.effAverage === group);
    const [label, baseline, isa, change] = Array.from(aggregate.cells, cell => cell.textContent);
    const paired = measure.value === 'means';
    const groupName = group === 'all' ? 'All seven datasets' : label.replace('average', 'datasets');
    summary.replaceChildren(element('strong', '', groupName), document.createTextNode(' · ' + baseline + ' calls for EviSD, ' + isa + ' for ISA-Distill (' + change + ').'));
    chart.replaceChildren();
    chart.classList.toggle('eff-paired', paired);

    const scale = element('div', 'eff-scale');
    scale.setAttribute('aria-hidden', 'true');
    for (const tick of paired ? ['0', '1', '2', '3 calls'] : ['−15%', '0', '+15%']) {
      scale.append(element('span', '', tick));
    }
    chart.append(scale);
    if (paired) {
      const legend = element('p', 'eff-legend');
      legend.append(element('span', 'eff-key baseline', 'EviSD'), element('span', 'eff-key isa', 'ISA-Distill'));
      chart.prepend(legend);
    }
    const list = element('ul', 'eff-list');
    for (const row of groupedRows) {
      const [dataset, evisdCalls, isaCalls, delta] = Array.from(row.cells, cell => cell.textContent);
      const item = element('li', 'eff-row');
      const track = element('span', 'eff-track');
      const value = element('span', 'eff-value');
      track.setAttribute('aria-hidden', 'true');
      if (paired) {
        for (const [system, calls, color] of [['EviSD', evisdCalls, 'baseline'], ['ISA-Distill', isaCalls, 'isa']]) {
          const bar = element('span', 'eff-bar ' + color);
          bar.style.width = (Number(calls) / 3 * 100) + '%';
          track.append(bar);
          const number = element('span', color);
          number.append(element('span', 'sr', system + ' '), document.createTextNode(calls));
          value.append(number);
        }
      } else {
        const fraction = Number.parseFloat(delta.replace('−', '-')) / 30;
        const bar = element('span', 'eff-bar ' + (fraction < 0 ? 'decrease' : 'increase'));
        bar.style.width = (Math.abs(fraction) * 100) + '%';
        track.append(bar);
        value.textContent = delta;
      }
      item.append(element('span', 'eff-name', dataset), track, value);
      list.append(item);
    }
    chart.append(list);
    for (const row of sourceRows) {
      row.hidden = group !== 'all' && (row.dataset.effAverage || row.dataset.effGroup) !== group;
    }
  }

  draw();
  panel.querySelector('.eff-data').open = false;
  panel.querySelector('.eff-controls').hidden = false;
  panel.querySelector('.eff-graphic').hidden = false;
  panel.querySelector('.eff-controls').addEventListener('change', draw);
})();
