// Add only Minhao's own reviews. Each entry: { name, date, area, score, note }.
// date: YYYY-MM-DD; score: a number from 0 to 10. No sample ratings are published.
const reviews = [];

const list = document.getElementById('reviews-list');
const count = document.getElementById('review-count');
if (reviews.length) {
  list.replaceChildren();
  count.textContent = `${reviews.length} 篇记录`;
  for (const review of reviews) {
    const article = document.createElement('article');
    article.className = 'bar-review';
    const heading = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = review.name;
    const meta = document.createElement('p');
    meta.className = 'review-meta';
    meta.textContent = [review.area, review.date].filter(Boolean).join(' · ');
    heading.append(title, meta);
    const score = document.createElement('p');
    score.className = 'review-score';
    score.textContent = Number.isFinite(review.score) && review.score >= 0 && review.score <= 10 ? String(review.score) : '—';
    const denominator = document.createElement('small');
    denominator.textContent = ' / 10';
    score.append(denominator);
    const note = document.createElement('p');
    note.className = 'review-note';
    note.textContent = review.note || '';
    article.append(heading, score, note);
    list.append(article);
  }
}
