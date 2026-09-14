import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { ReviewSetupPanel } from '../components/review/ReviewSetupPanel';
import { ReviewDocumentViewer } from '../components/review/ReviewDocumentViewer';
import { LiteratureReview } from '../types';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

export const LiteratureReviewPage: React.FC = () => {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<LiteratureReview[]>([]);
  const [activeReview, setActiveReview] = useState<LiteratureReview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<string | null>(null);

  useEffect(() => {
    async function loadReviews() {
      const data = await api.getReviews();
      setReviews(data);
      if (data.length > 0) {
        setActiveReview(data[0]);
      }
    }
    loadReviews();
  }, []);

  // Multi-step simulated AI synthesis
  const handleGenerate = async (config: {
    topic: string;
    style: string;
    length: string;
    focusAreas: string[];
  }) => {
    setIsGenerating(true);

    // Stage 1
    setGenerationStage('Analyzing 12 papers in workspace...');
    setTimeout(() => {
      // Stage 2
      setGenerationStage('Retrieving relevant passages & methodology sections...');
      setTimeout(() => {
        // Stage 3
        setGenerationStage('Synthesizing cross-paper findings & identifying research gaps...');
        setTimeout(() => {
          // Stage 4
          setGenerationStage(`Formatting publication-grade manuscript (${config.style} style)...`);
          setTimeout(async () => {
            const generated = await api.generateReview({
              topic: config.topic,
              paperIds: ['paper-01', 'paper-02', 'paper-03', 'paper-04'],
              style: config.style,
              length: config.length,
              focusAreas: config.focusAreas
            });
            setActiveReview(generated);
            setIsGenerating(false);
            setGenerationStage(null);
            showToast('Literature review generated successfully', 'success', 3500);
          }, 800);
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-accent-400" />
            <span>Literature Review Generator</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Automated multi-paper scientific synthesis, structured thematic breakdown & IEEE references
          </p>
        </div>
      </div>

      {/* Setup Panel */}
      <ReviewSetupPanel
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />

      {/* Synthesis Progress Bar */}
      {isGenerating && (
        <div className="p-5 rounded-xl bg-accent-950/20 border border-accent-500/30 flex items-center gap-3.5 animate-in fade-in duration-150">
          <Loader2 className="w-5 h-5 animate-spin text-accent-400 shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-accent-300">
              {generationStage}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
              Extracting claims, cross-modal attention findings, and compiling bibliography
            </div>
          </div>
        </div>
      )}

      {/* Review Document Preview */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-400" />
            <span>Generated Literature Review Document Preview</span>
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            Live Publication Preview
          </span>
        </div>

        {activeReview && !isGenerating ? (
          <ReviewDocumentViewer review={activeReview} />
        ) : null}
      </div>
    </div>
  );
};
