const viewer = document.querySelector('#viewer');
const image = document.querySelector('#large-image');
const original = document.querySelector('#original');

if (typeof viewer.showModal === 'function') {
  document.querySelectorAll('a[data-enlarge]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || link.getAttribute('aria-label');
      original.href = link.href;
      viewer.showModal();
    });
  });
  document.querySelector('#close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const box = viewer.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) viewer.close();
  });
}

const copyButton = document.querySelector('#copy');
const bib = document.querySelector('#bib');
const status = document.querySelector('#copy-status');
if (navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(bib.textContent);
      status.textContent = 'BibTeX copied to clipboard.';
      copyButton.textContent = 'Copied!';
      window.setTimeout(() => { copyButton.textContent = 'Copy BibTeX'; }, 1800);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(bib);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copyButton.textContent = 'Citation selected';
      status.textContent = 'Citation selected. Use the copy command to copy it.';
    }
  });
}
