const namespace = 'http:' + '//www.w3.org/2000/svg';

export function svgNode(tag, attributes = {}) {
  const node = document.createElementNS(namespace, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

const paths = {
  check: 'm4.5 12 4.5 4.5L19.5 6',
  close: 'm6 6 12 12M18 6 6 18',
  search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 4 6 6',
  answer: 'M4 6h16v10H11l-5 4v-4H4z M8 10h8',
  named: 'M4 6h16M4 11h10M4 16h13',
  withheld: 'M4 8v11h14M8 5h12v11M6 15l3-3 4 4m1-3 2-2 4 4M3 3l18 18',
  paper: 'M5 3h10l4 4v14H5z M14 3v5h5M8 12h8m-8 4h6',
  filter: 'M3 5h18l-7 8v5l-4 2v-7z',
  bundle: 'm3 8 9-4 9 4-9 4z M3 12l9 4 9-4 M3 16l9 4 9-4',
  play: 'm8 4 11 8-11 8z',
  pause: 'M8 5v14m8-14v14',
  prev: 'M6 5v14m12-14-9 7 9 7z',
  next: 'M18 5v14M6 5l9 7-9 7z',
  reset: 'M4 10a8 8 0 1 1 1 7M4 4v6h6',
  arrow: 'M3 12h17m-6-6 6 6-6 6',
};

export function icon(name) {
  const svg = svgNode('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false' });
  svg.append(svgNode('path', { d: paths[name] }));
  return svg;
}
