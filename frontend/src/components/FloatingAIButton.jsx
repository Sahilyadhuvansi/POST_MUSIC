import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles } from "lucide-react";
import api from "../services/api";
import { SongCard, EmptyStateCard } from "./ui/AIChatCards";
import "../styles/FloatingAIButton.css";
import { useNavigate } from "react-router-dom";
import { useMusic } from "../features/music/MusicContext";
import { runMusicCommandBrain } from "../features/music/music-command-brain";

const WELCOME_SUGGESTIONS = [
  "Play something chill",
  "Show my favorites",
  "Find lo-fi beats",
];

const FloatingAIButton = () => {
  const navigate = useNavigate();
  const music = useMusic();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Brain context persists last search results for follow-up "play it / like that" commands
  const [brainCtx, setBrainCtx] = useState({
    lastResults: [],
    lastQuery: "",
    lastImportedTracks: [],
    lastPlaylistName: "",
  });

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const addMessage = (role, payload) =>
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, ...payload }]);

  const send = useCallback(
    async (text) => {
      const cleanText = text.trim();
      if (!cleanText || loading) return;

      addMessage("user", { type: "text", content: cleanText });
      setInput("");
      setLoading(true);
      setError("");

      try {
        // ── Step 1: client-side command brain (play/pause/queue/playlist/etc.) ──
        const brainResult = await runMusicCommandBrain({
          input: cleanText,
          context: { music, navigate, api, ...brainCtx },
        });

        if (brainResult.handled) {
          if (brainResult.nextContext) setBrainCtx(prev => ({ ...prev, ...brainResult.nextContext }));

          const steps = brainResult.execution?.steps ?? [];
          const content = steps.length
            ? steps.map(s => `${s.status === "success" ? "✓" : "✗"} ${s.detail}`).join("\n")
            : brainResult.message || "Done.";

          addMessage("assistant", { type: "execution-report", content, payload: brainResult.execution });
          return;
        }

        // ── Step 2: agentic backend chat ──────────────────────────────────────
        const { data } = await api.post("/ai/chat", {
          messages: [
            ...messages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content || "" })),
            { role: "user", content: cleanText },
          ],
        });

        let msgType = data.type || "text";
        let msgPayload = data.payload || null;

        // Side effects for tool results
        if (data.type === "tool_result") {
          // Auto-play when agent plays a song
          if (data.action === "play_song" && data.payload?.track) {
            const track = data.payload.track;
            music.playTrack(
              { ...track, _id: track._id || `ai_${Date.now()}` },
              [track],
            );
          }

          // Render song cards for search / favorites results
          if (
            ["search_music", "semantic_search_music", "fetch_favorites"].includes(data.action) &&
            Array.isArray(data.payload?.musics)
          ) {
            setBrainCtx(prev => ({ ...prev, lastResults: data.payload.musics }));
            msgType = "ui-controller";
            msgPayload = {
              type: data.payload.musics.length ? "songs" : "empty",
              data: data.payload.musics.slice(0, 12).map(m => ({
                id: m._id || m.songId,
                title: m.title,
                youtubeUrl: m.youtubeUrl,
                thumbnailUrl: m.thumbnailUrl || null,
              })),
              message: data.payload.musics.length ? "" : "No songs found.",
            };
          }
        }

        addMessage("assistant", { type: msgType, content: data.content || "", payload: msgPayload, model: data.model });
      } catch (err) {
        const msg =
          err.response?.data?.error?.message ||
          (typeof err.response?.data?.error === "string" ? err.response.data.error : null) ||
          (err.code === "ECONNABORTED" ? "Request timed out. Try again." : null) ||
          "AI assistant is unavailable. Check your connection.";
        setError(msg);
        if (import.meta.env.DEV) console.error("[AI chat]", err);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, music, navigate, brainCtx],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const handleSuggestion = (text) => send(text);

  const clearChat = () => {
    setMessages([]);
    setError("");
    setBrainCtx({ lastResults: [], lastQuery: "", lastImportedTracks: [], lastPlaylistName: "" });
  };

  const renderMessage = (msg) => {
    if (msg.role === "assistant" && msg.type === "ui-controller") {
      return (
        <div className="structured-content">
          {msg.payload?.type === "songs" &&
            msg.payload.data?.map(song => <SongCard key={song.id || song.youtubeUrl} song={song} />)}
          {msg.payload?.type === "empty" && <EmptyStateCard message={msg.payload.message} />}
          {msg.content && <p className="mt-2 text-xs text-white/60">{msg.content}</p>}
        </div>
      );
    }

    // Execution report from the command brain — show step list
    if (msg.role === "assistant" && msg.type === "execution-report") {
      const steps = msg.payload?.steps ?? [];
      return steps.length ? (
        <ul className="space-y-1">
          {steps.map((s, i) => (
            <li key={i} className={`text-xs ${s.status === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {s.status === "success" ? "✓" : "✗"} {s.detail}
            </li>
          ))}
        </ul>
      ) : (
        <span>{msg.content}</span>
      );
    }

    return <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>;
  };

  return (
    <>
      {/* Floating action button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="floating-fab"
          title="Open AI Assistant"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="fab-icon" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-header">
            <div className="header-content">
              <h3>AI Assistant</h3>
              <p className="text-xs opacity-60">Powered by Groq</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="close-button"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="welcome-message">
                <Sparkles className="sparkle-icon" />
                <h4>Hey there!</h4>
                <p>Ask me to search, play, or manage your music.</p>
                <div className="suggestions">
                  {WELCOME_SUGGESTIONS.map(s => (
                    <button key={s} className="suggestion-chip" onClick={() => handleSuggestion(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`message message-${msg.role}`}>
                <div className="message-bubble">{renderMessage(msg)}</div>
              </div>
            ))}

            {loading && (
              <div className="message message-assistant">
                <div className="message-bubble loading">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {error && (
              <div className="message message-error">
                <div className="message-bubble">⚠ {error}</div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <form onSubmit={handleSubmit} className="chat-form">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Search music, play a song…"
                className="chat-input"
                disabled={loading}
              />
              <button
                type="submit"
                className="send-button"
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </form>
            {messages.length > 0 && (
              <button onClick={clearChat} className="clear-button">
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAIButton;
