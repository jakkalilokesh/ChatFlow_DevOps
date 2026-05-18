import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GIPHY_API  = 'https://api.giphy.com/v1/gifs';
const GIPHY_KEY  = process.env.REACT_APP_GIPHY_API_KEY || '';

export default function GiphyPicker({ onSelect, onClose }) {
  const [query,    setQuery]    = useState('');
  const [gifs,     setGifs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(0);
  const timerRef  = useRef(null);
  const LIMIT     = 18;

  const fetchGifs = async (q, offset = 0) => {
    if (!GIPHY_KEY) { setGifs([]); setLoading(false); return; }
    setLoading(true);
    try {
      const endpoint = q
        ? `${GIPHY_API}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${offset}&rating=g`
        : `${GIPHY_API}/trending?api_key=${GIPHY_KEY}&limit=${LIMIT}&offset=${offset}&rating=g`;
      const res  = await fetch(endpoint);
      const data = await res.json();
      setGifs(offset > 0 ? (prev) => [...prev, ...data.data] : data.data || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGifs('', 0); }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    setPage(0);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchGifs(q, 0), 400);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchGifs(query, next * LIMIT);
  };

  return (
    <motion.div
      className="giphy-picker"
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{   opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <div className="giphy-picker__header">
        <input
          type="text"
          className="giphy-picker__search"
          placeholder="Search GIFs…"
          value={query}
          onChange={handleSearch}
          autoFocus
        />
        <button onClick={onClose} className="giphy-picker__close">✕</button>
      </div>

      {!GIPHY_KEY && (
        <div className="giphy-no-key">
          ⚠️ Add <code>REACT_APP_GIPHY_API_KEY</code> to .env to enable GIFs
        </div>
      )}

      <div className="giphy-picker__grid">
        {loading && gifs.length === 0
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="giphy-skeleton" />
            ))
          : gifs.map((gif) => (
              <button
                key={gif.id}
                className="giphy-item"
                onClick={() => onSelect({ type: 'gif', url: gif.images.fixed_height.url, alt: gif.title })}
              >
                <img
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title}
                  loading="lazy"
                />
              </button>
            ))}
      </div>

      {gifs.length > 0 && (
        <button onClick={loadMore} className="giphy-load-more" disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      <div className="giphy-attribution">
        Powered by <strong>GIPHY</strong>
      </div>
    </motion.div>
  );
}
