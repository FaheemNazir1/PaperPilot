import React from 'react';
import { Paper } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FileText, Sparkles, ExternalLink, Database, Cpu, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PaperDetailsModalProps {
  paper: Paper | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSummary?: (paper: Paper) => void;
}

export const PaperDetailsModal: React.FC<PaperDetailsModalProps> = ({
  paper,
  isOpen,
  onClose,
  onOpenSummary
}) => {
  const navigate = useNavigate();

  if (!paper) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paper.title}
      subtitle={`${paper.authors.join(', ')} • ${paper.venue} (${paper.year})`}
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs text-zinc-300">
        {/* Top Badges & Meta */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{paper.category}</Badge>
          <Badge variant="neutral">{paper.pdfSize}</Badge>
          <Badge variant="outline">{paper.citationsCount} Citations</Badge>
          <Badge variant="success">{paper.status}</Badge>
          {paper.doi && (
            <span className="text-[11px] font-mono text-zinc-500 ml-auto">
              DOI: {paper.doi}
            </span>
          )}
        </div>

        {/* Abstract */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-accent-400" />
            Abstract
          </h4>
          <p className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 leading-relaxed text-zinc-300">
            {paper.abstract}
          </p>
        </div>

        {/* Two-column technical breakdown: Dataset & Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/60">
            <span className="text-[11px] text-zinc-500 uppercase font-semibold flex items-center gap-1 mb-1">
              <Database className="w-3 h-3 text-zinc-400" />
              Benchmark Dataset
            </span>
            <span className="text-xs font-mono text-zinc-200">{paper.dataset}</span>
          </div>
          <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/60">
            <span className="text-[11px] text-zinc-500 uppercase font-semibold flex items-center gap-1 mb-1">
              <Cpu className="w-3 h-3 text-zinc-400" />
              Model Architecture
            </span>
            <span className="text-xs font-mono text-zinc-200">{paper.model}</span>
          </div>
        </div>

        {/* Methodology */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-1">
            Methodology Overview
          </h4>
          <p className="leading-relaxed text-zinc-300">
            {paper.methodology}
          </p>
        </div>

        {/* Key Findings */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Key Reported Findings
          </h4>
          <ul className="space-y-1.5">
            {paper.keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-zinc-950/30 p-2 rounded border border-zinc-850">
                <span className="text-emerald-400 font-mono text-[11px]">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Limitations */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Reported Limitations
          </h4>
          <ul className="space-y-1.5">
            {paper.limitations.map((limitation, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-zinc-950/30 p-2 rounded border border-zinc-850">
                <span className="text-amber-400 font-mono text-[11px]">•</span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Structured Sections from PyMuPDF & Section Detector */}
        {paper.sections && paper.sections.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent-400" />
                Extracted Structured Sections ({paper.sections.length})
              </h4>
              <span className="text-[10px] text-accent-400 font-mono">
                Heuristic Section Detection
              </span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {paper.sections.map((sec, idx) => (
                <div
                  key={sec.id || idx}
                  className="p-2.5 bg-zinc-950/70 rounded-md border border-zinc-850 hover:border-zinc-750 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {sec.heading}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {sec.section_type}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        p. {sec.page_start}{sec.page_end > sec.page_start ? `-${sec.page_end}` : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                    {sec.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dual Text Inspection: original_text vs cleaned_text */}
        {(paper.original_text || paper.cleaned_text) && (
          <details className="group border border-zinc-800/80 rounded-lg p-3 bg-zinc-950/40">
            <summary className="text-xs font-semibold text-zinc-300 cursor-pointer flex items-center justify-between select-none">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-accent-400" />
                Inspect Dual Extracted Text Streams
              </span>
              <span className="text-[10px] font-mono text-zinc-500 group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-zinc-400">1. original_text (PyMuPDF Raw)</span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {paper.original_text?.length || 0} chars
                  </span>
                </div>
                <div className="h-32 overflow-y-auto p-2 bg-zinc-950 font-mono text-[10px] text-zinc-400 rounded border border-zinc-850 whitespace-pre-wrap">
                  {paper.original_text?.slice(0, 3000) || 'No raw stream stored'}
                  {(paper.original_text?.length || 0) > 3000 && '\n... [truncated for preview]'}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-zinc-400">2. cleaned_text (Normalized)</span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {paper.cleaned_text?.length || 0} chars
                  </span>
                </div>
                <div className="h-32 overflow-y-auto p-2 bg-zinc-950 font-mono text-[10px] text-zinc-400 rounded border border-zinc-850 whitespace-pre-wrap">
                  {paper.cleaned_text?.slice(0, 3000) || 'No cleaned stream stored'}
                  {(paper.cleaned_text?.length || 0) > 3000 && '\n... [truncated for preview]'}
                </div>
              </div>
            </div>
          </details>
        )}

        {/* Modal Action footer */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <span>SQLite Database • Ingested via PyMuPDF</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent-400" />}
              onClick={() => {
                onClose();
                onOpenSummary?.(paper);
              }}
            >
              Generate AI Summary
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                navigate('/compare');
              }}
            >
              Compare in Matrix
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
