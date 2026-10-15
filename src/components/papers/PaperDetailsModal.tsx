import React from 'react';
import { Paper } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { FileText, Database, Cpu, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { formatBytes, formatDate } from '../../lib/utils';

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

/** Details for a paper the user uploaded: only facts we actually have. */
const UploadedPaperDetails: React.FC<{ paper: Paper }> = ({ paper }) => (
  <div className="space-y-5">
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      <div className="sm:col-span-2">
        <MetaRow label="Filename">{paper.originalFilename || paper.title}</MetaRow>
      </div>
      <MetaRow label="File size">{formatBytes(paper.sizeBytes)}</MetaRow>
      <MetaRow label="Pages">{paper.pageCount ?? '—'}</MetaRow>
      <MetaRow label="Uploaded">{paper.uploadedAt ? formatDate(paper.uploadedAt) : '—'}</MetaRow>
      <MetaRow label="Status">
        <Badge variant="neutral">Uploaded — not yet analyzed</Badge>
      </MetaRow>
      {paper.authors.length > 0 && (
        <div className="sm:col-span-2">
          <MetaRow label="Authors (from PDF metadata)">{paper.authors.join(', ')}</MetaRow>
        </div>
      )}
    </dl>

    <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" aria-hidden="true" />
      <p>
        This PDF is stored in your library. PaperPilot has not analyzed it yet, so there is no summary,
        findings or comparison to show.
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
  if (!paper) return null;

  const subtitle = paper.is_demo
    ? `${paper.authors.join(', ')} • ${paper.venue} (${paper.year})`
    : 'Uploaded paper';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={paper.title} subtitle={subtitle} maxWidth="2xl">
      {paper.is_demo ? <DemoPaperDetails paper={paper} /> : <UploadedPaperDetails paper={paper} />}
    </Modal>
  );
};
