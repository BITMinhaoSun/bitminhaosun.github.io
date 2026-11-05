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
    "note": "Halloween here understood the assignment: loads of cosplayers and a dance floor that was popping, though the small venue and so-so setting brought things back down to earth."
  },
  {
    "name": "响live house",
    "scores": {
      "price": 3,
      "quality": 3,
      "atmosphere": 5,
      "environment": 4
    },
    "note": "Pop hits, live performances, and RMB 888 for a table of eight (RMB 111 each)—then a guest singer hit us with “The Night I Miss You,” and my friends and I were absolutely living for it."
  },
  {
    "name": "么哈",
    "scores": {
      "price": 3,
      "quality": 3,
      "atmosphere": 3,
      "environment": 3
    },
    "note": "Super hyped and packed with people—I reckon the location is doing the heavy lifting; I'm usually there playing poker, but every time “Bad Girl” comes on, I get ridiculously hyped."
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
    title.lang = 'zh-CN';
    article.append(title);
    const scores = document.createElement('dl');
    scores.className = 'review-scores';
    for (const [key, label] of dimensions) {
      const item = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const value = document.createElement('dd');
      const number = review.scores[key];
      value.textContent = Number.isFinite(number) && number >= 0 && number <= 5 ? String(number) : '—';
      const denominator = document.createElement('small');
      denominator.textContent = ' / 5';
      value.append(denominator);
      item.append(term, value);
      scores.append(item);
    }
    article.append(scores);
    if (review.note) {
      const note = document.createElement('p');
      note.className = 'review-note';
      note.textContent = review.note;
      article.append(note);
    }
    list.append(article);
  }
}
