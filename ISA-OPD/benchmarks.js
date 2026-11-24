// Enhance the two published result tables in place.
(() => {
  const explorer = document.querySelector('#bench-explorer');
  if (!explorer) return;
  explorer.querySelector('.bench-hint').hidden = false;

  function updateSortIndicator(button, direction) {
    const header = button.closest('th');
    if (direction) header.setAttribute('aria-sort', direction);
    else header.removeAttribute('aria-sort');
    const symbols = {ascending: '↑', descending: '↓'};
    button.querySelector('span').textContent = symbols[direction] || '↕';
  }

  let selectedName = null;
  const baselineButtons = [];
  for (const table of explorer.querySelectorAll('table[data-model]')) {
    const body = table.tBodies[0];
    const sortButtons = [];
    const headers = table.tHead.rows[0].cells;
    for (const header of headers) {
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
      updateSortIndicator(button, column === headers.length - 1 ? 'descending' : null);
      sortButtons.push(button);

      button.addEventListener('click', () => {
        const current = header.getAttribute('aria-sort');
        const ascending = current === 'descending' || (!current && column === 0);
        const direction = ascending ? 'ascending' : 'descending';
        const rows = Array.from(body.rows);
        rows.sort((a, b) => {
          const byName = a.cells[0].textContent.localeCompare(b.cells[0].textContent, 'en');
          const comparison = column ? Number(a.cells[column].textContent) - Number(b.cells[column].textContent) : byName;
          return (ascending ? comparison : -comparison) || byName;
        });
        body.append(...rows);
        sortButtons.forEach(item => updateSortIndicator(item, item === button ? direction : null));
      });
    }

    for (const row of body.rows) {
      if (row.classList.contains('ours')) continue;
      const heading = row.cells[0];
      const name = heading.textContent;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bench-baseline';
      button.textContent = name;
      button.setAttribute('aria-label', 'Highlight ' + name + ' baseline');
      button.setAttribute('aria-pressed', 'false');
      heading.replaceChildren(button);
      baselineButtons.push(button);

      button.addEventListener('click', () => {
        selectedName = selectedName === name ? null : name;
        for (const item of baselineButtons) {
          const active = item.textContent === selectedName;
          item.setAttribute('aria-pressed', String(active));
          item.closest('tr').classList.toggle('comparator', active);
        }
      });
    }
  }
})();
