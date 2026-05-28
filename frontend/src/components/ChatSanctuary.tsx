"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/utils/api";
import { 
  Plus, Trash2, Send, MessageSquare, AlertTriangle, 
  Sparkles, Smile, MessageCircle, RefreshCw, PhoneCall
} from "lucide-react";

interface Session {
  id: number;
  title: string;
  created_at: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  language?: string;
  timestamp: string;
}

interface User {
  name: string;
  age: number;
  email: string;
}

export default function ChatSanctuary() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputText, setInputText] = useState("");
  const [user, setUser] = useState<User | null>(null);
  
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sending, setSending] = useState(false);
  const [crisisAlert, setCrisisAlert] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user profile and session lists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chitraksha_user");
      if (stored) setUser(JSON.parse(stored));
    }
    fetchSessions();
  }, []);

  // Fetch messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
      setCrisisAlert(false);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const list = await api.getSessions();
      setSessions(list);
      // Auto select first session if available and none selected
      if (list.length > 0 && !activeSessionId) {
        setActiveSessionId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load sessions:", e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchMessages = async (sessionId: number) => {
    try {
      const list = await api.getMessages(sessionId);
      setMessages(list);
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  };

  const handleCreateSession = async () => {
    try {
      const title = `Session on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
      const result = await api.createSession(title);
      await fetchSessions();
      setActiveSessionId(result.session_id);
    } catch (e) {
      console.error("Failed to create session:", e);
    }
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat session?")) return;
    try {
      await api.deleteSession(sessionId);
      
      // If deleted active session, select another one or nullify
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      
      await fetchSessions();
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSessionId || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    // Optimistically add user message and empty assistant message to list
    const tempUserMsg: Message = {
      id: Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };
    const tempAssistantMsg: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);

    try {
      await api.streamMessage(
        activeSessionId, 
        text,
        // onChunk
        (chunk) => {
          setMessages(prev => {
            const newMessages = [...prev];
            const idx = newMessages.findIndex(m => m.id === tempAssistantMsg.id);
            if (idx !== -1) {
              newMessages[idx] = { ...newMessages[idx], content: newMessages[idx].content + chunk };
            }
            return newMessages;
          });
        },
        // onMeta
        (meta) => {
          if (meta.crisis_detected) {
            setCrisisAlert(true);
          }
          if (meta.user_message_id) {
            setMessages(prev => {
              const newMessages = [...prev];
              const idx = newMessages.findIndex(m => m.id === tempUserMsg.id);
              if (idx !== -1) {
                newMessages[idx] = { ...newMessages[idx], id: meta.user_message_id, language: meta.user_language };
              }
              return newMessages;
            });
          }
        },
        // onDone
        (doneData) => {
          if (doneData.assistant_message_id) {
            setMessages(prev => {
              const newMessages = [...prev];
              const idx = newMessages.findIndex(m => m.id === tempAssistantMsg.id);
              if (idx !== -1) {
                newMessages[idx] = { ...newMessages[idx], id: doneData.assistant_message_id, language: doneData.language };
              }
              return newMessages;
            });
          }
        }
      );
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove optimistic messages on fail
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id && m.id !== tempAssistantMsg.id));
    } finally {
      setSending(false);
    }
  };

  const getPersonaLabel = () => {
    if (!user) return "";
    return user.age <= 25 
      ? "Friendly (≤25) - Warm Hinglish ('Yaar')" 
      : "Professional (26+) - Supportive counselor ('Aap')";
  };

  return (
    <div className="h-[calc(100vh-140px)] min-h-[500px] flex overflow-hidden border border-sage/10 rounded-2xl bg-sand/40 shadow-sm animate-float-delayed">
      
      {/* 1. Left Session Sidebar */}
      <div className="w-64 border-r border-sage/10 bg-sand/65 flex flex-col justify-between flex-shrink-0 hidden md:flex">
        <div className="p-4 space-y-4 overflow-y-auto flex-grow">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sage text-lg">Session Log</h3>
            <button 
              onClick={handleCreateSession}
              className="p-1.5 bg-terracotta hover:bg-terracotta-dark text-sand rounded-lg shadow-sm transition-all"
              title="New Session"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {loadingSessions ? (
              <div className="text-center py-6 text-xs text-charcoal-light flex items-center justify-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading logs...</span>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-charcoal-light italic py-4 text-center">No logs logged yet.</p>
            ) : (
              sessions.map((sess) => (
                <div 
                  key={sess.id}
                  onClick={() => setActiveSessionId(sess.id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs font-semibold transition-all group ${
                    activeSessionId === sess.id 
                      ? "bg-saffron text-sand font-bold shadow-md shadow-saffron/15" 
                      : "bg-sand hover:bg-sand-dark text-charcoal"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 opacity-80" />
                    <span className="truncate">{sess.title}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                    className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                      activeSessionId === sess.id ? "hover:bg-saffron-dark text-sand" : "hover:bg-terracotta/10 text-terracotta"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info panel */}
        {user && (
          <div className="p-3 border-t border-sage/10 bg-sand/30 space-y-1">
            <p className="text-[10px] uppercase font-bold text-charcoal-light tracking-wider">Active Persona</p>
            <div className="flex items-center space-x-1 text-[11px] text-sage font-bold">
              <Smile className="w-3.5 h-3.5 text-saffron" />
              <span className="truncate">{getPersonaLabel()}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Right Chat Area */}
      <div className="flex-grow flex flex-col justify-between bg-sand/20">
        
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-sage/10 bg-sand/65 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sage/10 text-sage rounded-xl">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-charcoal text-base md:text-lg">
                Chitraksha Sanctuary
              </h3>
              <p className="text-[10px] text-charcoal-light flex items-center space-x-1">
                <span>Empathetic AI Companion</span>
                <span className="w-1 h-1 rounded-full bg-sage inline-block"></span>
                <span>Hindi & Hinglish Enabled</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:hidden">
            <button 
              onClick={handleCreateSession}
              className="p-2 bg-terracotta text-sand rounded-xl shadow-md"
              title="New Session"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages space */}
        <div className="flex-grow p-6 overflow-y-auto space-y-4">
          
          {!activeSessionId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
              <div className="p-4 bg-gradient-to-br from-terracotta/10 to-saffron/10 text-terracotta rounded-full animate-float">
                <Sparkles className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-serif font-bold text-charcoal">
                Enter the Chat Sanctuary
              </h4>
              <p className="text-xs text-charcoal-light leading-relaxed">
                Start a secure conversation. Share whatever is on your mind—exam stress, feelings of isolation, or relationship conflict. We are listening.
              </p>
              <button 
                onClick={handleCreateSession}
                className="px-4 py-2 bg-terracotta hover:bg-terracotta-dark text-sand text-xs font-semibold rounded-xl transition-all"
              >
                Begin New Chat Session
              </button>
            </div>
          ) : messages.length === 0 && !sending ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 max-w-xs mx-auto">
              <Smile className="w-8 h-8 text-sage/40" />
              <p className="text-xs font-semibold text-charcoal">The sanctuary is quiet.</p>
              <p className="text-[11px] text-charcoal-light">
                Say hello to Chitraksha! You can write in Hindi or English (e.g. "Mujhe bahut tension ho rahi hai")
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Introduction card */}
              <div className="p-3.5 bg-sage/5 border border-sage/10 rounded-xl text-center text-[10px] text-sage font-medium max-w-md mx-auto mb-6">
                ✨ Chitraksha has customized its response style to: <strong className="text-sage-dark">{getPersonaLabel()}</strong> based on your age setup.
              </div>

              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div 
                    key={msg.id || `${msg.role}-${idx}`}
                    className={`flex ${isUser ? "justify-end" : "justify-start"} animate-float-delayed`}
                  >
                    <div 
                      className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed shadow-sm ${
                        isUser 
                          ? "bg-saffron text-sand font-medium rounded-tr-none" 
                          : "bg-sand border border-sage/15 text-charcoal rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                      
                      {/* Language badge */}
                      {msg.language && (
                        <div className="flex justify-end items-center mt-1 opacity-40 text-[8px] font-bold tracking-wider">
                          <span>{msg.language.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing simulator */}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-sand border border-sage/15 rounded-2xl rounded-tl-none px-4 py-3 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-sage animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 rounded-full bg-sage animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-sage animate-bounce"></span>
                  </div>
                </div>
              )}

              {/* Crisis helpline alert card */}
              {crisisAlert && (
                <div className="border border-terracotta/20 bg-gradient-to-r from-terracotta/5 to-saffron/5 rounded-2xl p-5 space-y-4 max-w-md mx-auto animate-pulse-gentle">
                  <div className="flex items-center space-x-2 text-terracotta">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <h5 className="font-serif font-bold text-sm">Emergency Support Triggered</h5>
                  </div>
                  <p className="text-xs text-charcoal-light leading-relaxed">
                    It seems you are feeling extremely overwhelmed. Your life has immense value, and you do not have to go through this alone. Call these confidential numbers in India immediately to speak to professionals:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <a href="tel:18602662345" className="flex items-center justify-center space-x-1 px-3 py-2 border border-terracotta/20 bg-sand rounded-xl text-terracotta hover:bg-terracotta/10 transition-colors">
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Vandrevala (24/7)</span>
                    </a>
                    <a href="tel:912227546669" className="flex items-center justify-center space-x-1 px-3 py-2 border border-terracotta/20 bg-sand rounded-xl text-terracotta hover:bg-terracotta/10 transition-colors">
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>AASRA (24/7)</span>
                    </a>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {/* Input box */}
        {activeSessionId && (
          <div className="px-6 py-4 border-t border-sage/10 bg-sand/65">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input 
                type="text"
                placeholder="Talk to Chitraksha... (Type in English, Hindi, or Hinglish)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
                className="flex-grow px-4 py-3 border border-sage/20 bg-sand rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal placeholder:text-charcoal-light/40"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="p-3 bg-terracotta hover:bg-terracotta-dark text-sand disabled:bg-sage/20 disabled:text-charcoal-light/45 rounded-xl transition-all shadow-md shadow-terracotta/15 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
