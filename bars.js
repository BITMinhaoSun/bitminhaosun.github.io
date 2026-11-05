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
if (reviews.length) {
  list.replaceChildren();
  count.textContent = `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`;
  for (const review of reviews) {
    const article = document.createElement('article');
    article.className = 'bar-review';
    const title = document.createElement('h3');
    title.textContent = review.name;
    title.lang = /[\u4e00-\u9fff]/.test(review.name) ? 'zh-CN' : 'en';
    article.append(title);
    const body = document.createElement('div');
    body.className = 'review-body';
    const content = document.createElement('div');
    content.className = 'review-content';
    const scores = document.createElement('dl');
    scores.className = 'review-scores';
    for (const [key, label] of dimensions) {
      const item = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const value = document.createElement('dd');
      const number = review.scores[key];
      const rated = Number.isFinite(number) && number >= 0 && number <= 5;
      value.textContent = rated ? String(number) : '—';
      if (rated) {
        const denominator = document.createElement('small');
        denominator.textContent = ' / 5';
        value.append(denominator);
      } else {
        value.setAttribute('aria-label', 'Not rated');
      }
      item.append(term, value);
      scores.append(item);
    }
    content.append(scores);
    if (review.note) {
      const note = document.createElement('p');
      note.className = 'review-note';
      note.textContent = review.note;
      content.append(note);
    }
    if (review.photo) {
      const link = document.createElement('a');
      link.className = 'review-photo';
      link.href = review.photo;
      link.setAttribute('aria-label', 'View full photo: ' + review.name);
      const img = document.createElement('img');
      img.src = review.photo;
      img.alt = review.photoAlt;
      img.style.objectPosition = review.photoPosition;
      img.width = review.photoWidth;
      img.height = review.photoHeight;
      img.loading = 'lazy';
      img.decoding = 'async';
      link.append(img);
      body.append(link);
    }
    body.append(content);
    article.append(body);
    list.append(article);
  }
}
