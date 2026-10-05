import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { WorkflowSteps } from '../components/dashboard/WorkflowSteps';
import { HeroUploadArea } from '../components/dashboard/HeroUploadArea';
import { CompactPaperList } from '../components/dashboard/CompactPaperList';
import { ContinueReviewCard } from '../components/dashboard/ContinueReviewCard';
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar';
import { PaperDetailsModal } from '../components/papers/PaperDetailsModal';
import { PaperSummaryModal } from '../components/papers/PaperSummaryModal';
import { api } from '../lib/api';
import { Paper, LiteratureReview } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [reviews, setReviews] = useState<LiteratureReview[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [summaryPaper, setSummaryPaper] = useState<Paper | null>(null);

  useEffect(() => {
    async function loadData() {
      const [papersData, reviewsData] = await Promise.all([
        api.getPapers(),
        api.getReviews(),
      ]);
      setPapers(papersData);
      setReviews(reviewsData);
    }
    loadData();
  }, []);

  const latestReview = reviews.length > 0 ? reviews[0] : null;

  return (
    <div className="space-y-7 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 inline-block" />
            <span>PaperPilot · AI Copilot for Scientific Literature Reviews</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Turn research papers into literature reviews.
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
            Upload multiple scientific papers and let PaperPilot extract, compare, synthesize, and organize the research for you.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="md"
            leftIcon={<BookOpen className="w-4 h-4 text-zinc-300" />}
            onClick={() => navigate('/literature-review')}
          >
            Create Literature Review
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/upload')}
          >
            + Upload Research Papers
          </Button>
        </div>
      </div>

      {/* 2. Core Workflow Step Indicator */}
      <WorkflowSteps />

      {/* 3. Hero / Primary Upload Action */}
      <HeroUploadArea />

      {/* 4. Main Two-Column Research Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols wide): Recent Research Papers & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <CompactPaperList
            papers={papers}
            onOpenPaper={(paper) => setSelectedPaper(paper)}
          />

          <QuickActionsBar />
        </div>

        {/* Right Column (1 col wide): Continue Research & Synthesis Guide */}
        <div className="space-y-4">
          <ContinueReviewCard latestReview={latestReview} />

          {/* Academic Synthesis Purpose Callout */}
          <div className="p-4 rounded-xl border border-zinc-850 bg-zinc-950/40 space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-400" />
              Automated Synthesis
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              PaperPilot automates the manual effort of literature reviews:
            </p>
            <ul className="space-y-1.5 text-[11px] text-zinc-300 font-sans">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-400 shrink-0 mt-0.5" />
                <span>Extracts methodologies, datasets & key findings</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-400 shrink-0 mt-0.5" />
                <span>Identifies contradictions & research gaps</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-400 shrink-0 mt-0.5" />
                <span>Generates publication-ready IEEE/APA manuscripts</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PaperDetailsModal
        paper={selectedPaper}
        isOpen={Boolean(selectedPaper)}
        onClose={() => setSelectedPaper(null)}
        onOpenSummary={(paper) => {
          setSelectedPaper(null);
          setSummaryPaper(paper);
        }}
      />

      <PaperSummaryModal
        paper={summaryPaper}
        isOpen={Boolean(summaryPaper)}
        onClose={() => setSummaryPaper(null)}
      />
    </div>
  );
};
