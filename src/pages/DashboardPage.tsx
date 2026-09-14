import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  Lightbulb,
  Sparkles,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatCard } from '../components/dashboard/StatCard';
import { RecentPaperCard } from '../components/dashboard/RecentPaperCard';
import { RecentReviewsSection } from '../components/dashboard/RecentReviewsSection';
import { AIInsightsPanel } from '../components/dashboard/AIInsightsPanel';
import { WorkflowBanner } from '../components/common/WorkflowBanner';
import { PaperSummaryModal } from '../components/papers/PaperSummaryModal';
import { PaperDetailsModal } from '../components/papers/PaperDetailsModal';
import { api } from '../lib/api';
import { Paper, LiteratureReview } from '../types';
import { AIInsightItem, DashboardStats } from '../data/mockStats';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [reviews, setReviews] = useState<LiteratureReview[]>([]);
  const [insights, setInsights] = useState<AIInsightItem[]>([]);
  const [summaryPaper, setSummaryPaper] = useState<Paper | null>(null);
  const [detailsPaper, setDetailsPaper] = useState<Paper | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      const [statsData, papersData, reviewsData, insightsData] = await Promise.all([
        api.getDashboardStats(),
        api.getPapers(),
        api.getReviews(),
        api.getAIInsights()
      ]);
      setStats(statsData);
      setPapers(papersData);
      setReviews(reviewsData);
      setInsights(insightsData);
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Dashboard Welcome Header & Hero CTAs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 inline-block" />
            <span>AI-Powered Scientific Literature Review Assistant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Good morning, Researcher.
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl font-sans">
            Turn research papers into insights, comparisons and literature reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            + Upload Papers
          </Button>
        </div>
      </div>

      {/* Workflow Journey Pipeline */}
      <WorkflowBanner />

      {/* Statistics Section with Exact Mock Values */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Papers Analyzed"
          value={stats?.papersAnalyzed || 12}
          sublabel="Across 4 scientific disciplines"
          icon={FileText}
          trend="+3 this week"
        />
        <StatCard
          label="Literature Reviews"
          value={stats?.literatureReviews || 8}
          sublabel="IEEE, Nature & ACM styles"
          icon={BookOpen}
          trend="2 completed"
        />
        <StatCard
          label="Key Insights"
          value={stats?.keyInsights || 47}
          sublabel="Synthesized cross-paper claims"
          icon={Sparkles}
          trend="High confidence"
        />
        <StatCard
          label="Research Gaps"
          value={stats?.researchGaps || 23}
          sublabel="Identified methodology bottlenecks"
          icon={Lightbulb}
          trend="4 high priority"
        />
      </div>

      {/* Main Grid: Recent Papers & Literature Reviews + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2-column wide section for Recent Papers & Reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Papers Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-400" />
                  <span>Recent Research Papers</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Extracted, indexed and ready for semantic comparison
                </p>
              </div>

              <button
                onClick={() => navigate('/papers')}
                className="text-xs text-accent-400 hover:text-accent-300 font-medium flex items-center gap-1 group"
              >
                <span>View All Papers ({papers.length})</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {papers.slice(0, 4).map((paper) => (
                <RecentPaperCard
                  key={paper.id}
                  paper={paper}
                  onOpenDetails={(p) => setDetailsPaper(p)}
                  onOpenSummary={(p) => setSummaryPaper(p)}
                />
              ))}
            </div>
          </div>

          {/* Recent Literature Reviews Section */}
          <RecentReviewsSection reviews={reviews} />
        </div>

        {/* 1-column wide sidebar: AI Insights Panel */}
        <div className="space-y-6">
          <AIInsightsPanel insights={insights} />
        </div>
      </div>

      {/* Modals for Quick Summary & Details */}
      <PaperSummaryModal
        paper={summaryPaper}
        isOpen={!!summaryPaper}
        onClose={() => setSummaryPaper(null)}
      />

      <PaperDetailsModal
        paper={detailsPaper}
        isOpen={!!detailsPaper}
        onClose={() => setDetailsPaper(null)}
        onOpenSummary={(p) => setSummaryPaper(p)}
      />
    </div>
  );
};
