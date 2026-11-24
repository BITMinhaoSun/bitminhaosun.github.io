(() => {
  const reader = document.querySelector('#trajectory-reader');
  if (!reader) return;
  const toolbar = reader.querySelector('.trace-toolbar');
  const status = reader.querySelector('.trace-status');
  const stages = ['Question', 'First search', 'Agent decisions', 'Final answers'];
  const nodes = reader.querySelectorAll('[data-trace-step]');
  const play = reader.querySelector('[data-trace-action="play"]');
  const previous = reader.querySelector('[data-trace-action="back"]');
  const next = reader.querySelector('[data-trace-action="next"]');
  const complete = reader.querySelector('[data-trace-action="complete"]');
  let stage = stages.length;
  let timer = null;

  function stop() {
    window.clearTimeout(timer);
    timer = null;
  }

  function render() {
    for (const node of nodes) {
      node.hidden = Number(node.dataset.traceStep) > stage;
    }
    reader.dataset.currentStep = String(stage);
    status.textContent = stage === stages.length
      ? 'Complete trajectory · Final answers'
      : 'Stage ' + stage + ' of ' + stages.length + ' · ' + stages[stage - 1];
    play.textContent = timer !== null ? 'Pause' : stage === stages.length ? 'Replay' : 'Play';
    previous.disabled = stage === 1;
    next.disabled = stage === stages.length;
    complete.disabled = stage === stages.length;
  }

  function advancePlayback() {
    timer = window.setTimeout(() => {
      timer = null;
      stage += 1;
      if (stage < stages.length) advancePlayback();
      render();
    }, 6000);
  }

  play.addEventListener('click', () => {
    if (timer !== null) stop();
    else {
      if (stage === stages.length) stage = 1;
      advancePlayback();
    }
    render();
  });

  for (const [button, step] of [[previous, -1], [next, 1], [complete, stages.length]]) {
    button.addEventListener('click', () => {
      stop();
      stage = Math.max(1, Math.min(stages.length, stage + step));
      render();
    });
  }

  function pauseWhenHidden() {
    if (timer === null || (!document.hidden && !reader.closest('[hidden]'))) return;
    stop();
    render();
  }

  const panel = reader.closest('[data-panel]');
  if (panel) {
    const observer = new MutationObserver(pauseWhenHidden);
    observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  }
  document.addEventListener('visibilitychange', pauseWhenHidden);
  toolbar.hidden = false;
  render();
})();
