import React, { useEffect, useState } from 'react';
import { Paper, PaperSummary } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FileText, Database, Cpu, CheckCircle, AlertTriangle, Info, Sparkles, Copy, Check, ArrowLeft, Eye } from 'lucide-react';
import { formatBytes, formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { PdfViewer } from './PdfViewer';

interface PaperDetailsModalProps {
  paper: Paper | null;
  isOpen: boolean;
  onClose: () => void;
}

const MetaRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs text-zinc-500">{label}</dt>
    <dd className="text-sm text-zinc-200 break-words">{children}</dd>
  </div>
);

/** On-demand summary from the fine-tuned T5-small model; the result is not stored. */
const SummarySection: React.FC<{ paperId: string }> = ({ paperId }) => {
  const [result, setResult] = useState<PaperSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await api.summarizePaper(paperId));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Could not generate a summary.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent-400" aria-hidden="true" />
          Summary · Experimental
        </h4>
        <Button
          size="sm"
          variant="primary"
          onClick={generate}
          isLoading={loading}
          disabled={loading}
          leftIcon={!loading ? <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> : undefined}
        >
          {loading ? 'Generating…' : result ? 'Regenerate' : 'Generate summary'}
        </Button>
      </div>

      {!result && !loading && !error && (
        <p className="text-xs text-zinc-500">
          Uses a small experimental model that reads only the first 512 tokens of the paper (roughly its first page or two), not the whole document.
        </p>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 text-sm leading-relaxed text-zinc-200">
            {result.summary}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
            <span>
              {result.model}
              {result.truncated
                ? ` · based on the first ${result.inputTokens} of ${result.totalTokens} tokens (the start of the paper only)`
                : ` · based on the full extracted text (${result.inputTokens} tokens)`}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-100"
            >
              {copied ? <Check className="w-3 h-3" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Details for a paper the user uploaded: only facts we actually have. */
const UploadedPaperDetails: React.FC<{ paper: Paper; onViewPdf: () => void }> = ({ paper, onViewPdf }) => (
  <div className="space-y-5">
    <Button size="sm" variant="outline" onClick={onViewPdf} leftIcon={<Eye className="w-3.5 h-3.5" aria-hidden="true" />}>
      View PDF
    </Button>

    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      <div className="sm:col-span-2">
        <MetaRow label="Filename">{paper.originalFilename || paper.title}</MetaRow>
      </div>
      <MetaRow label="File size">{formatBytes(paper.sizeBytes)}</MetaRow>
      <MetaRow label="Pages">{paper.pageCount ?? '—'}</MetaRow>
      <MetaRow label="Uploaded">{paper.uploadedAt ? formatDate(paper.uploadedAt) : '—'}</MetaRow>
      <MetaRow label="Status">
        <Badge variant="neutral">Uploaded</Badge>
      </MetaRow>
      {paper.authors.length > 0 && (
        <div className="sm:col-span-2">
          <MetaRow label="Authors (from PDF metadata)">{paper.authors.join(', ')}</MetaRow>
        </div>
      )}
    </dl>

    <SummarySection paperId={paper.id} />

    <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" aria-hidden="true" />
      <p>
        This PDF is stored in your library. Summaries are generated on request by a small experimental model
        and are not saved. PaperPilot has not extracted findings or comparisons from it.
      </p>
    </div>
  </div>
);

/** Details for a curated demo paper. */
const DemoPaperDetails: React.FC<{ paper: Paper }> = ({ paper }) => (
  <div className="space-y-5 text-xs text-zinc-300">
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
      <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <p>Demo Library paper. This is example data for exploring PaperPilot and is not one of your uploads.</p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{paper.category}</Badge>
      {paper.pdfSize && <Badge variant="neutral">{paper.pdfSize}</Badge>}
      {paper.doi && <span className="text-[11px] font-mono text-zinc-500 ml-auto">DOI: {paper.doi}</span>}
    </div>

    {paper.abstract && (
      <div>
        <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-accent-400" />
          Abstract
        </h4>
        <p className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 leading-relaxed text-zinc-300">
          {paper.abstract}
        </p>
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/60">
        <span className="text-[11px] text-zinc-500 uppercase font-semibold flex items-center gap-1 mb-1">
          <Database className="w-3 h-3 text-zinc-400" />
          Dataset
        </span>
        <span className="text-xs text-zinc-200">{paper.dataset}</span>
      </div>
      <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/60">
        <span className="text-[11px] text-zinc-500 uppercase font-semibold flex items-center gap-1 mb-1">
          <Cpu className="w-3 h-3 text-zinc-400" />
          Model
        </span>
        <span className="text-xs text-zinc-200">{paper.model}</span>
      </div>
    </div>

    {paper.methodology && (
      <div>
        <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-1">Methodology</h4>
        <p className="leading-relaxed text-zinc-300">{paper.methodology}</p>
      </div>
    )}

    {paper.keyFindings.length > 0 && (
      <div>
        <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          Key findings
        </h4>
        <ul className="space-y-1.5">
          {paper.keyFindings.map((finding, idx) => (
            <li key={idx} className="bg-zinc-950/30 p-2 rounded border border-zinc-850">
              {finding}
            </li>
          ))}
        </ul>
      </div>
    )}

    {paper.limitations.length > 0 && (
      <div>
        <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Limitations
        </h4>
        <ul className="space-y-1.5">
          {paper.limitations.map((limitation, idx) => (
            <li key={idx} className="bg-zinc-950/30 p-2 rounded border border-zinc-850">
              {limitation}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export const PaperDetailsModal: React.FC<PaperDetailsModalProps> = ({ paper, isOpen, onClose }) => {
  const [showPdf, setShowPdf] = useState(false);

  // Always reopen on the details view, never on a previous paper's PDF.
  useEffect(() => {
    setShowPdf(false);
  }, [paper?.id, isOpen]);

  if (!paper) return null;

  const subtitle = paper.is_demo
    ? `${paper.authors.join(', ')} • ${paper.venue} (${paper.year})`
    : 'Uploaded paper';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={paper.title} subtitle={subtitle} maxWidth={showPdf ? '4xl' : '2xl'}>
      {paper.is_demo ? (
        <DemoPaperDetails paper={paper} />
      ) : showPdf ? (
        <div className="space-y-3">
          <Button size="sm" variant="ghost" onClick={() => setShowPdf(false)} leftIcon={<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />}>
            Back to details
          </Button>
          <PdfViewer paperId={paper.id} filename={paper.originalFilename || paper.title} />
        </div>
      ) : (
        <UploadedPaperDetails paper={paper} onViewPdf={() => setShowPdf(true)} />
      )}
    </Modal>
  );
};
