TEST CONTENT FROM CLAUDE# Taste Twin · Letterboxd Recommender

Type 1–5 movies you love (with the rating you'd give them). The app finds
Letterboxd users who rated those same films within ±0.5 stars of your
rating, then recommends *other* films those users rated 4★ or higher —
filtered to the same genre and language as your inputs.

This is classic neighborhood-based collaborative filtering, but instead of
training on a fixed dataset, it crawls Letterboxd's public film and
member pages live.

## Architecture

```
┌──────────────────┐        ┌───────────────────────────────┐
│  React frontend  │ ─POST─▶│  FastAPI backend             │
│  (Vite, port     │ /api/  │  ├── scraper.py (httpx+bs4)  │
│   5173)          │ recom- │  ├── recommender.py          │
│                  │ mend   │  └── cache.py (SQLite)       │
└──────────────────┘ ◀──────┴──────────────────────────────┘
                                       │
                                       ▼
                               letterboxd.com (public pages)
```

## How the algorithm works

1. **Resolve titles.** Each input movie is sent to Letterboxd's site search
   to find the canonical film slug, then `/film/{slug}/` is scraped for
   genres and languages.
2. **Find taste twins.** For each movie + your rating, fetch
   `/film/{slug}/members/rated/{r}/` for `r` in `{your_rating ± 0.5}` —
   so a `4★ Titanic` rating pulls users who rated it 3.5, 4, or 4.5.
3. **Intersect.** A "taste twin" is someone who appears in **all** input
   movies' rating sets. If that's too few people (fewer than 5), the
   threshold relaxes to ≥60% match.
4. **Crawl the twins.** For each twin, fetch their `/films/rated/{r}/`
   pages for `r ∈ {4, 4.5, 5}`. Aggregate by film slug — count how many
   twins love each candidate.
5. **Genre + language filter.** Hydrate the top 80 candidates' film pages
   and keep only films that share at least one genre and one language
   with your inputs.
6. **Rank.** Sort by twin count (then by genre overlap). Return top 20.

## Running it

### Backend

```bash
cd letterboxd-recommender/backend
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
uvicorn backend.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for the auto-generated API docs.

### Frontend

```bash
cd letterboxd-recommender/frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Vite proxies `/api/*` to the backend.

### Tests

```bash
cd letterboxd-recommender
python3 backend/test_units.py
```

## Important caveats

- **Letterboxd has no public API.** This app scrapes public HTML pages.
  That's a gray area legally — it's fine for personal/learning use, but
  don't deploy this publicly or run it at high request volume. The
  scraper limits concurrency to 4 and pauses 0.4s between requests.
- **Speed.** A single recommendation typically does 50–200 HTTP requests.
  First run with 3 movies takes about 30–90 seconds. After that, the
  SQLite cache (`backend/cache.db`, 7-day TTL) makes repeat runs fast.
- **Selectors are fragile.** Letterboxd can rename CSS classes anytime.
  The scraper uses defensive selectors but expect occasional breakage.
- **Recommendation quality** depends on having enough taste twins. If a
  film is obscure or the rating is unusual, you may get few or no twins.
  Try mainstream films at 4★ for best results.

## Tunables (backend/recommender.py)

| Constant                    | Default | Effect                                    |
|-----------------------------|---------|-------------------------------------------|
| `RATING_TOLERANCE`          | 0.5     | How loose the "similar rating" match is   |
| `USERS_PAGES_PER_BUCKET`    | 2       | Pages of users to scrape per movie/rating |
| `USER_FILMS_PAGES`          | 2       | Pages of a twin's films to scrape         |
| `MAX_TWINS`                 | 60      | Cap on taste-twins crawled                |
| `MAX_CANDIDATES_TO_HYDRATE` | 80      | Top-N candidates we fetch genre/lang for  |
| `TOP_N`                     | 20      | Final number of recommendations           |

Higher values = better recommendations but slower and more requests.

## Project layout

```
letterboxd-recommender/
├── backend/
│   ├── __init__.py
│   ├── main.py            FastAPI app + REST endpoint
│   ├── scraper.py         All Letterboxd HTTP + HTML parsing
│   ├── recommender.py     Collaborative filtering algorithm
│   ├── cache.py           SQLite HTTP cache
│   ├── test_units.py      Pure-logic unit tests
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx        Form + results UI
│       └── App.css
└── README.md
```
