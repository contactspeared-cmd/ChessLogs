import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getChatContacts, getChatMessages, sendChatMessage } from '../lib/communityStore';
import {
  MessageSquare,
  Send,
  User,
  CheckCheck,
  Check,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export default function Chat() {
  const { profile, isCoach, isAdmin } = useAuth();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const requestedRecipient = queryParams.get('recipient');

  const contacts = useMemo(() => {
    if (!profile?.id) return [];
    return getChatContacts(profile.id, profile.role || 'student');
  }, [profile?.id, profile?.role]);

  const [activeContactId, setActiveContactId] = useState(
    requestedRecipient || (contacts[0]?.id || 'coach-magnus-uuid')
  );
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [inputPgn, setInputPgn] = useState('');
  const [showPgnInput, setShowPgnInput] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const messagesEndRef = useRef(null);

  const activeContact = useMemo(() => {
    return contacts.find((c) => c.id === activeContactId) || contacts[0];
  }, [contacts, activeContactId]);

  const loadMessages = () => {
    if (!profile?.id || !activeContactId) return;
    const msgs = getChatMessages(profile.id, activeContactId);
    setMessages(msgs);
  };

  useEffect(() => {
    loadMessages();
  }, [profile?.id, activeContactId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[750px]">
        <div className="md:col-span-4 border-r border-slate-800 flex flex-col justify-between bg-slate-950">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="font-extrabold text-base text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>{isCoach ? 'Student Chats' : 'Coach Messages'}</span>
              </h1>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                {contacts.length} Active
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800 p-2 space-y-1">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No conversations found.
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = c.id === activeContactId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveContactId(c.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-slate-900 shadow-sm border border-slate-800'
                        : 'hover:bg-slate-800/70 border border-transparent'
                    }`}
                  >
                    <img
                      src={
                        c.avatar_url ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                      }
                      alt={c.display_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">
                          {c.display_name}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {c.role || 'Member'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {c.bio || (c.role === 'coach' ? 'FIDE Certified Coach' : 'Student')}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="md:col-span-8 flex flex-col justify-between bg-slate-900">
          {activeContact ? (
            <>
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      activeContact.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={activeContact.display_name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-800 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                      <span>{activeContact.display_name}</span>
                      {activeContact.role === 'coach' && (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {activeContact.chesscom_username ? `@${activeContact.chesscom_username}` : activeContact.email}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/100" />
                  <span>Online for instruction</span>
                </div>
              </div>

              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-400">No messages exchanged yet</p>
                    <p className="text-[11px] max-w-xs text-slate-400">
                      Send a study question, opening variation discussion, or tactical position PGN below.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === profile?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-lg p-3.5 rounded-2xl text-xs space-y-2 shadow-sm ${
                            isMine
                              ? 'bg-emerald-600 text-white rounded-br-none'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                          }`}
                        >
                          {m.text && <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>}

                          {m.pgn && (
                            <div
                              className={`p-2.5 rounded-xl text-[11px] font-mono overflow-x-auto ${
                                isMine
                                  ? 'bg-emerald-700/80 text-emerald-100 border border-emerald-500/40'
                                  : 'bg-slate-950 text-emerald-300 border border-slate-800'
                              }`}
                            >
                              <div className="text-[10px] uppercase font-bold tracking-wider opacity-80 mb-1 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>Chess Move Sequence</span>
                              </div>
                              {m.pgn}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMine && <CheckCheck className="w-3 h-3 text-emerald-600 ml-1" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900 space-y-3">
                {showPgnInput && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Attach PGN Move Sequence</span>
                      <button
                        type="button"
                        onClick={() => setShowPgnInput(false)}
                        className="text-slate-400 hover:text-slate-300"
                      >
                        Dismiss
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *"
                      value={inputPgn}
                      onChange={(e) => setInputPgn(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPgnInput(!showPgnInput)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
                      showPgnInput
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-800'
                    }`}
                    title="Add Chess PGN sequence to your message"
                  >
                    + PGN
                  </button>

                  <input
                    type="text"
                    placeholder="Type your study message or question..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                  />

                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all shrink-0 flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 text-xs">
              Select a conversation to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
