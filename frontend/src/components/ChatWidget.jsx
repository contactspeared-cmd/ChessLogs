import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getChatContacts, getChatMessages, sendChatMessage } from '../lib/communityStore';
import {
  MessageSquare,
  Send,
  X,
  Minus,
  User,
  Search,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

export default function ChatWidget() {
  const { user, profile, isCoach } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputPgn, setInputPgn] = useState('');
  const [showPgnInput, setShowPgnInput] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [isSideDocked, setIsSideDocked] = useState(() => {
    try {
      return localStorage.getItem('chesslogs_chat_docked') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSideDock = (docked) => {
    setIsSideDocked(docked);
    try {
      localStorage.setItem('chesslogs_chat_docked', docked ? 'true' : 'false');
    } catch {}
  };

  const messagesEndRef = useRef(null);

  const contacts = useMemo(() => {
    if (!profile?.id) return [];
    return getChatContacts(profile.id, profile.role || 'student');
  }, [profile?.id, profile?.role]);

  const [activeContactId, setActiveContactId] = useState('');

  useEffect(() => {
    if (contacts.length > 0 && (!activeContactId || !contacts.some((c) => c.id === activeContactId))) {
      setActiveContactId(contacts[0].id);
    }
  }, [contacts, activeContactId]);

  const activeContact = useMemo(() => {
    return contacts.find((c) => c.id === activeContactId) || contacts[0] || null;
  }, [contacts, activeContactId]);

  const [messages, setMessages] = useState([]);

  const loadMessages = () => {
    if (!profile?.id || !activeContactId) return;
    const msgs = getChatMessages(profile.id, activeContactId);
    setMessages(msgs);
  };

  useEffect(() => {
    loadMessages();
  }, [profile?.id, activeContactId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const unreadCount = useMemo(() => {
    if (!profile?.id) return 0;
    return messages.filter((m) => m.receiver_id === profile.id && !m.is_read).length;
  }, [messages, profile?.id]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !inputPgn.trim()) return;
    if (!profile?.id || !activeContact?.id) return;

    sendChatMessage({
      senderId: profile.id,
      receiverId: activeContact.id,
      text: inputText.trim(),
      pgn: inputPgn.trim(),
    });

    setInputText('');
    setInputPgn('');
    setShowPgnInput(false);
    loadMessages();
  };

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.chesscom_username?.toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  const handleOpenFullMessenger = () => {
    setIsOpen(false);
    const target = activeContact?.id ? `/messages?recipient=${activeContact.id}` : '/messages';
    navigate(target);
  };

  if (!user || !profile) return null;
  if (location.pathname === '/messages') return null;

  return (
    <>
      {!isOpen && (
        isSideDocked ? (
          <div className="fixed bottom-6 right-0 z-50 animate-in fade-in slide-in-from-right duration-200">
            <button
              onClick={() => toggleSideDock(false)}
              className="flex items-center gap-1.5 pl-3 pr-2 py-3 rounded-l-2xl bg-slate-900/95 hover:bg-emerald-600 text-slate-300 hover:text-white border-y border-l border-slate-800 hover:border-emerald-500 shadow-2xl backdrop-blur-md transition-all duration-200 group"
              title="Expand Messages pill"
            >
              <ChevronLeft className="w-5 h-5 text-emerald-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
              {unreadCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          </div>
        ) : (
          <div className="fixed bottom-5 right-5 z-50 flex items-center animate-in fade-in duration-150">
            <div className="relative flex items-center rounded-full bg-emerald-600 shadow-2xl shadow-emerald-950/60 border border-emerald-400/30 overflow-hidden group hover:scale-[1.02] transition-all duration-200">
              <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2.5 pl-4 pr-3 py-3 text-white font-bold text-xs hover:bg-emerald-500/30 transition-colors"
                title="Open Chat"
              >
                <div className="relative">
                  <MessageSquare className="w-5 h-5 text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                  )}
                </div>
                <span>Messages</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSideDock(true);
                }}
                className="pr-2.5 pl-1.5 py-3 text-emerald-200 hover:text-white hover:bg-emerald-500/50 transition-colors border-l border-emerald-500/40"
                title="Hide to side"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      )}

      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] sm:w-[400px] h-[520px] max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-950 border-b border-slate-800 p-3.5 flex items-center justify-between gap-2 shrink-0">
            <div className="relative flex-1 min-w-0">
              <button
                onClick={() => setContactDropdownOpen(!contactDropdownOpen)}
                className="flex items-center gap-2.5 text-left w-full hover:bg-slate-900 p-1 rounded-xl transition-colors"
              >
                <div className="relative shrink-0">
                  <img
                    src={
                      activeContact?.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={activeContact?.display_name || 'Contact'}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {activeContact?.display_name || 'Chess Coach'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize truncate">
                    {activeContact?.role || (isCoach ? 'Student' : 'Coach')}
                  </div>
                </div>
              </button>

              {contactDropdownOpen && (
                <div className="absolute top-12 left-0 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredContacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveContactId(c.id);
                          setContactDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 p-1.5 rounded-xl text-left transition-colors text-xs ${
                          c.id === activeContact?.id ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <img
                          src={
                            c.avatar_url ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={c.display_name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate text-[11px]">{c.display_name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{c.role || 'Member'}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-1.5 border-t border-slate-800 mt-1">
                    <button
                      onClick={handleOpenFullMessenger}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    >
                      <span>Open Full Messenger</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleOpenFullMessenger}
                className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="View full chat messenger page"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/60">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600" />
                <p className="text-xs">No messages yet with {activeContact?.display_name || 'this contact'}.</p>
                <p className="text-[11px] text-slate-500">Ask questions, share moves, or discuss training.</p>
                <button
                  onClick={handleOpenFullMessenger}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline pt-1 font-semibold"
                >
                  <span>Open in Full Messenger</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === profile.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`text-xs px-3.5 py-2.5 rounded-2xl max-w-[85%] break-words leading-relaxed ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                          : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                      }`}
                    >
                      {m.text && <p>{m.text}</p>}
                      {m.pgn && (
                        <div className="mt-2 pt-2 border-t border-white/20 text-[11px] font-mono">
                          <div className="text-[10px] uppercase font-bold text-emerald-200 flex items-center gap-1 mb-1">
                            <BookOpen className="w-3 h-3" />
                            <span>PGN Variation</span>
                          </div>
                          <div className="bg-slate-950/40 p-2 rounded-lg break-words text-slate-200">
                            {m.pgn}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
            {showPgnInput && (
              <div className="relative animate-in fade-in duration-150">
                <textarea
                  rows={2}
                  placeholder="Paste PGN (e.g. 1. e4 e5 2. Nf3...)"
                  value={inputPgn}
                  onChange={(e) => setInputPgn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[11px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPgnInput(!showPgnInput)}
                className={`p-2 rounded-xl border text-xs transition-colors shrink-0 ${
                  showPgnInput
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Attach PGN line"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={`Message ${activeContact?.display_name || ''}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !inputPgn.trim()}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white shadow-md shadow-emerald-900/30 transition-all shrink-0"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
