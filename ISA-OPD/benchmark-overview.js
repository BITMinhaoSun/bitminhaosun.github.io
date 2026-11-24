// Reuse the scores displayed in the paper tables, preserving the published rounding.
(() => {
  const overview = document.querySelector('#benchmark-study');
  const accuracy = document.querySelector('#bench-explorer table[data-model="7B"]');
  const callRows = document.querySelectorAll('.eff-data tr[data-eff-group]');
  if (!overview || !accuracy || !callRows.length) return;

  const columns = new Map();
  for (const header of accuracy.tHead.rows[0].cells) {
    // Enhanced column headings keep their label in the button's first text node.
    const label = header.querySelector('button')?.firstChild.textContent || header.textContent;
    columns.set(label.trim(), header.cellIndex);
  }
  const methods = new Map([...accuracy.tBodies[0].rows].map(row => [row.cells[0].textContent.trim(), row]));
  const isa = methods.get('ISA-Distill');
  const evisd = methods.get('EviSD');
  if (!isa || !evisd) return;

  const benchmarks = [];
  for (const row of callRows) {
    const [name, baselineCalls, isaCalls, change] = [...row.cells].map(cell => cell.textContent.trim());
    const column = columns.get(name);
    if (!column) return;
    benchmarks.push({
      name, group: row.dataset.effGroup, baselineCalls, isaCalls, change,
      isaEM: isa.cells[column].textContent.trim(),
      baselineEM: evisd.cells[column].textContent.trim()
    });
  }

  const metric = overview.querySelector('#bo-metric');
  const labels = {single: 'Single-hop QA', multi: 'Multi-hop QA'};
  const chartRows = [];
  const values = overview.querySelectorAll('.bo-inspector tbody tr');
  function inspect(item) {
    overview.querySelector('#bo-task').textContent = labels[item.group];
    overview.querySelector('#bo-name').textContent = item.name;
    values[0].cells[1].textContent = item.isaEM;
    values[0].cells[2].textContent = item.isaCalls;
    values[1].cells[1].textContent = item.baselineEM;
    values[1].cells[2].textContent = item.baselineCalls;
    overview.querySelector('#bo-change').textContent = item.change;
  }

  for (const [index, item] of benchmarks.entries()) {
    const row = document.createElement('label');
    row.className = 'bo-row';
    const choice = document.createElement('input');
    choice.type = 'radio';
    choice.name = 'bo-dataset';
    choice.value = item.name;
    choice.checked = index === 0;
    choice.addEventListener('change', () => inspect(item));
    const name = document.createElement('span');
    name.className = 'bo-label';
    name.textContent = item.name;
    const track = document.createElement('span');
    track.className = 'bo-track';
    track.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('span');
    bar.className = 'bo-bar';
    track.append(bar);
    const score = document.createElement('span');
    score.className = 'bo-score';
    row.append(choice, name, track, score);
    overview.querySelector('[data-bo-group="' + item.group + '"]').append(row);
    chartRows.push({item, bar, score});
  }

  function updateChart() {
    const calls = metric.value === 'calls';
    overview.style.setProperty('--bo-zero', calls ? '50%' : '0%');
    for (const {item, bar, score} of chartRows) {
      const text = calls ? item.change : item.isaEM + '%';
      const value = parseFloat(text.replace('−', '-'));
      // Changes have a symmetric ±15% axis. Exact match has a 0–100% axis.
      const width = calls ? Math.abs(value) * 100 / 30 : value;
      bar.style.left = (calls ? 50 - (value < 0 ? width : 0) : 0) + '%';
      bar.style.width = width + '%';
      score.textContent = text;
    }
    overview.querySelector('#bo-scale').textContent = calls
      ? 'Change in mean calls per question from reproduced EviSD. The center line marks zero.'
      : 'ISA-Distill exact match on a 0–100% scale.';
  }

  metric.addEventListener('change', updateChart);
  inspect(benchmarks[0]);
  updateChart();
  overview.hidden = false;
})();
