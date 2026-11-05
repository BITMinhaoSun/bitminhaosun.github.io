// Only Minhao's own reviews; every dimension is scored out of 5.
const reviews = [
  { name: '虎童', scores: { price: 3, quality: 2, atmosphere: 4, environment: 2 }, note: '' }
];
const dimensions = [ ['price', '价格'], ['quality', '酒的质量'], ['atmosphere', '氛围'], ['environment', '环境'] ];
const list = document.getElementById('reviews-list');
const count = document.getElementById('review-count');
if (reviews.length) {
  list.replaceChildren();
  count.textContent = `${reviews.length} 篇记录`;
  for (const review of reviews) {
    const article = document.createElement('article');
    article.className = 'bar-review';
    const title = document.createElement('h3');
    title.textContent = review.name;
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
