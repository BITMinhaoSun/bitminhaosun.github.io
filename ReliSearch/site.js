const fullResults = document.getElementById('full-results');
const metricButtons = fullResults.querySelectorAll('.switch button');
const panels = fullResults.querySelectorAll('.table-panel');
const datasetGroup = document.getElementById('table-datasets');
const restoreOrder = document.getElementById('paper-order');
const paperRows = new Map();

function updateRestoreButton() {
  restoreOrder.disabled = !fullResults.querySelector('.table-panel:not([hidden]) th[aria-sort]');
}

function clearSort(table) {
  table.querySelector('th[aria-sort]')?.removeAttribute('aria-sort');
  table.tBodies[0].append(...paperRows.get(table));
}

for (const panel of panels) {
  const table = panel.querySelector('table');
  const originalRows = Array.from(table.tBodies[0].rows);
  paperRows.set(table, originalRows);
  for (const header of table.tHead.rows[0].cells) {
    const col = header.cellIndex;
    const label = header.textContent;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Sort by ' + label);
    button.textContent = label;
    const indicator = document.createElement('span');
    indicator.className = 'sort-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    button.append(indicator);
    header.replaceChildren(button);
    button.addEventListener('click', () => {
      const previous = header.getAttribute('aria-sort');
      const descending = previous ? previous === 'ascending' : col !== 0 && panel.id === 'accuracy-panel';
      const sorted = originalRows.slice().sort((a, b) => {
        const left = a.cells[col].textContent;
        const right = b.cells[col].textContent;
        const difference = col === 0 ? left.localeCompare(right, 'en') : Number(left) - Number(right);
        return descending ? -difference : difference;
      });
      table.querySelector('th[aria-sort]')?.removeAttribute('aria-sort');
      header.setAttribute('aria-sort', descending ? 'descending' : 'ascending');
      table.tBodies[0].append(...sorted);
      updateRestoreButton();
    });
  }
}

datasetGroup.addEventListener('change', () => {
  for (const panel of panels) {
    const table = panel.querySelector('table');
    for (const header of table.tHead.querySelectorAll('[data-hop]')) {
      const hide = datasetGroup.value !== 'all' && header.dataset.hop !== datasetGroup.value;
      if (hide && header.hasAttribute('aria-sort')) clearSort(table);
      for (const row of table.rows) row.cells[header.cellIndex].hidden = hide;
    }
  }
  updateRestoreButton();
});

restoreOrder.addEventListener('click', () => {
  clearSort(fullResults.querySelector('.table-panel:not([hidden]) table'));
  updateRestoreButton();
});

function showMetric(selected) {
  for (const button of metricButtons) {
    const active = button === selected;
    button.setAttribute('aria-pressed', String(active));
    document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
  }
  updateRestoreButton();
}
for (const button of metricButtons) {
  button.addEventListener('click', () => showMetric(button));
}
showMetric(metricButtons[0]);
fullResults.querySelector('.table-tools').hidden = false;
fullResults.querySelector('.sort-tools').hidden = false;

const lightbox = document.getElementById('lightbox');
if (typeof lightbox.showModal === 'function') {
  const enlarged = lightbox.querySelector('img');
  for (const link of document.querySelectorAll('.figure-link')) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      enlarged.src = link.href;
      enlarged.alt = link.querySelector('img').alt;
      lightbox.showModal();
    });
  }
  lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) lightbox.close();
  });
}

const copy = document.getElementById('copy');
const status = document.getElementById('copy-status');
const bib = document.getElementById('bib');
if (navigator.clipboard?.writeText) {
  copy.hidden = false;
  let reset;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(bib.textContent);
      copy.textContent = 'Copied';
      status.textContent = 'BibTeX copied to clipboard.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(bib);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copy.textContent = 'Use Ctrl/Cmd+C';
      status.textContent = 'Citation selected. Press Control+C or Command+C to copy.';
    }
    clearTimeout(reset);
    reset = setTimeout(() => { copy.textContent = 'Copy BibTeX'; }, 3000);
  });
}
