import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight, ExternalLink } from 'lucide-react';
import { Paper } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface CompactPaperListProps {
  papers: Paper[];
  onOpenPaper: (paper: Paper) => void;
}

export const CompactPaperList: React.FC<CompactPaperListProps> = ({
  papers,
  onOpenPaper,
}) => {
  const displayPapers = papers.slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-400" />
            <span>Your Research Papers</span>
            {papers.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-850 text-zinc-400 font-mono">
                {papers.length}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Papers available for synthesis and review generation
          </p>
        </div>

        <Link
          to="/papers"
          className="text-xs text-accent-400 hover:text-accent-300 font-medium inline-flex items-center gap-1 transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {displayPapers.length === 0 ? (
        <div className="p-6 text-center rounded-lg border border-zinc-850 bg-zinc-950/40 text-xs text-zinc-400">
          No papers uploaded yet. Upload your first scientific PDF above to begin.
        </div>
      ) : (
        <div className="divide-y divide-zinc-850/80 rounded-lg border border-zinc-850 bg-zinc-950/50 overflow-hidden">
          {displayPapers.map((paper) => {
            const authorShort =
              paper.authors.length > 1
                ? `${paper.authors[0]} et al.`
                : paper.authors[0] || 'Unknown Author';

            return (
              <div
                key={paper.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      onClick={() => onOpenPaper(paper)}
                      className="text-xs font-semibold text-zinc-200 hover:text-accent-300 cursor-pointer transition-colors truncate max-w-md"
                    >
                      {paper.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                      {paper.category || paper.researchArea}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-sans flex items-center gap-1.5 flex-wrap">
                    <span>{authorShort}</span>
                    <span>·</span>
                    <span>{paper.year}</span>
                    {paper.venue && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-xs text-zinc-400">{paper.venue}</span>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-1 leading-relaxed">
                    {paper.summary || paper.abstract}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hidden md:inline-block">
                    {paper.status}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    onClick={() => onOpenPaper(paper)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
