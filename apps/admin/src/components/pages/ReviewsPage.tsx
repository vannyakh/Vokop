import React, { useState } from 'react';
import { Star, MessageSquare, Check, ThumbsUp, Filter, MessageCircle } from 'lucide-react';
import { Button } from '../atoms/Button';

interface Review {
  id: string;
  buyer: string;
  rating: number;
  item: string;
  comment: string;
  date: string;
  response?: string;
}

const initialReviews: Review[] = [
  {
    id: '1',
    buyer: 'mario_bros',
    rating: 5,
    item: 'Cyberpunk 2077: Phantom Liberty',
    comment: 'Instant delivery. The key activated on Steam on the first try. Best price on the internet!',
    date: '2026-06-30'
  },
  {
    id: '2',
    buyer: 'peach_princess',
    rating: 3,
    item: 'Grand Theft Auto V',
    comment: 'The key is fresh, but Epic Games took a while to log in and sync my cloud save. Not the sellers fault but a bit laggy.',
    date: '2026-06-28',
    response: 'Thank you for your feedback! Epic Games serves are sometimes congested on weekends. Enjoy the play!'
  },
  {
    id: '3',
    buyer: 'luigi_green',
    rating: 5,
    item: 'Elden Ring',
    comment: 'Insanely fast support! Had a region issue and the seller replaced the key with a global one in less than 5 minutes. 10/10.',
    date: '2026-06-25'
  },
  {
    id: '4',
    buyer: 'bowser_fire',
    rating: 1,
    item: 'Minecraft Java',
    comment: 'Wait what? It says out of stock when I bought it, but it allowed me to purchase anyway? Give me code or refund now!',
    date: '2026-06-20'
  }
];

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleReplySubmit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setReviews(prev =>
      prev.map(r => (r.id === id ? { ...r, response: replyText } : r))
    );
    setReplyId(null);
    setReplyText('');
  };

  const filteredReviews = reviews.filter(r =>
    filterRating === 'all' || r.rating === filterRating
  );

  const averageRating = (
    reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
  ).toFixed(1);

  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {/* Summary Scoreboard banner */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="text-center bg-black/15 border border-white/6 px-5 py-4 rounded-2xl flex-shrink-0 select-none">
            <div className="text-3xl font-extrabold text-white">{averageRating}</div>
            <div className="flex items-center gap-0.5 justify-center mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(parseFloat(averageRating))
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-[var(--text-dim)]'
                  }`}
                />
              ))}
            </div>
            <div className="text-[10px] text-[var(--text-dim)] mt-1.5 font-bold uppercase tracking-wider">{reviews.length} reviews</div>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-white">Customer Satisfaction Dashboard</h3>
            <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-[500px]">
              Review buyer feedback and submit replies to resolve any negative issues. Maintaining a high rating enhances search visibility in the public catalog.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-black/15 border border-white/6 rounded-xl p-0.5 select-none flex-shrink-0">
          <span className="text-[10px] text-[var(--text-dim)] px-2.5 font-black uppercase flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter
          </span>
          {([5, 3, 1, 'all'] as const).map(rate => (
            <button
              key={rate}
              onClick={() => setFilterRating(rate)}
              className={`px-3 py-1.25 text-xs font-bold rounded-md cursor-pointer transition-all ${
                filterRating === rate
                  ? 'bg-[var(--indigo)] text-white'
                  : 'text-[var(--text-dim)] hover:text-white'
              }`}
            >
              {rate === 'all' ? 'All' : `${rate} ★`}
            </button>
          ))}
        </div>
      </div>

      {/* Review feeds */}
      <div className="space-y-4">
        {filteredReviews.map(r => (
          <div key={r.id} className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{r.buyer}</span>
                  <span className="text-[9px] text-[var(--text-dim)]">•</span>
                  <span className="text-[10px] text-[var(--text-dim)] font-semibold">{r.date}</span>
                </div>
                <div className="text-[11px] text-[var(--indigo)] font-bold">{r.item}</div>
              </div>

              {/* Star rating info */}
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Main review comment */}
            <p className="text-xs text-[var(--text-mid)] font-medium leading-relaxed bg-black/5 p-3 rounded-xl border border-white/4">
              {r.comment}
            </p>

            {/* Reply thread */}
            {r.response ? (
              <div className="pl-4.5 border-l-2 border-[var(--indigo)]/45 ml-2 space-y-1 select-none">
                <div className="text-[10px] text-[var(--indigo)] font-bold uppercase tracking-wider flex items-center gap-1.25">
                  <MessageSquare className="w-3 h-3" />
                  <span>Your Response (Merchant)</span>
                </div>
                <p className="text-xs text-[var(--text-dim)] leading-relaxed italic">
                  "{r.response}"
                </p>
              </div>
            ) : replyId === r.id ? (
              <form onSubmit={(e) => handleReplySubmit(r.id, e)} className="space-y-3 pt-1">
                <textarea
                  required
                  rows={2.5}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type public merchant reply..."
                  className="w-full bg-white/4 border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all placeholder-[var(--text-dim)] leading-relaxed resize-none font-semibold"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReplyId(null)}
                    className="h-8 px-4 rounded-lg bg-white/2 hover:bg-white/6 border border-[var(--border)] text-xs text-[var(--text-mid)] font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button type="submit" className="h-8 px-4 text-xs font-bold">
                    Post Reply
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setReplyId(r.id);
                    setReplyText('');
                  }}
                  className="h-8 rounded-lg bg-white/4 hover:bg-[var(--indigo)]/10 border border-[var(--border)] hover:border-[var(--indigo)]/20 text-xs text-white hover:text-[var(--indigo)] px-3 font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Reply Review</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
