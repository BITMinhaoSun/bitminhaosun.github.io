(() => {
  const explorer = document.querySelector('#benchmark-explorer');
  if (!explorer) return;

  // Table 1 and Table 2 provide the score pairs. Figure 4 reports the
  // changes, including CEM gains at higher precision than Table 1.
  const benchmarks = [
    { name: 'NQ', type: 'Single-hop', cem: [74.3, 71.2], calls: [1.09, 1.31], gain: 3.07, change: -16.8 },
    { name: 'PopQA', type: 'Single-hop', cem: [66.8, 63.2], calls: [1.21, 1.57], gain: 3.57, change: -22.9 },
    { name: 'TriviaQA', type: 'Single-hop', cem: [77.7, 76.3], calls: [1.20, 1.49], gain: 1.37, change: -19.5 },
    { name: 'HotpotQA', type: 'Multi-hop', cem: [66.1, 62.4], calls: [1.91, 1.88], gain: 3.70, change: 1.6 },
    { name: '2Wiki', type: 'Multi-hop', cem: [71.8, 71.7], calls: [2.38, 2.18], gain: 0.10, change: 9.2 },
    { name: 'Bamboogle', type: 'Multi-hop', cem: [58.4, 52.8], calls: [1.94, 1.90], gain: 5.60, change: 2.1 },
    { name: 'MuSiQue', type: 'Multi-hop', cem: [35.2, 34.1], calls: [2.43, 2.27], gain: 1.10, change: 7.0 }
  ];
  const select = explorer.querySelector('select');
  const chart = explorer.querySelector('.bench-groups');
  const chartRows = new Map();
  let selected = benchmarks[0];

  function formatDelta(value, digits) {
    return (value < 0 ? '−' : '+') + Math.abs(value).toFixed(digits);
  }

  function showDetails(item) {
    selected = item;
    explorer.querySelector('.bench-task').textContent = item.type + ' QA';
    explorer.querySelector('.bench-name').textContent = item.name;
    const rows = explorer.querySelectorAll('.bench-values tbody tr');
    rows.forEach((row, index) => {
      row.cells[1].textContent = item.cem[index].toFixed(1);
      row.cells[2].textContent = item.calls[index].toFixed(2);
    });
    const deltas = explorer.querySelectorAll('.bench-deltas dd');
    deltas[0].textContent = formatDelta(item.gain, 2) + ' pts';
    deltas[1].textContent = formatDelta(item.change, 1) + '%';
  }

  for (const type of ['Single-hop', 'Multi-hop']) {
    const group = document.createElement('div');
    group.className = 'bench-group';
    const title = document.createElement('p');
    title.className = 'bench-group-title';
    title.textContent = type + ' QA';
    group.append(title);
    for (const item of benchmarks.filter(entry => entry.type === type)) {
      const row = document.createElement('label');
      row.className = 'bench-row';
      row.innerHTML = '<input type="radio" name="bench-dataset"><span class="bench-label"></span>' +
        '<span class="bench-track" aria-hidden="true"><span class="bench-bar"></span></span><span class="bench-measure"></span>';
      row.querySelector('.bench-label').textContent = item.name;
      const radio = row.querySelector('input');
      radio.value = item.name;
      radio.checked = item === selected;
      radio.addEventListener('change', () => showDetails(item));
      chartRows.set(item, row);
      group.append(row);
    }
    chart.append(group);
  }

  function showMetric() {
    const isCalls = select.value === 'calls';
    explorer.dataset.metric = select.value;
    // A common linear scale for every dataset, with room on both sides
    // of zero for search-call changes (-25% to +10%). Accuracy is 0–6 pts.
    const lower = isCalls ? -25 : 0;
    const upper = isCalls ? 10 : 6;
    const range = upper - lower;
    const zero = -100 * lower / range;
    chart.style.setProperty('--bench-zero', zero + '%');
    for (const [item, row] of chartRows) {
      const value = isCalls ? item.change : item.gain;
      row.style.setProperty('--bench-start', (zero + 100 * Math.min(value, 0) / range) + '%');
      row.style.setProperty('--bench-width', (100 * Math.abs(value) / range) + '%');
      row.querySelector('.bench-measure').textContent = isCalls ? formatDelta(value, 1) + '%' : formatDelta(value, 2);
      row.querySelector('input').setAttribute('aria-label', item.name + ', ' + (
        isCalls ? formatDelta(value, 1) + '% change in search calls' : formatDelta(value, 2) + ' CEM points'
      ));
    }
    explorer.querySelector('.bench-axis-note').textContent = isCalls
      ? 'The vertical line marks zero change. Bars to the left show fewer calls than HiPRAG, and bars to the right show more.'
      : 'Bars show the increase in Cover Exact Match over HiPRAG, in percentage points.';
  }

  select.addEventListener('change', showMetric);
  showMetric();
  showDetails(selected);
  explorer.hidden = false;
})();
