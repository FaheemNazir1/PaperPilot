import React from 'react';
import { LiteratureReview } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { BookOpen, ArrowRight, Calendar, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecentReviewsSectionProps {
  reviews: LiteratureReview[];
}

export const RecentReviewsSection: React.FC<RecentReviewsSectionProps> = ({ reviews }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent-400" />
          <span>Recent Literature Reviews</span>
        </h3>
        <button
          onClick={() => navigate('/literature-review')}
          className="text-xs text-accent-400 hover:text-accent-300 font-medium flex items-center gap-1 group"
        >
          <span>View All Reviews</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.slice(0, 2).map((rev) => (
          <Card
            key={rev.id}
            variant="interactive"
            onClick={() => navigate('/literature-review')}
            className="p-4 bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant="accent" size="sm">
                  {rev.reviewStyle} Style
                </Badge>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span>{rev.generatedAt}</span>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-zinc-200 line-clamp-2 leading-snug">
                {rev.title}
              </h4>

              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                Topic: {rev.topic}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                <span>{rev.paperCount} papers synthesized</span>
              </div>
              <span className="text-accent-400 font-medium flex items-center gap-1 text-[11px]">
                Read Document →
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
