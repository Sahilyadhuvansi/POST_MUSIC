import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import api from "../services/api";
import { SongCard, EmptyStateCard } from "./ui/AIChatCards";
import "../styles/FloatingAIButton.css";
import { useNavigate } from "react-router-dom";
import { useMusic } from "../features/music/MusicContext";
import { runMusicCommandBrain } from "../features/music/music-command-brain";

/**
 * Floating AI Chat Button Component
 *
 * Features:
 * - Fixed position in bottom-right corner
 * - Minimal circular FAB design
 * - Groq-powered backend integration
 * - Clean chat interface (no Claude/Anthropic branding)
 */
const FloatingAIButton = () => {
  const navigate = useNavigate();
  const music = useMusic();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [brainContext, setBrainContext] = useState({
    lastResults: [],
    lastQuery: "",
    lastImportedTracks: [],
    lastPlaylistName: "",
  });
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    const cleanInput = inputValue.trim();
    if (!cleanInput) return;

    // Add user message to chat state immediately for UI responsiveness
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: cleanInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError("");

    try {
      const brainResult = await runMusicCommandBrain({
        input: cleanInput,
        context: {
          music,
          navigate,
          api,
          lastResults: brainContext.lastResults,
          lastQuery: brainContext.lastQuery,
          lastImportedTracks: brainContext.lastImportedTracks,
          lastPlaylistName: brainContext.lastPlaylistName,
        },
      });

      if (brainResult.handled) {
        if (brainResult.nextContext) {
          setBrainContext((prev) => ({ ...prev, ...brainResult.nextContext }));
        }

        const steps = brainResult.execution?.steps || [];
        const content = steps.length > 0
          ? steps.map((s) => `${s.status === "success" ? "✓" : "✗"} ${s.detail}`).join("\n")
          : brainResult.message || "Done.";

        const aiMessage = {
          id: Date.now() + 1,
          role: "assistant",
          type: "execution-report",
          payload: brainResult.execution || null,
          content,
          model: "music-command-brain",
        };

        setMessages((prev) => [...prev, aiMessage]);
        return;
      }

      // Use centralized axios instance for consistent headers and error handling
      const { data } = await api.post("/ai/chat", {
        messages: [
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: cleanInput },
        ],
        options: {
          temperature: 0.7,
          maxTokens: 512, // Reduced for faster response
        },
      });

      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        type: data.type || "text",
        payload: data.payload || null,
        content: data.content || "",
        model: data.model,
      };

      // Direct Tool Execution side-effects
      if (data.type === "tool_result") {
        if (data.action === "play_song" && data.payload?.track) {
          const track = data.payload.track;
          music.playTrack(
            { ...track, _id: track._id || `ai_${Date.now()}` },
            [track]
          );
        } else if (data.action === "search_music" && Array.isArray(data.payload?.musics)) {
          setBrainContext(prev => ({
            ...prev,
            lastResults: data.payload.musics
          }));
        }
      }

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        "AI assistant is taking a break. Try shorter messages.";
      setError(errorMsg);
      if (import.meta.env.DEV) console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    setError("");
  };

  return (
    <>
      {/* Floating Circular Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="floating-fab"
          title="Open AI Assistant"
          aria-label="Open AI Assistant"
        >
          <svg
            className="fab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {/* Sparkle/Star Icon */}
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-header">
            <div className="header-content">
              <h3>AI Assistant</h3>
              <p className="text-xs">Powered by Groq</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="close-button"
              aria-label="Close AI Assistant"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="welcome-message">
                <div className="sparkle">✨</div>
                <h4>Welcome!</h4>
                <p>Ask me anything. I'm here to help!</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`message message-${message.role}`}
              >
                <div className="message-bubble">
                  {message.role === "assistant" &&
                  message.type === "ui-controller" ? (
                    <div className="structured-content">
                      {message.payload?.type === "songs" &&
                        message.payload.data?.map((song) => (
                          <SongCard key={song.id} song={song} />
                        ))}
                      {message.payload?.type === "empty" && (
                        <EmptyStateCard message={message.payload.message} />
                      )}
                      {!["songs", "empty"].includes(
                        message.payload?.type,
                      ) && (
                        <p>
                          {message.content ||
                            "Data received, but I can't render it yet."}
                        </p>
                      )}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message message-assistant">
                <div className="message-bubble loading">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            {error && (
              <div className="message message-error">
                <div className="message-bubble">⚠️ {error}</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <form onSubmit={handleSendMessage} className="chat-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="chat-input"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="send-button"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </form>

            {messages.length > 0 && (
              <button onClick={handleClearChat} className="clear-button">
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
