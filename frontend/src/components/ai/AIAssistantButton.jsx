import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../config';

export default function AIAssistantButton({ currentRoom }) {
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'summarize'
  const [summary,   setSummary]   = useState('');
  const bottomRef = useRef(null);
  const abortRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const aiMsg = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      abortRef.current = new AbortController();
      const token = localStorage.getItem('chatflow_token');
      const res   = await fetch(`${API_URL}/ai/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ messages: [...messages, userMsg], channelContext: currentRoom?.name }),
        signal:  abortRef.current.signal,
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: '⚠️ ' + data.error };
                return next;
              });
            } else if (data.content) {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: next[next.length - 1].content + data.content };
                return next;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: '⚠️ AI unavailable. Make sure Ollama is running.' };
          return next;
        });
      }
    } finally {
      setStreaming(false);
    }
  };

  const summarizeChannel = async () => {
    if (streaming || !currentRoom) return;
    setStreaming(true);
    setSummary('');
    try {
      const token = localStorage.getItem('chatflow_token');
      // Fetch the latest 50 messages from the room
      const msgRes = await fetch(`${API_URL}/api/chat/rooms/${currentRoom._id}/messages?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!msgRes.ok) throw new Error('Failed to fetch channel messages');
      const msgData = await msgRes.json();
      
      // Map senderUsername to username for the AI service
      const messages = (msgData.messages || []).map(m => ({
        username: m.senderUsername || m.username || 'User',
        content: m.content || '',
      }));

      const res   = await fetch(`${API_URL}/ai/summarize`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ messages, channelName: currentRoom.name, type: 'channel' }),
      });
      const data = await res.json();
      setSummary(data.summary || 'No summary available.');
    } catch (err) {
      console.error(err);
      setSummary('⚠️ Summarization failed. AI service may be offline.');
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating AI Button */}
      <motion.button
        id="ai-assistant-btn"
        className="ai-fab"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        title="AI Assistant"
      >
        <span className="ai-fab__icon">⚡</span>
        {streaming && <span className="ai-fab__pulse" />}
      </motion.button>

      {/* AI Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="ai-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="ai-panel__header">
              <div className="ai-panel__title">
                <span>⚡</span>
                <strong>AI Assistant</strong>
                <span className="ai-panel__badge">Ollama</span>
              </div>
              <div className="ai-panel__tabs">
                <button className={activeTab === 'chat'      ? 'active' : ''} onClick={() => setActiveTab('chat')}>Chat</button>
                <button className={activeTab === 'summarize' ? 'active' : ''} onClick={() => setActiveTab('summarize')}>Summarize</button>
              </div>
              <button className="ai-panel__close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {activeTab === 'chat' ? (
              <>
                {/* Messages */}
                <div className="ai-panel__messages">
                  {messages.length === 0 && (
                    <div className="ai-panel__welcome">
                      <p>👋 Ask me anything! I can help with your team's conversations, answer questions, and more.</p>
                      <div className="ai-panel__suggestions">
                        {['Summarize recent topics', 'Draft a reply to the team', 'Explain this concept'].map((s) => (
                          <button key={s} onClick={() => setInput(s)} className="ai-suggestion-chip">{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
                      <div className="ai-msg__bubble">
                        {msg.content || (msg.role === 'assistant' && streaming && i === messages.length - 1
                          ? <span className="ai-typing-cursor" />
                          : null)}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="ai-panel__input">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI anything… (Enter to send)"
                    rows={2}
                    disabled={streaming}
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || streaming} className="ai-send-btn">
                    {streaming ? '⏳' : '➤'}
                  </button>
                </div>
              </>
            ) : (
              <div className="ai-panel__summarize">
                <p className="ai-panel__summarize-desc">
                  Generate a quick summary of recent messages in <strong>#{currentRoom?.name || 'this channel'}</strong>.
                </p>
                <button onClick={summarizeChannel} disabled={streaming || !currentRoom} className="ai-summarize-btn">
                  {streaming ? '⏳ Summarizing…' : '📝 Summarize Channel'}
                </button>
                {summary && (
                  <div className="ai-summary-result">
                    <h4>Summary</h4>
                    <pre>{summary}</pre>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
