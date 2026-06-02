import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSparkles, HiOutlineX, HiOutlinePaperAirplane, HiOutlineTrash } from 'react-icons/hi';
import client from '../api/client';

const SUGGESTIONS = [
  "How's the attendance of BCOM class?",
  "Which students are at risk?",
  "Top performers this semester",
  "How many students in each department?",
];

// Simple markdown renderer that converts student links to clickable elements
function renderMarkdown(text, onLinkClick) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip code fence lines
    if (line.trim().startsWith('```')) continue;

    // Headers
    if (line.startsWith('#### ')) {
      elements.push(<h5 key={i} className="ai-chat-h4">{processInline(line.replace('#### ', ''), onLinkClick, i)}</h5>);
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="ai-chat-h3">{processInline(line.replace('### ', ''), onLinkClick, i)}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="ai-chat-h2">{processInline(line.replace('## ', ''), onLinkClick, i)}</h3>);
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="ai-chat-h1">{processInline(line.replace('# ', ''), onLinkClick, i)}</h2>);
      continue;
    }

    // Bullet / numbered lists
    if (line.match(/^\s*[-*]\s/)) {
      const indent = line.match(/^(\s*)/)[1].length;
      elements.push(
        <li key={i} className="ai-chat-li" style={{ marginLeft: `${indent * 8}px` }}>
          {processInline(line.replace(/^\s*[-*]\s/, ''), onLinkClick, i)}
        </li>
      );
      continue;
    }
    if (line.match(/^\s*\d+\.\s/)) {
      elements.push(
        <li key={i} className="ai-chat-li ai-chat-ol">
          {processInline(line.replace(/^\s*\d+\.\s/, ''), onLinkClick, i)}
        </li>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} style={{ height: '8px' }} />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="ai-chat-p">
        {processInline(line, onLinkClick, i)}
      </p>
    );
  }

  return elements;
}

// Process inline markdown: bold, italic, links
function processInline(text, onLinkClick, lineKey) {
  // Split by markdown links [text](url) and bold/italic
  const parts = [];
  let remaining = text;
  let partKey = 0;

  while (remaining.length > 0) {
    // Find the earliest match among link, bold, italic, inline code
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    // Find which comes first
    const matches = [
      linkMatch ? { type: 'link', index: linkMatch.index, match: linkMatch } : null,
      boldMatch ? { type: 'bold', index: boldMatch.index, match: boldMatch } : null,
      codeMatch ? { type: 'code', index: codeMatch.index, match: codeMatch } : null,
    ].filter(Boolean).sort((a, b) => a.index - b.index);

    if (matches.length === 0) {
      parts.push(<span key={`${lineKey}-${partKey++}`}>{remaining}</span>);
      break;
    }

    const first = matches[0];

    // Text before the match
    if (first.index > 0) {
      parts.push(<span key={`${lineKey}-${partKey++}`}>{remaining.substring(0, first.index)}</span>);
    }

    if (first.type === 'link') {
      const [fullMatch, label, url] = first.match;
      // If it's an internal student link, make it a clickable button
      if (url.startsWith('/admin/students/')) {
        parts.push(
          <button
            key={`${lineKey}-${partKey++}`}
            className="ai-chat-student-link"
            onClick={(e) => {
              e.preventDefault();
              onLinkClick(url);
            }}
            title={`View ${label}'s profile`}
          >
            {label}
          </button>
        );
      } else {
        parts.push(
          <a key={`${lineKey}-${partKey++}`} href={url} className="ai-chat-link" target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        );
      }
      remaining = remaining.substring(first.index + fullMatch.length);
    } else if (first.type === 'bold') {
      const [fullMatch, content] = first.match;
      parts.push(<strong key={`${lineKey}-${partKey++}`}>{content}</strong>);
      remaining = remaining.substring(first.index + fullMatch.length);
    } else if (first.type === 'code') {
      const [fullMatch, content] = first.match;
      parts.push(<code key={`${lineKey}-${partKey++}`} className="ai-chat-code">{content}</code>);
      remaining = remaining.substring(first.index + fullMatch.length);
    }
  }

  return parts;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleLinkClick = useCallback((url) => {
    navigate(url);
  }, [navigate]);

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const { data } = await client.post('/ai/chat', { message: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Something went wrong';
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `⚠️ **Error**\n\n${errorMsg}. Please try again.`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* ─── Floating Action Button ─── */}
      {!isOpen && (
        <button
          className="ai-assistant-fab"
          onClick={() => setIsOpen(true)}
          title="AI Assistant"
          id="ai-assistant-toggle"
        >
          <HiOutlineSparkles className="ai-fab-icon" />
          <span className="ai-fab-pulse" />
        </button>
      )}

      {/* ─── Chat Panel ─── */}
      {isOpen && (
        <div className="ai-assistant-panel" id="ai-assistant-panel">
          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <div className="ai-panel-title-icon">
                <HiOutlineSparkles />
              </div>
              <div>
                <h3>AI Assistant</h3>
                <span className="ai-panel-subtitle">Ask about students, attendance, marks</span>
              </div>
            </div>
            <div className="ai-panel-actions">
              {messages.length > 0 && (
                <button
                  className="ai-panel-btn"
                  onClick={clearChat}
                  title="Clear chat"
                >
                  <HiOutlineTrash />
                </button>
              )}
              <button
                className="ai-panel-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <HiOutlineX />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-panel-messages">
            {messages.length === 0 && !loading && (
              <div className="ai-empty-state">
                <div className="ai-empty-icon">
                  <HiOutlineSparkles />
                </div>
                <h4>Hello! I'm your AI Assistant</h4>
                <p>Ask me anything about your students, attendance, marks, or academic data.</p>
                <div className="ai-suggestions">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      className="ai-suggestion-chip"
                      onClick={() => sendMessage(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`ai-chat-message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ai-message-avatar">
                    <HiOutlineSparkles />
                  </div>
                )}
                <div className={`ai-message-bubble ${msg.role}`}>
                  {msg.role === 'assistant'
                    ? renderMarkdown(msg.text, handleLinkClick)
                    : msg.text
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-chat-message assistant">
                <div className="ai-message-avatar">
                  <HiOutlineSparkles />
                </div>
                <div className="ai-message-bubble assistant">
                  <div className="ai-typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="ai-panel-input">
            <input
              ref={inputRef}
              type="text"
              className="ai-chat-input"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              id="ai-chat-input"
            />
            <button
              className="ai-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send"
            >
              <HiOutlinePaperAirplane />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
