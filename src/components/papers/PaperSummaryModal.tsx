import React from 'react';
import { Paper } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Sparkles, Copy, Check, Share2, BookMarked } from 'lucide-react';

interface PaperSummaryModalProps {
  paper: Paper | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaperSummaryModal: React.FC<PaperSummaryModalProps> = ({
  paper,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!paper) return null;

  const handleCopy = () => {
    const summaryText = `Title: ${paper.title}\nAuthors: ${paper.authors.join(', ')} (${paper.year})\nSummary: ${paper.summary}\nDataset: ${paper.dataset}\nMethodology: ${paper.methodology}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Structured AI Paper Summary"
      subtitle={`AI-extracted synthesis for "${paper.title}"`}
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs text-zinc-300">
        {/* Paper Citation Header */}
        <div className="p-3 bg-zinc-950/70 rounded-lg border border-zinc-800 flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-400 font-semibold block mb-0.5">
              Source Reference
            </span>
            <p className="text-zinc-100 font-medium leading-snug">
              {paper.title}
            </p>
            <p className="text-zinc-500 text-[11px] mt-0.5">
              {paper.authors.join(', ')} ({paper.year}) • {paper.venue}
            </p>
          </div>
          <Badge variant="accent" size="sm" className="shrink-0 font-mono">
            {paper.id.toUpperCase()}
          </Badge>
        </div>

        {/* Executive Summary */}
        <div className="space-y-1.5">
          <h5 className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-400" />
            Executive Synthesis
          </h5>
          <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/80 leading-relaxed text-zinc-200">
            {paper.summary}
          </div>
        </div>

        {/* Methodological Takeaway */}
        <div className="space-y-1.5">
          <h5 className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
            Method & Experimental Setup
          </h5>
          <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/80 space-y-2">
            <div>
              <span className="text-zinc-500 font-mono text-[10px] uppercase">Core Paradigm: </span>
              <span className="text-zinc-200">{paper.methodology}</span>
            </div>
            <div>
              <span className="text-zinc-500 font-mono text-[10px] uppercase">Data Corpus: </span>
              <span className="text-zinc-300 font-mono">{paper.dataset}</span>
            </div>
            <div>
              <span className="text-zinc-500 font-mono text-[10px] uppercase">Architecture: </span>
              <span className="text-zinc-300 font-mono">{paper.model}</span>
            </div>
          </div>
        </div>

        {/* Primary Findings */}
        <div className="space-y-1.5">
          <h5 className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
            Key Verified Claims
          </h5>
          <ul className="space-y-1.5">
            {paper.keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-zinc-950/30 p-2 rounded border border-zinc-850">
                <span className="text-accent-400 font-mono text-[11px]">0{idx + 1}.</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            Grounded in verified paper tokens
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={handleCopy}
            >
              {copied ? 'Copied' : 'Copy Summary'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
