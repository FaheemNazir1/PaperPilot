import React from 'react';
import { ResearchGap } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { FileText, ChevronRight, Sparkles } from 'lucide-react';

interface GapCardProps {
  gap: ResearchGap;
  isSelected?: boolean;
  onSelect?: (gap: ResearchGap) => void;
}

export const GapCard: React.FC<GapCardProps> = ({ gap, isSelected, onSelect }) => {
  const getFrequencyVariant = (freq: ResearchGap['frequency']) => {
    switch (freq) {
      case 'High-frequency observation':
        return 'warning';
      case 'Medium-frequency observation':
        return 'accent';
      case 'Emerging research gap':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const getCleanFrequency = (freq: ResearchGap['frequency']) => {
    if (freq.includes('High')) return 'High';
    if (freq.includes('Medium')) return 'Medium';
    return 'Emerging';
  };

  const getFeasibilityLabel = (score: number) => {
    if (score >= 85) return 'High';
    if (score >= 70) return 'Medium';
    return 'Complex';
  };

  return (
    <Card
      variant="interactive"
      onClick={() => onSelect?.(gap)}
      className={`p-5 bg-zinc-900/50 border transition-all flex flex-col justify-between group hover:bg-zinc-900/80 ${
        isSelected
          ? 'border-accent-500/70 bg-zinc-900/90 ring-1 ring-accent-500/40 shadow-md'
          : 'border-zinc-800 hover:border-zinc-700/80'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <Badge variant={getFrequencyVariant(gap.frequency)} size="sm">
            Frequency: {getCleanFrequency(gap.frequency)}
          </Badge>
          <span className="text-[11px] font-mono text-zinc-400">
            {gap.frequencyCount} Papers
          </span>
        </div>

        {/* Gap Title */}
        <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-accent-300 transition-colors mb-2 leading-snug">
          {gap.title}
        </h4>

        {/* Gap Description */}
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-3 font-sans">
          {gap.description}
        </p>

        {/* Evidence preview */}
        {gap.evidence && (
          <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-850 mb-3 text-[11px] text-zinc-400 italic">
            <span className="text-zinc-500 not-italic font-mono uppercase text-[10px] block mb-0.5">Evidence:</span>
            <span className="line-clamp-2 font-sans">"{gap.evidence}"</span>
          </div>
        )}

        {/* Affected Papers Pill List */}
        <div className="space-y-1 mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Observed In ({gap.affectedPapers.length} papers):
          </span>
          <div className="space-y-1">
            {gap.affectedPapers.slice(0, 2).map((paperTitle, idx) => (
              <div
                key={idx}
                className="text-[11px] text-zinc-300 truncate bg-zinc-950/40 px-2 py-1 rounded border border-zinc-850/80 flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="truncate">{paperTitle}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metric footer: Impact, Feasibility, Opportunity */}
      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 font-mono">
          <div>
            <span className="text-[10px] text-zinc-500 block">IMPACT</span>
            <span className="font-semibold text-accent-400 text-xs">{gap.potentialImpact}</span>
          </div>
          <div className="w-px h-5 bg-zinc-800" />
          <div>
            <span className="text-[10px] text-zinc-500 block">FEASIBILITY</span>
            <span className="font-semibold text-zinc-300 text-xs">{getFeasibilityLabel(gap.feasibilityScore)}</span>
          </div>
        </div>

        <span className="text-xs text-accent-400 group-hover:text-accent-300 flex items-center gap-0.5 font-medium">
          View Thesis Brief <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Card>
  );
};
