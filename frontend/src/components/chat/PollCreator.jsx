import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function PollCreator({ onSubmit, onClose }) {
  const [question, setQuestion] = useState('');
  const [options,  setOptions]  = useState(['', '']);
  const [duration, setDuration] = useState(24); // hours
  const [error,    setError]    = useState('');

  const addOption = () => {
    if (options.length >= 8) return;
    setOptions([...options, '']);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx, val) => {
    const next = [...options];
    next[idx]  = val;
    setOptions(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!question.trim())                          return setError('Question is required');
    const filled = options.filter((o) => o.trim());
    if (filled.length < 2)                         return setError('At least 2 options are required');
    onSubmit({ question: question.trim(), options: filled, durationHours: duration });
    onClose();
  };

  return (
    <motion.div
      className="poll-creator"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{   opacity: 0, y: -8 }}
    >
      <div className="poll-creator__header">
        <h3>📊 Create a Poll</h3>
        <button onClick={onClose} className="poll-creator__close">✕</button>
      </div>

      {error && <div className="poll-creator__error">{error}</div>}

      <form onSubmit={handleSubmit} className="poll-creator__form">
        <div className="poll-creator__field">
          <label>Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's the best JavaScript framework?"
            autoFocus
            maxLength={200}
          />
        </div>

        <div className="poll-creator__field">
          <label>Options</label>
          {options.map((opt, idx) => (
            <div key={idx} className="poll-option-row">
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                maxLength={100}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(idx)} className="poll-remove-btn">✕</button>
              )}
            </div>
          ))}
          {options.length < 8 && (
            <button type="button" onClick={addOption} className="poll-add-option">
              + Add option
            </button>
          )}
        </div>

        <div className="poll-creator__field">
          <label>Duration</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>1 week</option>
          </select>
        </div>

        <div className="poll-creator__actions">
          <button type="button" onClick={onClose} className="poll-cancel-btn">Cancel</button>
          <button type="submit" className="poll-submit-btn">Create Poll</button>
        </div>
      </form>
    </motion.div>
  );
}
