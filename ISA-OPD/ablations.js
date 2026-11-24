(() => {
  const studies = document.getElementById('ablation-studies');
  if (!studies) return;

  const routing = studies.querySelector('#routing-reference');
  function updateRouting() {
    const selected = studies.querySelector('[data-setting="' + routing.value + '"]').cells;
    studies.querySelector('#routing-em').textContent = selected[1].textContent + '%';
    studies.querySelector('#routing-calls').textContent = selected[2].textContent;
  }
  routing.addEventListener('change', updateRouting);
  updateRouting();
  studies.querySelector('#routing-comparison').hidden = false;

  const descriptions = {
    original: 'The frozen teacher scores the same search before and after receiving the focal fact. The pre-search history and instructions are identical.',
    length: 'The control supplies non-target factual text with the same token length as the focal fact. The reported share counts searches scored lower with the focal fact.',
    strict: 'A search counts only if its score drops by more than 0.01 nats per token for both fact wordings against both control contexts.',
    halves: 'The student generates 16 matched continuations per condition. This subset keeps the pairs where the retrieved support improved accuracy in both eight-draw halves.'
  };
  const condition = studies.querySelector('#diagnostic-condition');
  function updateDiagnostic() {
    const result = studies.querySelector('[data-condition="' + condition.value + '"]').cells;
    const share = result[2].textContent;
    const pairs = result[1].textContent.replace(' / ', ' of ');
    studies.querySelector('#diagnostic-rate').textContent = share;
    studies.querySelector('#diagnostic-count').textContent = '(' + pairs + ' pairs)';
    studies.querySelector('.diagnostic-track span').style.width = share;
    studies.querySelector('#diagnostic-description').textContent = descriptions[condition.value];
    studies.querySelector('#diagnostic-interval').textContent = '95% confidence interval: ' + result[3].textContent;
  }
  condition.addEventListener('change', updateDiagnostic);
  updateDiagnostic();
  studies.querySelector('#diagnostic-comparison').hidden = false;
})();
