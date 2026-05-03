import { useState } from "react";

const RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function StarRating({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="rating-select"
    >
      {RATING_VALUES.map((r) => (
        <option key={r} value={r}>
          {"★".repeat(Math.floor(r))}
          {r % 1 ? "½" : ""} ({r.toFixed(1)})
        </option>
      ))}
    </select>
  );
}

function MovieRow({ movie, onChange, onRemove, canRemove }) {
  return (
    <div className="movie-row">
      <input
        type="text"
        placeholder="Movie title (e.g. Titanic)"
        value={movie.title}
        onChange={(e) => onChange({ ...movie, title: e.target.value })}
        className="title-input"
      />
      <StarRating
        value={movie.rating}
        onChange={(rating) => onChange({ ...movie, rating })}
      />
      {canRemove && (
        <button onClick={onRemove} className="remove-btn" aria-label="Remove">
          ×
        </button>
      )}
    </div>
  );
}

function ResultCard({ rec }) {
  return (
    <div className="rec-card">
      {rec.poster_url && (
        <img src={rec.poster_url} alt={rec.title} className="poster" />
      )}
      <div className="rec-body">
        <h3>
          {rec.title}
          {rec.year && <span className="year"> ({rec.year})</span>}
        </h3>
        <div className="meta-row">
          <span className="genres">{rec.genres.join(" · ")}</span>
          <span className="langs">{rec.languages.join(", ")}</span>
        </div>
        <div className="score">
          {rec.score} taste-twin{rec.score !== 1 ? "s" : ""} loved this
        </div>
        <p className="reason">{rec.reason}</p>
        <a
          href={`https://letterboxd.com/film/${rec.slug}/`}
          target="_blank"
          rel="noreferrer"
          className="lb-link"
        >
          View on Letterboxd →
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const [movies, setMovies] = useState([
    { title: "", rating: 4 },
    { title: "", rating: 4 },
    { title: "", rating: 4 },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const updateMovie = (i, m) =>
    setMovies(movies.map((mv, idx) => (idx === i ? m : mv)));
  const addMovie = () =>
    movies.length < 5 &&
    setMovies([...movies, { title: "", rating: 4 }]);
  const removeMovie = (i) =>
    setMovies(movies.filter((_, idx) => idx !== i));

  async function submit() {
    const payload = {
      movies: movies
        .filter((m) => m.title.trim().length > 0)
        .map((m) => ({ title: m.title.trim(), rating: m.rating })),
    };
    if (payload.movies.length < 1) {
      setError("Add at least one movie title.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Server error: ${res.status} — ${detail}`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>🎬 Taste Twin</h1>
        <p className="tagline">
          Find movies loved by people who rated yours the same way.
        </p>
      </header>

      <section className="input-section">
        <h2>Tell me 1–5 movies you love (and how much)</h2>
        {movies.map((m, i) => (
          <MovieRow
            key={i}
            movie={m}
            onChange={(m2) => updateMovie(i, m2)}
            onRemove={() => removeMovie(i)}
            canRemove={movies.length > 1}
          />
        ))}
        <div className="actions">
          {movies.length < 5 && (
            <button onClick={addMovie} className="add-btn">
              + Add another
            </button>
          )}
          <button
            onClick={submit}
            disabled={loading}
            className="submit-btn"
          >
            {loading ? "Crawling Letterboxd…" : "Find recommendations"}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </section>

      {loading && (
        <div className="loading">
          Scraping Letterboxd. This can take 30–90 seconds the first time —
          we're finding users who rated all your movies the same way you did,
          then collecting their high-rated films, then filtering by genre &
          language.
        </div>
      )}

      {result && (
        <section className="results">
          {result.warning && <div className="warning">{result.warning}</div>}
          {result.input_films?.length > 0 && (
            <div className="resolved">
              <strong>Matched on Letterboxd:</strong>{" "}
              {result.input_films.map((f) => f.title).join(", ")}
            </div>
          )}
          {result.twins?.length > 0 && (
            <div className="twins">
              Found <strong>{result.twins.length}</strong> taste twin
              {result.twins.length !== 1 ? "s" : ""}.
            </div>
          )}
          <h2>Recommendations</h2>
          {result.recommendations?.length === 0 && (
            <p>No recommendations passed the genre/language filter.</p>
          )}
          <div className="rec-grid">
            {result.recommendations?.map((rec) => (
              <ResultCard key={rec.slug} rec={rec} />
            ))}
          </div>
        </section>
      )}

      <footer>
        Built on public Letterboxd pages. This is a personal project — please
        respect Letterboxd's Terms of Service and don't run it at high scale.
      </footer>
    </div>
  );
}
