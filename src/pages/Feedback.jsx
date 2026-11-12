import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFeedbackItems, submitFeedback, upvoteFeedback } from '../lib/communityStore';
import {
  MessageCircle,
  Star,
  ThumbsUp,
  Send,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export default function Feedback() {
  const { profile } = useAuth();
  const [feedbacks, setFeedbacks] = useState(() => getFeedbackItems());

  const [category, setCategory] = useState('Feature Request');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !comments.trim()) return;

    const newFb = submitFeedback({
      userId: profile?.id || 'guest',
      userName: profile?.display_name || 'Community Member',
      category,
      rating,
      title,
      comments,
    });

    if (newFb) {
      setFeedbacks((prev) => [newFb, ...prev]);
      setTitle('');
      setComments('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  const handleUpvote = (id) => {
    const updated = upvoteFeedback(id);
    if (updated) {
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, upvotes: updated.upvotes } : f))
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-lg space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-teal-200">
          <MessageCircle className="w-3.5 h-3.5" />
          Community Feedback &amp; Ideas
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight">Help Us Build the Best Chess LMS</h1>
        <p className="text-sm text-teal-100 max-w-2xl leading-relaxed">
          Share your suggestions, feature requests, or report bugs. Vote on ideas submitted by the community to help us prioritize platform development.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>Share Your Feedback</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Let us know how we can improve.</p>
          </div>

          {submitted && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Thank you! Your feedback has been posted.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Feedback Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Feature Request">Feature Request</option>
                <option value="User Experience">User Experience / UI</option>
                <option value="Course Content">Course Content &amp; PGNs</option>
                <option value="Stockfish Engine">Stockfish NNUE Engine</option>
                <option value="Bug Report">Bug Report</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Satisfaction Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-semibold text-slate-400 ml-2">{rating} / 5 Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Feedback Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Export training cards to PGN"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Comments &amp; Details</label>
              <textarea
                rows={3}
                required
                placeholder="Describe your idea or experience..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Post Feedback</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Community Ideas &amp; Upvotes</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">{feedbacks.length} ideas</span>
          </div>

          <div className="divide-y divide-slate-800">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="py-4 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{fb.title}</span>
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        {fb.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>By {fb.user_name}</span>
                      <span>•</span>
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: fb.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpvote(fb.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-emerald-500/10 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/20 text-slate-300 font-bold transition-all shrink-0"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{fb.upvotes || 0}</span>
                  </button>
                </div>

                <p className="text-slate-400 leading-relaxed">{fb.comments}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
