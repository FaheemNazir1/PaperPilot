import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { LiteratureReview } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface ContinueReviewCardProps {
  latestReview: LiteratureReview | null;
}

export const ContinueReviewCard: React.FC<ContinueReviewCardProps> = ({ latestReview }) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5 space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-accent-400" />
          Continue Research
        </span>
        {latestReview && (
          <Badge variant="accent" className="text-[10px] font-mono">
            {latestReview.reviewStyle || 'IEEE'}
          </Badge>
        )}
      </div>

      {latestReview ? (
        <div className="space-y-3">
          <div>
            <span className="text-[11px] text-zinc-400 block mb-0.5">
              Current Literature Review:
            </span>
            <h4 className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug">
              "{latestReview.title || latestReview.topic}"
            </h4>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
            <span>{latestReview.paperCount || 12} papers</span>
            <span>·</span>
            <span>{latestReview.reviewStyle || 'IEEE'}</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <Clock className="w-3 h-3" />
              Recent draft
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
            {latestReview.abstract}
          </p>

          <Button
            variant="primary"
            size="sm"
            className="w-full justify-center"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate('/literature-review')}
          >
            Continue Review
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">
              Your first literature review starts here.
            </h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Select multiple papers and let PaperPilot automatically synthesize methodologies, findings, and research gaps.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full justify-center"
            rightIcon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => navigate('/literature-review')}
          >
            Create Literature Review
          </Button>
        </div>
      )}
    </div>
  );
};
