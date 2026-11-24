// Only Minhao's own reviews; every dimension is scored out of 5.
const reviews = [
  {
    "name": "虎童",
    "scores": {
      "price": 3,
      "quality": 2,
      "atmosphere": 4,
      "environment": 2
    },
    "note": "Halloween here understood the assignment: loads of cosplayers and a dance floor that was popping, though the small venue and so-so setting brought things back down to earth.",
    "photo": "assets/bars/hutong.jpg",
    "photoAlt": "DJs at the Halloween event at Hutong",
    "photoWidth": 1201,
    "photoHeight": 1360,
    "photoPosition": "50% 72%"
  },
  {
    "name": "响live house",
    "scores": {
      "price": 3,
      "quality": 3,
      "atmosphere": 5,
      "environment": 4
    },
    "note": "Pop hits, live performances, and RMB 888 for a table of eight (RMB 111 each)—then a guest singer hit us with “The Night I Miss You,” and my friends and I were absolutely living for it.",
    "photo": "assets/bars/xiang.jpg",
    "photoAlt": "A crowd and colorful stage lights at Xiang Live House",
    "photoWidth": 1280,
    "photoHeight": 1707,
    "photoPosition": "50% 65%"
  },
  {
    "name": "么哈",
    "scores": {
      "price": 3,
      "quality": 3,
      "atmosphere": 3,
      "environment": 3
    },
    "note": "Super hyped and packed with people—I reckon the location is doing the heavy lifting; I'm usually there playing poker, but every time “Bad Girl” comes on, I get ridiculously hyped.",
    "photo": "assets/bars/meha.jpg",
    "photoAlt": "Playing cards on a table at Meha",
    "photoWidth": 810,
    "photoHeight": 1440,
    "photoPosition": "50% 40%"
  },
  {
    "name": "birbox",
    "scores": {
      "price": null,
      "quality": null,
      "atmosphere": 5,
      "environment": 2
    },
    "note": "Came for Beijing's long-haired men's competition but dipped out very early, so this was more of a quick cameo than a proper deep dive.",
    "photo": "assets/bars/birbox.jpg",
    "photoAlt": "An outdoor fire performance at birbox",
    "photoWidth": 1540,
    "photoHeight": 960,
    "photoPosition": "50% 50%"
  }
];
const dimensions = [ ['price', 'Price'], ['quality', 'Drink quality'], ['atmosphere', 'Atmosphere'], ['environment', 'Environment'] ];
const list = document.getElementById('reviews-list');
const count = document.getElementById('review-count');
const sort = document.getElementById('review-sort');
const viewer = document.getElementById('review-viewer');
const largePhoto = viewer.querySelector('img');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function scoreList(scores) {
  const ratings = element('dl', 'review-scores');
  for (const [key, label] of dimensions) {
    const item = element('div');
    const value = scores[key];
    const rated = Number.isFinite(value) && value >= 0 && value <= 5;
    const reading = element('dd');
    if (rated) {
      const stars = element('span', 'star-track');
      stars.setAttribute('aria-hidden', 'true');
      stars.style.setProperty('--rated', (value * 20) + '%');
      reading.append(stars, value + '/5');
    } else {
      reading.textContent = 'Not rated';
      reading.className = 'unrated';
    }
    item.append(element('dt', '', label), reading);
    ratings.append(item);
  }
  return ratings;
}

function photoLink(review) {
  const link = element('a', 'review-photo');
  link.href = review.photo;
  link.setAttribute('aria-label', 'View full photo of ' + review.name);
  const img = element('img');
  img.src = review.photo;
  img.alt = review.photoAlt || review.name;
  img.width = review.photoWidth;
  img.height = review.photoHeight;
  img.style.objectPosition = review.photoPosition || 'center';
  img.loading = 'lazy';
  const expand = element('span', 'photo-expand');
  expand.setAttribute('aria-hidden', 'true');
  expand.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 10V4h6m4 0h6v6m0 4v6h-6M4 14v6h6"/></svg>';
  link.append(img, expand);
  if (typeof viewer.showModal === 'function') {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      largePhoto.src = link.href;
      largePhoto.alt = img.alt;
      viewer.querySelector('figcaption').textContent = review.name;
      viewer.showModal();
    });
  }
  return link;
}

function reviewRow(review) {
  const article = element('article', 'bar-review');
  const body = element('div', 'review-body');
  const content = element('div', 'review-content');
  const heading = element('header', 'review-heading');
  const byline = element('p', 'review-byline');
  const portrait = element('img');
  portrait.src = 'assets/portrait.jpg';
  portrait.width = 25;
  portrait.height = 25;
  portrait.alt = '';
  byline.append(portrait, 'Minhao Sun');
  const title = element('h3', '', review.name);
  title.lang = /[\u4e00-\u9fff]/.test(review.name) ? 'zh-CN' : 'en';
  heading.append(byline, title);
  content.append(heading);
  if (review.note) content.append(element('p', 'review-note', review.note));
  content.append(scoreList(review.scores));
  body.append(content);
  if (review.photo) body.append(photoLink(review));
  article.append(body);
  return article;
}

const rows = reviews.map(review => ({review, article: reviewRow(review)}));
function showReviews() {
  const key = sort.value;
  const ordered = rows.slice();
  if (key) {
    ordered.sort((a, b) => (b.review.scores[key] ?? -1) - (a.review.scores[key] ?? -1));
  }
  list.replaceChildren(...ordered.map(row => row.article));
}

count.textContent = '(' + reviews.length + ')';
if (reviews.length) {
  showReviews();
  sort.closest('label').hidden = reviews.length < 2;
  sort.addEventListener('change', showReviews);
} else {
  list.append(element('p', 'reviews-empty', 'The first review is on its way.'));
}
viewer.querySelector('button').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => {
  if (event.target === viewer) viewer.close();
});
