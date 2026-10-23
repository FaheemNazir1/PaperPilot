import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, AlertTriangle, BookOpen, CheckCircle2,
  ChevronRight, Edit2, Loader2, RefreshCw, Sparkles,
} from 'lucide-react';
import { Paper, AnalyzeResult, GenerateReviewResponse } from '../types';
import { api } from '../lib/api';
import { useLibrary } from '../contexts/LibraryContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { ReviewDocumentViewer } from '../components/review/ReviewDocumentViewer';

type Step = 'select' | 'abstracts' | 'result';

interface PaperAbstractState {
  paper: Paper;
  abstract: string;
  analyzed: boolean;
  analyzing: boolean;
  error: string | null;
  editing: boolean;
}

// ─── Step 1 ────────────────────────────────────────────────────────────────

const StepSelectPapers: React.FC<{
  papers: Paper[];
  queryId: string | null;
  refIds: string[];
  onQueryToggle: (id: string) => void;
  onRefToggle: (id: string) => void;
  onNext: () => void;
}> = ({ papers, queryId, refIds, onQueryToggle, onRefToggle, onNext }) => {
  const canProceed = queryId !== null && refIds.length >= 1 && refIds.length <= 10;

  if (papers.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
        <BookOpen className="w-10 h-10 mx-auto text-zinc-600" />
        <h2 className="text-base font-medium text-zinc-100">No papers in your library</h2>
        <p className="text-sm text-zinc-400 max-w-sm mx-auto">
          Upload at least one paper before generating a literature review.
        </p>
        <Button variant="primary" size="md" onClick={() => (window.location.href = '/upload')}>
          Upload Papers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
        Select <span className="text-zinc-200 font-medium">one query paper</span> (the paper you want to write a
        related-work section for) and <span className="text-zinc-200 font-medium">1–10 reference papers</span>.
      </div>

      <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/40">
        {papers.map((paper) => {
          const isQuery = paper.id === queryId;
          const isRef = refIds.includes(paper.id);
          return (
            <li key={paper.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100 truncate" title={paper.title}>
                  {paper.title}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {paper.originalFilename ?? 'PDF'} · {paper.pageCount ? `${paper.pageCount} pages` : 'uploaded'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onQueryToggle(paper.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isQuery
                      ? 'bg-accent-600/20 border-accent-500/40 text-accent-300'
                      : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isQuery ? '✓ Query' : 'Set as Query'}
                </button>
                <button
                  type="button"
                  disabled={isQuery}
                  onClick={() => onRefToggle(paper.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                    isRef
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isRef ? '✓ Reference' : 'Add Reference'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-zinc-500">
          {queryId ? '1 query' : 'No query'} · {refIds.length} reference{refIds.length !== 1 ? 's' : ''} selected
        </span>
        <Button variant="primary" size="md" disabled={!canProceed} onClick={onNext}
          rightIcon={<ChevronRight className="w-4 h-4" />}>
          Next: Review Abstracts
        </Button>
      </div>
    </div>
  );
};

// ─── Step 2 ────────────────────────────────────────────────────────────────

const AbstractCard: React.FC<{
  state: PaperAbstractState;
  label: string;
  onAnalyze: () => void;
  onEditToggle: () => void;
  onAbstractChange: (v: string) => void;
  onSave: () => void;
}> = ({ state, label, onAnalyze, onEditToggle, onAbstractChange, onSave }) => (
  <Card className="p-4 bg-zinc-900/50 border border-zinc-800 space-y-3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <Badge variant={label === 'Query' ? 'accent' : 'neutral'} size="sm">{label}</Badge>
        <p className="text-sm font-medium text-zinc-100 mt-1 truncate" title={state.paper.title}>
          {state.paper.title}
        </p>
      </div>
      {state.analyzed && !state.editing && (
        <button type="button" onClick={onEditToggle}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 shrink-0">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>

    {state.error && (
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{state.error}</span>
      </div>
    )}

    {!state.analyzed && !state.analyzing && (
      <Button variant="outline" size="sm" onClick={onAnalyze} leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
        Extract Abstract
      </Button>
    )}

    {state.analyzing && (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Extracting text…
      </div>
    )}

    {state.analyzed && !state.editing && (
      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/80 line-clamp-4">
        {state.abstract}
      </p>
    )}

    {state.editing && (
      <div className="space-y-2">
        <textarea
          value={state.abstract}
          onChange={(e) => onAbstractChange(e.target.value)}
          rows={6}
          className="w-full bg-zinc-950/80 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent-500/50 resize-y"
          placeholder="Edit the extracted abstract…"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onEditToggle}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onSave}>Save</Button>
        </div>
      </div>
    )}
  </Card>
);

const StepAbstracts: React.FC<{
  states: PaperAbstractState[];
  onAnalyzeOne: (paperId: string) => void;
  onAnalyzeAll: () => void;
  onEditToggle: (paperId: string) => void;
  onAbstractChange: (paperId: string, v: string) => void;
  onSave: (paperId: string) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}> = ({ states, onAnalyzeOne, onAnalyzeAll, onEditToggle, onAbstractChange, onSave, onBack, onGenerate, isGenerating }) => {
  const allReady = states.every((s) => s.analyzed && s.abstract.length >= 30);
  const anyAnalyzing = states.some((s) => s.analyzing);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Each paper must have an abstract before generating.
          Click "Extract Abstract" on each paper, or extract all at once.
        </p>
        <Button variant="outline" size="sm" onClick={onAnalyzeAll} disabled={anyAnalyzing}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Extract All
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {states.map((s, i) => (
          <AbstractCard
            key={s.paper.id}
            state={s}
            label={i === 0 ? 'Query' : `Reference ${i}`}
            onAnalyze={() => onAnalyzeOne(s.paper.id)}
            onEditToggle={() => onEditToggle(s.paper.id)}
            onAbstractChange={(v) => onAbstractChange(s.paper.id, v)}
            onSave={() => onSave(s.paper.id)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <Button variant="primary" size="md" disabled={!allReady || isGenerating} isLoading={isGenerating}
          leftIcon={<Sparkles className="w-4 h-4" />} onClick={onGenerate}>
          {isGenerating ? 'Generating…' : 'Generate Related-Work Section'}
        </Button>
      </div>
    </div>
  );
};

// ─── Step 3 result ─────────────────────────────────────────────────────────

const ReviewResult: React.FC<{
  response: GenerateReviewResponse;
  selectedPapers: PaperAbstractState[];   // all papers (query + refs) in order
  refIds: string[];
  onRestart: () => void;
}> = ({ response, selectedPapers, refIds, onRestart }) => {
  const hasWarnings = response.quality.warnings.length > 0;

  // Build references from citation_map (grounded citations only) + fall back
  // to listing all reference papers if no citations survived grounding.
  const citationMap = response.citation_map ?? {};
  const citationEntries = Object.entries(citationMap).sort(
    ([a], [b]) => Number(a) - Number(b),
  );

  // For each citation entry find the paper title from our local state
  // (title already in citation_map.title from the backend when using paper IDs)
  const references: import('../types').ReviewReference[] = citationEntries.map(([idx, entry]) => ({
    citationId: `[${idx}]`,
    text: entry.title
      ? `${entry.title}.`
      : `Paper ID: ${entry.paper_id}`,
    paperId: entry.paper_id,
    title: entry.title,
  }));

  // If the model produced no grounded citations, list all reference papers
  const fallbackRefs: import('../types').ReviewReference[] =
    references.length === 0
      ? selectedPapers
          .filter((s) => refIds.includes(s.paper.id))
          .map((s, i) => ({
            citationId: `[${i + 1}]`,
            text: s.paper.title,
            paperId: s.paper.id,
            title: s.paper.title,
          }))
      : [];

  const allRefs = references.length > 0 ? references : fallbackRefs;

  const review = {
    id: 'generated',
    title: 'Generated Related-Work Section',
    abstract: '',
    topic: '',
    reviewStyle: 'IEEE' as const,
    length: 'Medium' as const,
    focusAreas: [],
    paperCount: refIds.length,          // real count of reference papers
    paperIds: refIds,
    generatedAt: new Date().toLocaleString(),
    sections: [{ id: 'rw-1', title: 'Related Work', content: response.related_work }],
    references: allRefs,
    researchGapsSummary: [],
  };

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>{response.disclaimer}</p>
      </div>

      {/* Grounding summary */}
      {response.grounding && (
        <div className="flex flex-wrap gap-3 text-xs text-zinc-400 font-mono p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/60">
          <span>{refIds.length} reference{refIds.length !== 1 ? 's' : ''} used</span>
          <span>·</span>
          <span>{allRefs.length} citation{allRefs.length !== 1 ? 's' : ''} grounded</span>
          {response.grounding.removed_sentence_count > 0 && (
            <><span>·</span><span className="text-amber-400">{response.grounding.removed_sentence_count} unverifiable sentence{response.grounding.removed_sentence_count !== 1 ? 's' : ''} removed</span></>
          )}
          {response.grounding.pov_fixes_applied && (
            <><span>·</span><span className="text-emerald-400">POV normalised</span></>
          )}
        </div>
      )}

      {/* Quality warnings */}
      {hasWarnings && (
        <div className="space-y-1.5 p-3 rounded-lg border border-rose-500/30 bg-rose-950/20">
          <p className="text-xs font-medium text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Output quality warnings
          </p>
          <ul className="space-y-1">
            {response.quality.warnings.map((w, i) => (
              <li key={i} className="text-xs text-rose-200/90">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {!hasWarnings && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4" /> No quality issues detected.
        </div>
      )}

      <ReviewDocumentViewer review={review} />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRestart}>
          Start Over
        </Button>
      </div>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────

export const LiteratureReviewPage: React.FC = () => {
  const { papers, status: libStatus } = useLibrary();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('select');
  const [queryId, setQueryId] = useState<string | null>(null);
  const [refIds, setRefIds] = useState<string[]>([]);
  const [abstractStates, setAbstractStates] = useState<PaperAbstractState[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateReviewResponse | null>(null);

  // Sync abstract states when we move to step 2
  const buildAbstractStates = useCallback(
    (qId: string, rIds: string[]) => {
      const ordered = [qId, ...rIds]
        .map((id) => papers.find((p) => p.id === id))
        .filter((p): p is Paper => !!p);
      return ordered.map((p) => ({
        paper: p,
        abstract: p.abstract ?? '',
        analyzed: !!(p.abstract && p.abstract.length >= 30),
        analyzing: false,
        error: null,
        editing: false,
      }));
    },
    [papers],
  );

  const handleNext = () => {
    if (!queryId) return;
    setAbstractStates(buildAbstractStates(queryId, refIds));
    setStep('abstracts');
  };

  const updateState = (paperId: string, patch: Partial<PaperAbstractState>) =>
    setAbstractStates((prev) => prev.map((s) => (s.paper.id === paperId ? { ...s, ...patch } : s)));

  const analyzeOne = useCallback(async (paperId: string) => {
    updateState(paperId, { analyzing: true, error: null });
    try {
      const res: AnalyzeResult = await api.analyzePaper(paperId);
      updateState(paperId, { abstract: res.abstract, analyzed: true, analyzing: false });
    } catch (err) {
      updateState(paperId, {
        analyzing: false,
        error: err instanceof Error ? err.message : 'Extraction failed.',
      });
    }
  }, []);

  const analyzeAll = useCallback(async () => {
    const needed = abstractStates.filter((s) => !s.analyzed);
    await Promise.all(needed.map((s) => analyzeOne(s.paper.id)));
  }, [abstractStates, analyzeOne]);

  const saveAbstract = useCallback(async (paperId: string) => {
    const s = abstractStates.find((x) => x.paper.id === paperId);
    if (!s) return;
    try {
      await api.updateAbstract(paperId, s.abstract);
      updateState(paperId, { editing: false, analyzed: true });
      showToast('Abstract saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save abstract.', 'error');
    }
  }, [abstractStates, showToast]);

  const handleGenerate = useCallback(async () => {
    if (!queryId) return;
    setIsGenerating(true);
    try {
      const res = await api.generateReview(queryId, refIds);
      setResult(res);
      setStep('result');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Generation failed.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [queryId, refIds, showToast]);

  const restart = () => {
    setStep('select');
    setQueryId(null);
    setRefIds([]);
    setAbstractStates([]);
    setResult(null);
  };

  const toggleQuery = (id: string) => {
    setQueryId((prev) => (prev === id ? null : id));
    setRefIds((prev) => prev.filter((r) => r !== id));
  };

  const toggleRef = (id: string) => {
    setRefIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const steps = ['Select Papers', 'Review Abstracts', 'Generated Review'];
  const stepIndex = step === 'select' ? 0 : step === 'abstracts' ? 1 : 2;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Literature Review</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Generate a related-work section from papers in your library using a fine-tuned language model.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs font-mono">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            <span className={i === stepIndex ? 'text-accent-400 font-semibold' : 'text-zinc-500'}>
              {i + 1}. {label}
            </span>
            {i < steps.length - 1 && <span className="text-zinc-700 mx-1">›</span>}
          </React.Fragment>
        ))}
      </div>

      {libStatus === 'loading' ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your library…
        </div>
      ) : step === 'select' ? (
        <StepSelectPapers
          papers={papers}
          queryId={queryId}
          refIds={refIds}
          onQueryToggle={toggleQuery}
          onRefToggle={toggleRef}
          onNext={handleNext}
        />
      ) : step === 'abstracts' ? (
        <StepAbstracts
          states={abstractStates}
          onAnalyzeOne={analyzeOne}
          onAnalyzeAll={analyzeAll}
          onEditToggle={(id) => updateState(id, { editing: !abstractStates.find((s) => s.paper.id === id)?.editing })}
          onAbstractChange={(id, v) => updateState(id, { abstract: v })}
          onSave={saveAbstract}
          onBack={() => setStep('select')}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      ) : result ? (
        <ReviewResult response={result} selectedPapers={abstractStates} refIds={refIds} onRestart={restart} />
      ) : null}
    </div>
  );
};
