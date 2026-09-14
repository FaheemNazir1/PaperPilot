import React, { useState } from 'react';
import { ResearchGap } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Compass, Sparkles, Target, Zap } from 'lucide-react';

interface GapMapVisualizerProps {
  gaps: ResearchGap[];
  selectedGapId: string | null;
  onSelectGap: (gap: ResearchGap) => void;
}

export const GapMapVisualizer: React.FC<GapMapVisualizerProps> = ({
  gaps,
  selectedGapId,
  onSelectGap
}) => {
  const [hoveredGap, setHoveredGap] = useState<ResearchGap | null>(null);

  // Convert scores (0-100) to relative percentages on coordinate plane
  return (
    <Card className="p-6 bg-zinc-900/60 border border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent-600/20 text-accent-400 border border-accent-500/30">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Research Gap Opportunity Map
            </h3>
            <p className="text-xs text-zinc-400">
              Interactive 2D taxonomy: Methodological Feasibility vs. Scientific Impact
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-zinc-400">Immediate High-Yield</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-400 inline-block" />
            <span className="text-zinc-400">Transformative</span>
          </div>
        </div>
      </div>

      {/* 2D Coordinate Visualizer */}
      <div className="relative w-full h-80 sm:h-96 bg-zinc-950/80 rounded-xl border border-zinc-800 p-6 overflow-hidden">
        {/* Quadrant Guide Lines */}
        <div className="absolute inset-0 flex">
          <div className="w-1/2 h-full border-r border-zinc-850" />
          <div className="w-1/2 h-full" />
        </div>
        <div className="absolute inset-0 flex flex-col">
          <div className="h-1/2 w-full border-b border-zinc-850" />
          <div className="h-1/2 w-full" />
        </div>

        {/* Quadrant Label Watermarks */}
        <div className="absolute top-3 left-4 text-[10px] font-mono text-zinc-600 uppercase tracking-wider select-none">
          Transformative • High Risk (Complex)
        </div>
        <div className="absolute top-3 right-4 text-[10px] font-mono text-emerald-500/60 uppercase tracking-wider select-none font-semibold">
          ★ High Impact • High Feasibility (Priority)
        </div>
        <div className="absolute bottom-3 left-4 text-[10px] font-mono text-zinc-700 uppercase tracking-wider select-none">
          Low Priority Explorations
        </div>
        <div className="absolute bottom-3 right-4 text-[10px] font-mono text-zinc-600 uppercase tracking-wider select-none">
          Incremental Benchmarking
        </div>

        {/* X and Y Axis Labels */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          Feasibility Score →
        </div>
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          Scientific Impact →
        </div>

        {/* Render Gap Nodes */}
        {gaps.map((gap) => {
          // Normalize coordinates with padding: X (feasibility 0-100) -> 10% to 90%, Y (opportunity 0-100) -> 10% to 90%
          const leftPercent = 10 + (gap.feasibilityScore / 100) * 80;
          const bottomPercent = 10 + (gap.opportunityScore / 100) * 80;
          const isSelected = selectedGapId === gap.id;
          const isHighYield = gap.feasibilityScore >= 75 && gap.opportunityScore >= 80;

          return (
            <div
              key={gap.id}
              style={{ left: `${leftPercent}%`, bottom: `${bottomPercent}%` }}
              className="absolute -translate-x-1/2 translate-y-1/2 cursor-pointer z-20 group"
              onClick={() => onSelectGap(gap)}
              onMouseEnter={() => setHoveredGap(gap)}
              onMouseLeave={() => setHoveredGap(null)}
            >
              {/* Pulse Ring for priority items */}
              {isHighYield && (
                <span className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
              )}

              {/* Node Circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shadow-md transition-transform duration-150 group-hover:scale-125 ${
                  isSelected
                    ? 'bg-accent-500 text-white ring-4 ring-accent-500/30'
                    : isHighYield
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60'
                    : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                }`}
              >
                {gap.id.replace('gap-0', 'G')}
              </div>

              {/* Node Title Label Tooltip on hover/active */}
              <div
                className={`absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-900 border border-zinc-700/80 px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none text-xs transition-opacity z-30 ${
                  hoveredGap?.id === gap.id || isSelected
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                  <span>{gap.title}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  Feasibility: {gap.feasibilityScore} • Impact: {gap.opportunityScore}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick guide under map */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Click any numbered node (G1-G4) to view research questions & thesis ideas.</span>
        <span className="font-mono">Nodes in top-right quadrant represent highest dissertation feasibility.</span>
      </div>
    </Card>
  );
};
