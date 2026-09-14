import React, { useState, useEffect } from 'react';
import { Lightbulb, Sparkles, Compass, ArrowRight, FileText, CheckCircle2, BookOpen, Quote, HelpCircle } from 'lucide-react';
import { GapCard } from '../components/gaps/GapCard';
import { GapMapVisualizer } from '../components/gaps/GapMapVisualizer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ResearchGap } from '../types';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

export const ResearchGapsPage: React.FC = () => {
  const { showToast } = useToast();
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [selectedGap, setSelectedGap] = useState<ResearchGap | null>(null);

  useEffect(() => {
    async function loadGaps() {
      const data = await api.getResearchGaps();
      setGaps(data);
      if (data.length > 0) {
        setSelectedGap(data[0]);
      }
    }
    loadGaps();
  }, []);

  const handleExportBrief = () => {
    if (!selectedGap) return;
    const briefText = `RESEARCH GAP BRIEF: ${selectedGap.title}\nCategory: ${selectedGap.category} | Frequency: ${selectedGap.frequency}\nImpact: ${selectedGap.potentialImpact} | Feasibility: ${selectedGap.feasibilityScore}/100\n\nWHY THIS IS A GAP:\n${selectedGap.whyThisIsAGap}\n\nEVIDENCE:\n${selectedGap.evidence}\n\nPOTENTIAL RESEARCH DIRECTION:\n${selectedGap.potentialDirection}\n\nPOSSIBLE THESIS QUESTION:\n${selectedGap.possibleThesisQuestion}\n\nSUPPORTING PAPERS:\n${selectedGap.affectedPapers.join('\n')}`;
    navigator.clipboard.writeText(briefText);
    showToast(`Research gap brief copied for "${selectedGap.title}"`, 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Lightbulb className="w-5 h-5 text-accent-400" />
          <span>Research Gaps</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Discover limitations, unexplored directions and opportunities across your papers.
        </p>
      </div>

      {/* 2D Opportunity Visualizer Map */}
      <GapMapVisualizer
        gaps={gaps}
        selectedGapId={selectedGap?.id || null}
        onSelectGap={(gap) => setSelectedGap(gap)}
      />

      {/* Categorized Gap Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent-400" />
            <span>Identified Research Gap Taxonomy ({gaps.length})</span>
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            Synthesized across 12 indexed scientific papers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gaps.map((gap) => (
            <GapCard
              key={gap.id}
              gap={gap}
              isSelected={selectedGap?.id === gap.id}
              onSelect={(g) => setSelectedGap(g)}
            />
          ))}
        </div>
      </div>

      {/* Detailed Inspection Panel for Selected Research Gap */}
      {selectedGap && (
        <Card className="p-6 bg-zinc-900/70 border border-accent-500/30 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-5">
            <div className="flex items-center gap-2.5">
              <Badge variant="accent" size="sm" className="font-mono">
                {selectedGap.id.toUpperCase()}
              </Badge>
              <h3 className="text-base font-semibold text-zinc-100">
                {selectedGap.title}
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <Badge variant="outline">Area: {selectedGap.category}</Badge>
              <Badge variant="warning">{selectedGap.frequency}</Badge>
              <Badge variant="success">Impact: {selectedGap.potentialImpact}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-zinc-300">
            {/* Left Column: Why this is a gap & Empirical Evidence */}
            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-zinc-200 uppercase font-mono tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-accent-400" />
                  Why This Is A Critical Gap
                </h5>
                <p className="leading-relaxed bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800 text-zinc-300 font-sans">
                  {selectedGap.whyThisIsAGap || selectedGap.description}
                </p>
              </div>

              <div>
                <h5 className="font-semibold text-zinc-200 uppercase font-mono tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-accent-400" />
                  Empirical Literature Evidence
                </h5>
                <p className="leading-relaxed bg-zinc-950/40 p-3.5 rounded-lg border border-zinc-800 text-zinc-300 italic font-sans">
                  "{selectedGap.evidence || selectedGap.description}"
                </p>
              </div>

              <div>
                <h5 className="font-semibold text-zinc-200 uppercase font-mono tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Supporting Papers in Library ({selectedGap.affectedPapers.length})
                </h5>
                <ul className="space-y-1.5">
                  {selectedGap.affectedPapers.map((paperTitle, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-zinc-950/30 rounded border border-zinc-850 text-zinc-200 text-xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                      <span className="truncate font-medium">{paperTitle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Potential Research Direction & Thesis Question */}
            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-zinc-200 uppercase font-mono tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Potential Research Direction
                </h5>
                <p className="leading-relaxed bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800 text-zinc-300 font-sans">
                  {selectedGap.potentialDirection}
                </p>
              </div>

              <div>
                <h5 className="font-semibold text-zinc-200 uppercase font-mono tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-accent-400" />
                  Possible Dissertation / Thesis Question
                </h5>
                <div className="p-3.5 bg-zinc-950/80 rounded-lg border border-accent-500/30 leading-relaxed text-zinc-100 font-medium">
                  "{selectedGap.possibleThesisQuestion}"
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-zinc-200 uppercase font-mono tracking-wider text-[10px] mb-1.5">
                  Alternative Research Prompts
                </h5>
                <div className="space-y-2">
                  {selectedGap.recommendedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-zinc-950/40 rounded border border-zinc-850 text-zinc-300 text-xs"
                    >
                      • "{q}"
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-mono">
                  Opportunity Score: {selectedGap.opportunityScore}/100
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={handleExportBrief}
                >
                  Export Thesis Brief
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
