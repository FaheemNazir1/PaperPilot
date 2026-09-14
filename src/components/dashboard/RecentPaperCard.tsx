import React from 'react';
import { Paper } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Sparkles, Eye, BookOpen } from 'lucide-react';

interface RecentPaperCardProps {
  paper: Paper;
  onOpenDetails: (paper: Paper) => void;
  onOpenSummary: (paper: Paper) => void;
}

export const RecentPaperCard: React.FC<RecentPaperCardProps> = ({
  paper,
  onOpenDetails,
  onOpenSummary
}) => {
  const getStatusVariant = (status: Paper['status']) => {
    switch (status) {
      case 'Analyzed':
        return 'success';
      case 'Indexed':
        return 'accent';
      case 'Embedding Ready':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <Card className="p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/90 transition-all flex flex-col justify-between group hover:bg-zinc-900/80">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant={getStatusVariant(paper.status)} size="sm">
            {paper.status}
          </Badge>
          <span className="text-[11px] font-mono text-zinc-400">
            {paper.year}
          </span>
        </div>

        <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-accent-300 transition-colors line-clamp-2 leading-snug">
          {paper.title}
        </h4>

        <p className="text-xs text-zinc-400 mt-1 truncate font-sans">
          {paper.authors.join(', ')}
        </p>

        {/* Research Area Pill */}
        <div className="mt-2.5 mb-2.5 flex items-center gap-1.5 flex-wrap">
          <Badge variant="accent" size="sm" className="text-[10px] font-mono">
            {paper.researchArea || paper.category}
          </Badge>
          <span className="text-[10px] text-zinc-500 font-mono">
            {paper.citationsCount} citations
          </span>
        </div>

        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-850 font-sans">
          {paper.summary}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent-400" />}
          onClick={() => onOpenSummary(paper)}
        >
          Summarize
        </Button>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => onOpenDetails(paper)}
        >
          View
        </Button>
      </div>
    </Card>
  );
};
