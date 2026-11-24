// Use the complete published tables as the data source for each interactive view.
(() => {
  const explorer = document.querySelector('#bench-explorer');
  if (!explorer) return;

  const find = selector => explorer.querySelector(selector);
  const model = find('#bench-model');
  const dataset = find('#bench-dataset');
  const comparator = find('#bench-comparator');
  const view = find('#bench-view');
  const order = find('#bench-order');
  const ranking = find('#bench-rows');
  const rankingHeaders = explorer.querySelectorAll('.bench-ranking .bench-sort');
  const rowsByModel = new Map();

  function nextDirection(current, isNumeric) {
    if (current === 'ascending') return 'descending';
    if (current === 'descending') return 'ascending';
    return isNumeric ? 'descending' : 'ascending';
  }

  function setSortIndicator(button, direction) {
    const header = button.closest('th');
    if (direction) header.setAttribute('aria-sort', direction);
    else header.removeAttribute('aria-sort');
    const symbols = {ascending: '↑', descending: '↓'};
    button.querySelector('span').textContent = symbols[direction] || '↕';
  }

  function compareValues(a, b, direction) {
    const result = typeof a === 'number' ? a - b : a.localeCompare(b, 'en');
    return direction === 'descending' ? -result : result;
  }

  function enableMatrixSort(table) {
    const buttons = [];
    for (const header of table.tHead.rows[0].cells) {
      const column = header.cellIndex;
      const label = header.textContent;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bench-sort bench-matrix-sort';
      button.dataset.column = String(column);
      button.setAttribute('aria-label', 'Sort by ' + label);
      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      button.append(label + ' ', icon);
      header.replaceChildren(button);
      setSortIndicator(button, null);
      buttons.push(button);

      button.addEventListener('click', () => {
        const direction = nextDirection(header.getAttribute('aria-sort'), column > 0);
        const body = table.tBodies[0];
        const rows = Array.from(body.rows);
        const value = row => column > 0 ? Number(row.cells[column].textContent) : row.cells[0].textContent;
        rows.sort((a, b) => compareValues(value(a), value(b), direction) ||
          a.cells[0].textContent.localeCompare(b.cells[0].textContent, 'en'));
        body.append(...rows);
        buttons.forEach(item => setSortIndicator(item, item === button ? direction : null));
      });
    }
  }

  for (const table of explorer.querySelectorAll('table[data-model]')) {
    const methods = [...table.tBodies[0].rows].map(row => ({
      name: row.cells[0].textContent,
      scores: [...row.cells].slice(1).map(cell => Number(cell.textContent))
    }));
    rowsByModel.set(table.dataset.model, methods);
    enableMatrixSort(table);
  }

  const baselines = rowsByModel.get(model.value).filter(method => method.name !== 'ISA-Distill');
  baselines.forEach(method => comparator.add(new Option(method.name, method.name)));
  comparator.value = 'SD-Search';

  function update() {
    const methods = rowsByModel.get(model.value);
    const column = Number(dataset.value) - 1;
    const compared = methods.find(method => method.name === comparator.value);
    const ours = methods.find(method => method.name === 'ISA-Distill');

    find('#bench-ours').textContent = ours.scores[column].toFixed(1) + '%';
    find('#bench-baseline-label').textContent = compared.name + ' EM';
    find('#bench-baseline').textContent = compared.scores[column].toFixed(1) + '%';
    find('#bench-caption').textContent = model.selectedOptions[0].text + ' · ' + dataset.selectedOptions[0].text;

    const [sortKey, sortDirection] = order.value.split('-');
    const direction = sortDirection === 'asc' ? 'ascending' : 'descending';
    const visible = view.value === 'pair' ? [ours, compared] : [...methods];
    const value = method => sortKey === 'score' ? method.scores[column] : method.name;
    visible.sort((a, b) => compareValues(value(a), value(b), direction) || a.name.localeCompare(b.name, 'en'));

    const body = document.createDocumentFragment();
    for (const method of visible) {
      const row = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = method.name;
      if (method === ours) row.className = 'ours';
      if (method === compared) {
        row.className = 'comparator';
        const role = document.createElement('small');
        role.className = 'bench-row-role';
        role.textContent = 'Selected baseline';
        heading.append(' ', role);
      }
      row.append(heading);

      const cell = row.insertCell();
      const track = document.createElement('span');
      track.className = 'bench-track';
      track.setAttribute('aria-hidden', 'true');
      const bar = document.createElement('span');
      bar.className = 'bench-bar';
      bar.style.width = method.scores[column] + '%';
      track.append(bar);
      const score = document.createElement('span');
      score.className = 'bench-value';
      score.textContent = method.scores[column].toFixed(1);
      cell.append(track, score);
      body.append(row);
    }
    ranking.replaceChildren(body);

    for (const button of rankingHeaders) {
      setSortIndicator(button, button.dataset.key === sortKey ? direction : null);
    }
  }

  for (const button of rankingHeaders) {
    button.addEventListener('click', () => {
      const key = button.dataset.key;
      const current = button.closest('th').getAttribute('aria-sort');
      const direction = nextDirection(current, key === 'score');
      order.value = key + (direction === 'ascending' ? '-asc' : '-desc');
      update();
    });
  }
  [model, dataset, comparator, view, order].forEach(control => control.addEventListener('change', update));
  update();
  for (const details of explorer.querySelectorAll('.bench-source')) details.open = false;
  find('#bench-interactive').hidden = false;
})();
