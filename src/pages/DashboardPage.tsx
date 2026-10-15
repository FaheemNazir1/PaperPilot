import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, FileText, Plus } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PaperCardSkeleton } from '../components/common/Skeleton';
import { useLibrary } from '../contexts/LibraryContext';
import { formatBytes, formatDate } from '../lib/utils';

const RECENT_LIMIT = 5;

const PLANNED = ['Compare papers', 'Find research gaps', 'Generate a literature review'];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { papers, count, status, error, refresh } = useLibrary();

  const recent = [...papers]
    .sort((a, b) => (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? ''))
    .slice(0, RECENT_LIMIT);
  const isEmpty = status === 'ready' && papers.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">Your Research Workspace</h1>
          <p className="text-sm text-zinc-400 mt-1.5">Upload and organize scientific papers for your literature review.</p>
        </div>
        {!isEmpty && (
          <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/upload')}>
            Upload Research Papers
          </Button>
        )}
      </div>

      <section aria-labelledby="my-papers-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="my-papers-heading" className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            My Papers
            {count !== null && <span className="text-xs text-zinc-500 tabular-nums">{count}</span>}
          </h2>
          {(count ?? 0) > 0 && (
            <Link to="/papers" className="text-xs text-accent-400 hover:text-accent-300 inline-flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          )}
        </div>

        {status === 'loading' && (
          <div className="space-y-3">
            <PaperCardSkeleton />
            <PaperCardSkeleton />
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
            <div className="flex items-start gap-2.5 text-sm text-rose-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium">Couldn’t load your papers</div>
                <div className="text-xs text-rose-200/90 mt-0.5">{error}</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        )}

        {isEmpty && (
          <div className="text-center py-14 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center">
              <FileText className="w-6 h-6 text-zinc-400" aria-hidden="true" />
            </div>
            <h3 className="text-base font-medium text-zinc-100">No papers yet</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Upload your first scientific paper to start building your research library.
            </p>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/upload')}>
              Upload Research Papers
            </Button>
          </div>
        )}

        {status === 'ready' && recent.length > 0 && (
          <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/40">
            {recent.map((paper) => (
              <li key={paper.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-100 truncate" title={paper.title}>
                    {paper.title}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 flex flex-wrap items-center gap-x-2">
                    <span>{paper.uploadedAt ? formatDate(paper.uploadedAt) : '—'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(paper.sizeBytes)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="neutral">Uploaded</Badge>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/papers?paper=${encodeURIComponent(paper.id)}`)}>
                    View
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="planned-heading" className="border-t border-zinc-800/80 pt-5">
        <h2 id="planned-heading" className="text-xs font-medium text-zinc-500">
          Planned workflow
        </h2>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-zinc-500">
          {PLANNED.map((item) => (
            <li key={item} className="flex items-center gap-2">
              {item}
              <Badge variant="outline">Coming soon</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
