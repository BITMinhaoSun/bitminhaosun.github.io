const metricSwitch = document.querySelector('.switch');
const metricButtons = metricSwitch.querySelectorAll('button');
function showMetric(selected) {
  for (const button of metricButtons) {
    const active = button === selected;
    button.setAttribute('aria-pressed', String(active));
    document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
  }
}
for (const button of metricButtons) {
  button.addEventListener('click', () => showMetric(button));
}
showMetric(metricButtons[0]);
metricSwitch.hidden = false;

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
