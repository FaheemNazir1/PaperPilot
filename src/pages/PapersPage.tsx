import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  FileText,
  Sparkles,
  GitCompare,
  Eye,
  Tag,
  Plus
} from 'lucide-react';
import { Paper } from '../types';
import { api } from '../lib/api';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { PaperCardSkeleton } from '../components/common/Skeleton';
import { PaperDetailsModal } from '../components/papers/PaperDetailsModal';
import { PaperSummaryModal } from '../components/papers/PaperSummaryModal';
import { useNavigate } from 'react-router-dom';

export const PapersPage: React.FC = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'year' | 'citations' | 'title'>('year');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [activeDetailsPaper, setActiveDetailsPaper] = useState<Paper | null>(null);
  const [activeSummaryPaper, setActiveSummaryPaper] = useState<Paper | null>(null);

  useEffect(() => {
    async function loadPapers() {
      setIsLoading(true);
      try {
        const data = await api.getPapers();
        setPapers(data);
      } finally {
        setIsLoading(false);
      }
    }
    loadPapers();
  }, []);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(papers.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [papers]);

  // Filter & Sort
  const filteredPapers = useMemo(() => {
    return papers
      .filter((paper) => {
        const matchesQuery =
          paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          paper.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (paper.researchArea && paper.researchArea.toLowerCase().includes(searchQuery.toLowerCase())) ||
          paper.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          selectedCategory === 'All' || paper.category === selectedCategory;

        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'year') return b.year - a.year;
        if (sortBy === 'citations') return b.citationsCount - a.citationsCount;
        return a.title.localeCompare(b.title);
      });
  }, [papers, searchQuery, selectedCategory, sortBy]);

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

  const handleComparePaper = (paperId: string) => {
    navigate('/compare', { state: { initialPaperId: paperId } });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-accent-400" />
            <span>My Research Papers</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Indexed scientific literature repository ({filteredPapers.length} of {papers.length} papers displayed)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<GitCompare className="w-3.5 h-3.5 text-zinc-300" />}
            onClick={() => navigate('/compare')}
          >
            Compare Papers
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/upload')}
          >
            Upload Papers
          </Button>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar with explicit placeholder */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search papers, authors, topics..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent-500/50 transition-all font-sans"
            />
          </div>

          {/* Controls: Sort and View Mode */}
          <div className="flex items-center gap-2.5 justify-end">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500 text-[11px]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="year" className="bg-zinc-900 text-zinc-100">Year (Newest)</option>
                <option value="citations" className="bg-zinc-900 text-zinc-100">Citations</option>
                <option value="title" className="bg-zinc-900 text-zinc-100">Title</option>
              </select>
            </div>

            {/* Grid/List Toggle */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'list'
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="List View"
                aria-label="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-zinc-500 mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Filter:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                selectedCategory === cat
                  ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-xs'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Papers Grid or List View */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PaperCardSkeleton />
          <PaperCardSkeleton />
          <PaperCardSkeleton />
          <PaperCardSkeleton />
          <PaperCardSkeleton />
          <PaperCardSkeleton />
        </div>
      ) : filteredPapers.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No research papers matched your search"
          description="Try clearing your search query or selecting a different research category filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('All');
          }}
          secondaryActionLabel="Upload New Paper"
          onSecondaryAction={() => navigate('/upload')}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPapers.map((paper) => (
            <Card
              key={paper.id}
              className="p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/80 transition-all flex flex-col justify-between group hover:bg-zinc-900/70"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant={getStatusVariant(paper.status)} size="sm">
                    {paper.status}
                  </Badge>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {paper.year}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-accent-300 transition-colors line-clamp-2 leading-snug">
                  {paper.title}
                </h3>

                <p className="text-xs text-zinc-400 mt-1 truncate">
                  {paper.authors.join(', ')}
                </p>

                {/* Research Area & Citation pill */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="accent" size="sm" className="text-[10px] font-mono">
                    {paper.researchArea || paper.category}
                  </Badge>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {paper.citationsCount} citations
                  </span>
                </div>

                {/* Tags */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {paper.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="neutral" size="sm" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850 mt-3 font-sans">
                  {paper.summary}
                </p>
              </div>

              {/* Actions: Open (View Paper), Summarize, Compare */}
              <div className="mt-4 pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent-400" />}
                  onClick={() => setActiveSummaryPaper(paper)}
                >
                  Summarize
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleComparePaper(paper.id)}
                    title="Compare this paper with others"
                  >
                    Compare
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setActiveDetailsPaper(paper)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List Mode / Table View */
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/70">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[11px]">
                <th className="p-3.5 font-semibold">Title & Authors</th>
                <th className="p-3.5 font-semibold">Research Area</th>
                <th className="p-3.5 font-semibold">Year</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold">Citations</th>
                <th className="p-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
              {filteredPapers.map((paper) => (
                <tr key={paper.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="p-3.5 max-w-sm">
                    <div className="font-semibold text-zinc-100 line-clamp-1">{paper.title}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 truncate">{paper.authors.join(', ')}</div>
                  </td>
                  <td className="p-3.5">
                    <Badge variant="accent" size="sm" className="text-[10px]">{paper.researchArea}</Badge>
                  </td>
                  <td className="p-3.5 font-mono text-zinc-400">{paper.year}</td>
                  <td className="p-3.5">
                    <Badge variant={getStatusVariant(paper.status)} size="sm">{paper.status}</Badge>
                  </td>
                  <td className="p-3.5 font-mono text-zinc-400">{paper.citationsCount}</td>
                  <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setActiveSummaryPaper(paper)}
                      className="text-accent-400 hover:text-accent-300 font-medium text-xs px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                    >
                      Summarize
                    </button>
                    <button
                      onClick={() => handleComparePaper(paper.id)}
                      className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 hover:bg-zinc-800 rounded transition-colors"
                    >
                      Compare
                    </button>
                    <button
                      onClick={() => setActiveDetailsPaper(paper)}
                      className="text-zinc-300 hover:text-white text-xs px-2.5 py-1 bg-zinc-800 rounded border border-zinc-700 hover:bg-zinc-750 transition-colors"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals for Details and Summary */}
      <PaperDetailsModal
        paper={activeDetailsPaper}
        isOpen={!!activeDetailsPaper}
        onClose={() => setActiveDetailsPaper(null)}
        onOpenSummary={(p) => setActiveSummaryPaper(p)}
      />

      <PaperSummaryModal
        paper={activeSummaryPaper}
        isOpen={!!activeSummaryPaper}
        onClose={() => setActiveSummaryPaper(null)}
      />
    </div>
  );
};
