import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { Paper } from '../types';
import { api } from '../lib/api';
import { useLibrary } from '../contexts/LibraryContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PaperCardSkeleton } from '../components/common/Skeleton';
import { PaperDetailsModal } from '../components/papers/PaperDetailsModal';
import { formatBytes, formatDate } from '../lib/utils';

type Tab = 'mine' | 'demo';

const ErrorNotice: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
    <div className="flex items-start gap-2.5 text-sm text-rose-200">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <div className="font-medium">Couldn’t load papers</div>
        <div className="text-xs text-rose-200/90 mt-0.5">{message}</div>
      </div>
    </div>
    <Button variant="outline" size="sm" onClick={onRetry}>
      Retry
    </Button>
  </div>
);

export const PapersPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const library = useLibrary();

  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'demo' ? 'demo' : 'mine');
  const [query, setQuery] = useState('');

  const [demoPapers, setDemoPapers] = useState<Paper[] | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const [activePaper, setActivePaper] = useState<Paper | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Paper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDemo = useCallback(async () => {
    setDemoLoading(true);
    setDemoError(null);
    try {
      setDemoPapers(await api.getDemoPapers());
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : 'Could not load the Demo Library.');
    } finally {
      setDemoLoading(false);
    }
  }, []);

  // The Demo Library is only fetched when someone looks at it.
  useEffect(() => {
    if (tab === 'demo' && demoPapers === null && !demoLoading && !demoError) void loadDemo();
  }, [tab, demoPapers, demoLoading, demoError, loadDemo]);

  // Deep link from the upload page: /papers?paper=<id>
  const paperParam = searchParams.get('paper');
  useEffect(() => {
    if (!paperParam) return;
    const fromLibrary = library.papers.find((p) => p.id === paperParam);
    if (fromLibrary) {
      setActivePaper(fromLibrary);
      return;
    }
    if (library.status === 'loading') return;
    let cancelled = false;
    api
      .getPaperById(paperParam)
      .then((p) => {
        if (cancelled) return;
        if (p) setActivePaper(p);
        else showToast('That paper could not be found in your library.', 'error');
      })
      .catch((err) => !cancelled && showToast(err instanceof Error ? err.message : 'Could not open the paper.', 'error'));
    return () => {
      cancelled = true;
    };
  }, [paperParam, library.papers, library.status, showToast]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setQuery('');
    setSearchParams(next === 'demo' ? { tab: 'demo' } : {});
  };

  const closeDetails = () => {
    setActivePaper(null);
    if (paperParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('paper');
      setSearchParams(next, { replace: true });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await api.deletePaper(pendingDelete.id);
      showToast('Paper deleted', 'success');
      setPendingDelete(null);
      await library.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete the paper.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const matches = (p: Paper) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      (p.originalFilename ?? '').toLowerCase().includes(q) ||
      p.authors.some((a) => a.toLowerCase().includes(q))
    );
  };

  const myPapers = useMemo(
    () => [...library.papers].sort((a, b) => (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? '')).filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [library.papers, query]
  );
  const demoList = useMemo(
    () => (demoPapers ?? []).filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demoPapers, query]
  );

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
      active ? 'border-accent-500 text-zinc-100 font-medium' : 'border-transparent text-zinc-400 hover:text-zinc-200'
    }`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">My Papers</h1>
          <p className="text-sm text-zinc-400 mt-1">Research papers you have uploaded.</p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/upload')}>
          Upload Research Papers
        </Button>
      </div>

      <div role="tablist" aria-label="Library" className="flex items-center border-b border-zinc-800">
        <button role="tab" aria-selected={tab === 'mine'} className={tabClass(tab === 'mine')} onClick={() => switchTab('mine')}>
          My Papers
          {library.count !== null && <span className="text-xs text-zinc-500 tabular-nums">{library.count}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'demo'} className={tabClass(tab === 'demo')} onClick={() => switchTab('demo')}>
          Demo Library
          {demoPapers && <span className="text-xs text-zinc-500 tabular-nums">{demoPapers.length}</span>}
        </button>
      </div>

      {tab === 'demo' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Example papers for exploring PaperPilot. They are not your uploads and are never counted in My Papers.
        </div>
      )}

      {(tab === 'mine' ? library.count !== 0 : demoPapers !== null && demoPapers.length > 0) && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'mine' ? 'Search by title or filename' : 'Search by title or author'}
            aria-label="Search papers"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
        </div>
      )}

      {tab === 'mine' ? (
        library.status === 'loading' ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <PaperCardSkeleton key={i} />
            ))}
          </div>
        ) : library.status === 'error' ? (
          <ErrorNotice message={library.error ?? 'Unknown error.'} onRetry={() => void library.refresh()} />
        ) : library.papers.length === 0 ? (
          <div className="text-center py-14 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center">
              <FileText className="w-6 h-6 text-zinc-400" aria-hidden="true" />
            </div>
            <h2 className="text-base font-medium text-zinc-100">No papers yet</h2>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Upload your first scientific paper to start building your research library.
            </p>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/upload')}>
              Upload Research Papers
            </Button>
          </div>
        ) : myPapers.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">No papers match “{query}”.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/40">
            {myPapers.map((paper) => (
              <li key={paper.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setActivePaper(paper)}
                    className="text-sm font-medium text-zinc-100 hover:text-accent-300 text-left truncate max-w-full block"
                    title={paper.title}
                  >
                    {paper.title}
                  </button>
                  <div className="mt-0.5 text-xs text-zinc-500 flex flex-wrap items-center gap-x-2">
                    <span className="truncate max-w-[16rem]" title={paper.originalFilename ?? undefined}>
                      {paper.originalFilename ?? 'PDF'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{paper.uploadedAt ? formatDate(paper.uploadedAt) : '—'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(paper.sizeBytes)}</span>
                    {paper.pageCount ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{paper.pageCount} pages</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="neutral">Uploaded</Badge>
                  <Button variant="outline" size="sm" onClick={() => setActivePaper(paper)}>
                    View
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(paper)}
                    aria-label={`Delete ${paper.title}`}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : demoLoading || (demoPapers === null && !demoError) ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PaperCardSkeleton key={i} />
          ))}
        </div>
      ) : demoError ? (
        <ErrorNotice message={demoError} onRetry={() => void loadDemo()} />
      ) : demoList.length === 0 ? (
        <p className="text-sm text-zinc-400 py-8 text-center">
          {query ? `No demo papers match “${query}”.` : 'The Demo Library is empty.'}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/40">
          {demoList.map((paper) => (
            <li key={paper.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setActivePaper(paper)}
                  className="text-sm font-medium text-zinc-100 hover:text-accent-300 text-left block max-w-full"
                >
                  {paper.title}
                </button>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {paper.authors.length > 2 ? `${paper.authors[0]} et al.` : paper.authors.join(', ')} · {paper.year} · {paper.venue}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="warning">Demo</Badge>
                <Button variant="outline" size="sm" onClick={() => setActivePaper(paper)}>
                  View
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PaperDetailsModal paper={activePaper} isOpen={!!activePaper} onClose={closeDetails} />

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => !isDeleting && setPendingDelete(null)}
        title="Delete this paper?"
        subtitle={pendingDelete?.originalFilename ?? pendingDelete?.title}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            This removes the paper and its stored PDF from your library. This can’t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={isDeleting} onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" isLoading={isDeleting} onClick={confirmDelete}>
              Delete paper
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
