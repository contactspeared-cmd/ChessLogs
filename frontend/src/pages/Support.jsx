import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSupportTickets, createSupportTicket } from '../lib/communityStore';
import {
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Send,
  LifeBuoy,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export default function Support() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState(() => getSupportTickets(profile?.id));
  const [openFaq, setOpenFaq] = useState(null);

  const [category, setCategory] = useState('MoveTrainer');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const faqs = [
    {
      q: 'How does the MoveTrainer Spaced Repetition system work?',
      a: 'MoveTrainer tracks every move variation you play in an interactive course. When you complete moves accurately, the repetition interval increases. When you make an error, the interval drops and the move is prioritized for review.',
    },
    {
      q: 'Can I study courses without being a private coaching student?',
      a: 'Yes. All interactive masterclasses in the marketplace are freely available for open enrollment. If you desire dedicated 1-on-1 private mentoring and personalized game reviews, visit the coach profile to apply for official mentorship.',
    },
    {
      q: 'How is game accuracy calculated with Stockfish 18 NNUE?',
      a: 'ChessLogs evaluates all positions locally inside your browser using a WASM Web Worker. Expected Points Lost (EPL) curves calculate your accuracy percentage across all plies.',
    },
    {
      q: 'How do I sync my recent matches from Chess.com?',
      a: 'Navigate to Games from the top navigation bar, ensure your Chess.com username is entered in your profile, and click "Sync Chess.com Matches". Up to 50 recent games are imported and categorized by ECO opening code.',
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    const newTicket = createSupportTicket({
      userId: profile?.id || 'guest',
      userName: profile?.display_name || 'ChessLogs Learner',
      userEmail: profile?.email || 'learner@chesslogs.com',
      category,
      subject,
      message,
      priority,
    });

    if (newTicket) {
      setTickets((prev) => [newTicket, ...prev]);
      setSubject('');
      setMessage('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-10 text-white shadow-lg space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-emerald-300">
          <LifeBuoy className="w-3.5 h-3.5" />
          Customer Service &amp; Help Desk
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight">How can our team help you today?</h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Find answers to frequently asked questions about MoveTrainer, Stockfish analysis, and coach mentorship, or submit a direct inquiry to our support staff.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Frequently Asked Questions</span>
          </h2>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="border border-slate-800 rounded-2xl overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 bg-slate-950 hover:bg-slate-800 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-200 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-slate-900 text-xs text-slate-400 leading-relaxed border-t border-slate-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <span>Submit a Support Inquiry</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">We reply within 24 hours.</p>
          </div>

          {submitted && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ticket submitted successfully! Check status below.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Topic Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="MoveTrainer">MoveTrainer / Spaced Repetition</option>
                  <option value="Courses">Course Enrollment &amp; Playback</option>
                  <option value="Engine">Stockfish 18 NNUE Accuracy</option>
                  <option value="Coaching">Coaching &amp; Mentorship</option>
                  <option value="Account">Account &amp; Profile</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                required
                placeholder="Brief summary of the issue..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Detailed Description</label>
              <textarea
                rows={3}
                required
                placeholder="Include steps to reproduce or specific course chapter..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Submit Ticket</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          <span>Your Support Ticket History</span>
        </h2>

        {tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No support inquiries submitted yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tickets.map((tkt) => (
              <div key={tkt.id} className="py-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-400">{tkt.id}</span>
                    <span className="font-bold text-white">{tkt.subject}</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      {tkt.category}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      tkt.status === 'resolved'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : tkt.status === 'in-review'
                        ? 'bg-amber-100 text-amber-400'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {tkt.status}
                  </span>
                </div>

                <p className="text-slate-400 leading-relaxed">{tkt.message}</p>

                {tkt.response && (
                  <div className="p-3 rounded-xl bg-emerald-500/10/70 border border-emerald-500/20/60 text-emerald-900 space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Staff Response:</div>
                    <p className="text-xs leading-relaxed">{tkt.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
