import React, { useState } from 'react';
import { LiteratureReview, ReviewReference } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Download, Copy, Check, FileText, BookMarked, ExternalLink, Bookmark } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

interface ReviewDocumentViewerProps {
  review: LiteratureReview;
}

export const ReviewDocumentViewer: React.FC<ReviewDocumentViewerProps> = ({ review }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeReference, setActiveReference] = useState<ReviewReference | null>(null);

  const handleCopy = () => {
    const fullText = `${review.title}\n\nAbstract:\n${review.abstract}\n\n` +
      review.sections.map(s => `${s.title}\n${s.content}`).join('\n\n') +
      `\n\nReferences\n` +
      review.references.map(r => `${r.citationId} ${r.text}`).join('\n');

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    showToast('Literature review copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = (format: 'PDF' | 'DOCX' | 'Markdown') => {
    showToast(`Literature review exported as ${format}`, 'success');
  };

  // Helper to render text with interactive citation pills [1], [2], etc.
  const renderInteractiveText = (text: string) => {
    // Regex splits by [1], [2], [1, 2], etc.
    const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const citationId = part;
        const refItem = review.references.find((r) => r.citationId === citationId);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveReference(refItem || { citationId, text: 'Reference details indexed in workspace.' })}
            className="inline-flex items-center mx-0.5 px-1 py-0.2 rounded bg-accent-600/20 hover:bg-accent-600/35 text-accent-300 hover:text-accent-200 border border-accent-500/30 text-[11px] font-mono font-medium transition-colors align-baseline"
            title={`View reference ${citationId}`}
          >
            {part}
          </button>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-4">
      {/* Action Header / Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm">
            {review.reviewStyle} Citation Format
          </Badge>
          <Badge variant="outline" size="sm">
            {review.length} Length
          </Badge>
          <span className="text-[11px] font-mono text-zinc-400">
            Generated {review.generatedAt}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileText className="w-3.5 h-3.5 text-zinc-400" />}
            onClick={() => handleExport('Markdown')}
          >
            Markdown
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5 text-zinc-400" />}
            onClick={() => handleExport('DOCX')}
          >
            DOCX
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5 text-accent-400" />}
            onClick={() => handleExport('PDF')}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Academic Manuscript Canvas */}
      <Card className="p-8 sm:p-12 bg-zinc-900/40 border border-zinc-800/90 text-zinc-200 max-w-4xl mx-auto shadow-xl">
        {/* Document Header */}
        <div className="border-b border-zinc-800 pb-6 mb-8 text-center sm:text-left">
          <span className="text-xs font-mono uppercase tracking-widest text-accent-400 font-semibold block mb-2">
            Structured Literature Review Synthesis
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight leading-tight mb-3">
            {review.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
            <span>Synthesized by PaperPilot Copilot</span>
            <span>•</span>
            <span>{review.paperCount} Referenced Studies</span>
            <span>•</span>
            <span>Style: {review.reviewStyle}</span>
          </div>
        </div>

        {/* Abstract / Overview Block */}
        {review.abstract && (
          <div className="mb-8 p-4 bg-zinc-950/60 rounded-xl border border-zinc-850">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-accent-400" />
              Abstract / Synthesis Overview
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans italic">
              {review.abstract}
            </p>
          </div>
        )}

        {/* Outline Nav */}
        <div className="mb-8 p-3 bg-zinc-950/40 rounded-lg border border-zinc-850">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-2 font-semibold">
            Manuscript Sections (Click to Jump)
          </span>
          <div className="flex flex-wrap gap-2">
            {review.sections.map((section, idx) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-xs text-zinc-400 hover:text-zinc-200 hover:underline flex items-center gap-1 font-mono"
              >
                <span>§{idx + 1}</span>
                <span>{section.title.replace(/^\d+\.\s*/, '')}</span>
              </a>
            ))}
            <a
              href="#references"
              className="text-xs text-zinc-400 hover:text-zinc-200 hover:underline flex items-center gap-1 font-mono"
            >
              <span>§R</span>
              <span>References</span>
            </a>
          </div>
        </div>

        {/* Section Contents with Interactive Citation Pills */}
        <div className="space-y-8 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          {review.sections.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-20">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-100 tracking-tight mb-3 border-b border-zinc-800/60 pb-1.5">
                {section.title}
              </h2>
              <div className="whitespace-pre-line space-y-3 leading-relaxed text-zinc-300">
                {renderInteractiveText(section.content)}
              </div>
            </div>
          ))}

          {/* References Section */}
          <div id="references" className="scroll-mt-20 pt-6 border-t border-zinc-800">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-100 tracking-tight mb-4 flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-accent-400" />
              <span>References ({review.reviewStyle} Standard)</span>
            </h2>
            <ol className="space-y-2.5 text-xs text-zinc-400 font-mono">
              {review.references.map((ref) => (
                <li
                  key={ref.citationId}
                  className="flex items-start gap-2.5 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850/80 hover:border-zinc-700/80 transition-colors group cursor-pointer"
                  onClick={() => setActiveReference(ref)}
                >
                  <span className="text-accent-400 font-bold shrink-0">{ref.citationId}</span>
                  <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors flex-1">
                    {ref.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>

      {/* Citation Popover Modal */}
      <Modal
        isOpen={!!activeReference}
        onClose={() => setActiveReference(null)}
        title={`Reference Source ${activeReference?.citationId}`}
        subtitle="Bibliographic metadata and citation linkage"
        maxWidth="md"
      >
        {activeReference && (
          <div className="space-y-4 text-xs text-zinc-300">
            <div className="p-3.5 bg-zinc-950/70 rounded-lg border border-zinc-800 leading-relaxed font-sans text-zinc-200">
              {activeReference.text}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-500">
                {activeReference.paperId ? 'Indexed in library' : 'External citation'}
              </span>

              <div className="flex items-center gap-2">
                {activeReference.paperId && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveReference(null);
                      navigate('/papers');
                    }}
                  >
                    View in Library
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveReference(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
