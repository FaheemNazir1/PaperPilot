import React from 'react';
import { Card } from '../common/Card';
import { Sparkles, ArrowUpRight, CheckCircle2, TrendingUp, AlertTriangle, HelpCircle, FileText } from 'lucide-react';
import { AIInsightItem } from '../../data/mockStats';
import { Badge } from '../common/Badge';
import { useNavigate } from 'react-router-dom';

interface AIInsightsPanelProps {
  insights: AIInsightItem[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights }) => {
  const navigate = useNavigate();

  const getCategoryIcon = (category: AIInsightItem['category']) => {
    switch (category) {
      case 'Consensus':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Trend':
        return <TrendingUp className="w-3.5 h-3.5 text-accent-400" />;
      case 'Open Challenge':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <Card className="p-5 bg-zinc-900/40 border border-zinc-800/90 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-accent-600/15 text-accent-400 border border-accent-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Cross-Paper Research Intelligence
            </h3>
            <p className="text-[11px] text-zinc-400">
              Synthesized from your 12 indexed scientific papers
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/research-gaps')}
          className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1 font-medium group transition-colors"
        >
          <span>Research Gaps</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {insights.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800/90 hover:border-zinc-700/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getCategoryIcon(item.category)}
                <span className="text-xs font-semibold text-zinc-200">
                  {item.category}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  ({item.supportingPaperCount} papers)
                </span>
              </div>
              <Badge variant="outline" size="sm" className="text-[10px] font-mono">
                {item.impactTag}
              </Badge>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans mb-3">
              "{item.text}"
            </p>

            {/* Contributing papers indication */}
            {item.contributingPapers && item.contributingPapers.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/60">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                  Contributing Papers:
                </span>
                <div className="space-y-1">
                  {item.contributingPapers.map((title, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5 hover:text-zinc-200 cursor-pointer"
                      onClick={() => navigate('/papers')}
                    >
                      <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="truncate">{title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
