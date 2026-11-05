# Minhao Sun — Academic Homepage

Live website: https://bitminhaosun.github.io/

A static academic homepage built with HTML and CSS. No dependency installation or build step is required.

## Update content

- Edit `index.html` to update the introduction, publications, experience, hobbies, and contact information.
- Edit `styles.css` to change the layout and colors.
- Replace `assets/portrait.jpg` to change the photograph.
- Hobby photos are stored in `assets/hobbies/`, in the order hiking, swimming and fitness, climbing, and poker.
- Add bibliography files to `assets/` and link them from each publication.

GitHub Pages publishes the root directory of the `main` branch. Commit changes to `main` to update the website.

## Local preview

From this directory, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open http://127.0.0.1:8000/.

## Content sources

- Same Trajectory, Different Knowledge paper, author order, and preprint status: https://arxiv.org/abs/2611.01987 (PDF first page checked).
- Search When Needed, Proceed When Reliable paper, author order, and preprint status: https://arxiv.org/abs/2610.41738.
- Profile and portrait: https://scholar.google.com/citations?user=Bg1pQ3MAAAAJ
- SearchArt paper, author order, and preprint status: https://arxiv.org/abs/2607.24850
- RACE paper, author order, and equal-contribution markers: https://arxiv.org/abs/2610.28382 (PDF first page).
- Huawei internship: supplied by Minhao Sun, July 2026–present.


## Beijing Bar Notes

- `bars.html` is the public personal review page, linked from the homepage footer.
- Add actual reviews to the `reviews` array in `bars.js` using `name`, `date` (YYYY-MM-DD), `area`, `score` (0–10), and `note`.
- Reviews are published with the site; there is no public editing form or browser-only storage.
