import React, { useState } from 'react';
import { Upload, CheckCircle2, Sparkles, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { DropZone } from '../components/upload/DropZone';
import { UploadQueueItem } from '../components/upload/UploadQueueItem';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { UploadItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [queue, setQueue] = useState<UploadItem[]>([
    {
      id: 'file-01',
      name: 'Deep_Learning_Multimodal_Stress_Detection.pdf',
      size: '3.4 MB',
      progress: 100,
      status: 'ready',
      pages: 12
    },
    {
      id: 'file-02',
      name: 'Survey_Large_Language_Models_Scientific_Research.pdf',
      size: '5.1 MB',
      progress: 100,
      status: 'ready',
      pages: 28
    },
    {
      id: 'file-03',
      name: 'Retrieval_Augmented_Generation_NLP_Tasks.pdf',
      size: '2.8 MB',
      progress: 100,
      status: 'ready',
      pages: 14
    },
    {
      id: 'file-04',
      name: 'Transformer_Scientific_Document_Summarization.pdf',
      size: '4.2 MB',
      progress: 100,
      status: 'ready',
      pages: 16
    }
  ]);

  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleFilesSelected = (files: File[]) => {
    const newItems: UploadItem[] = files.map((file, idx) => ({
      id: `upload-${Date.now()}-${idx}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      progress: 30,
      status: 'queued',
      pages: Math.floor(Math.random() * 12) + 8
    }));
    setQueue((prev) => [...newItems, ...prev]);
    showToast(`${files.length} paper(s) added to upload queue`, 'info');
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    showToast('File removed from queue', 'info');
  };

  // Frontend-only simulated processing sequence
  const handleAnalyzePapers = () => {
    setIsAnalyzing(true);
    setAnalysisComplete(false);

    // Stage 1: Uploading
    setProcessingStage('Uploading papers...');
    setQueue((prev) =>
      prev.map((item) => ({ ...item, status: 'uploading', progress: 45 }))
    );

    setTimeout(() => {
      // Stage 2: Extracting text
      setProcessingStage('Extracting text & mathematical notation...');
      setQueue((prev) =>
        prev.map((item) => ({ ...item, status: 'extracting', progress: 70 }))
      );

      setTimeout(() => {
        // Stage 3: Analyzing papers
        setProcessingStage('Analyzing paper methodologies & findings...');
        setQueue((prev) =>
          prev.map((item) => ({ ...item, status: 'analyzing', progress: 85 }))
        );

        setTimeout(() => {
          // Stage 4: Building research index
          setProcessingStage('Building semantic research index...');
          setQueue((prev) =>
            prev.map((item) => ({ ...item, status: 'indexed', progress: 95 }))
          );

          setTimeout(() => {
            // Stage 5: Ready
            setProcessingStage(null);
            setIsAnalyzing(false);
            setAnalysisComplete(true);
            setQueue((prev) =>
              prev.map((item) => ({ ...item, status: 'ready', progress: 100 }))
            );
            showToast('12 papers are ready for research.', 'success', 4000);
          }, 900);
        }, 900);
      }, 900);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Page Title & Subtitle */}
      <div className="border-b border-zinc-800/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Upload className="w-5 h-5 text-accent-400" />
          <span>Upload Research Papers</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Add multiple scientific papers to your research workspace.
        </p>
      </div>

      {/* Large Drag & Drop Upload Zone */}
      <DropZone onFilesSelected={handleFilesSelected} />

      {/* Uploaded Queue Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-200">
              Uploaded Papers Queue ({queue.length})
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">
              PDF Ingestion Pipeline
            </span>
          </div>

          {queue.length > 0 && !isAnalyzing && (
            <button
              onClick={() => {
                setQueue([]);
                showToast('Upload queue cleared', 'info');
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Clear Queue
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <EmptyState
            icon={Upload}
            title="No papers in upload queue"
            description="Drag and drop your PDF papers into the zone above or browse from your device."
          />
        ) : (
          <div className="space-y-2.5">
            {queue.map((item) => (
              <UploadQueueItem
                key={item.id}
                item={item}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}

        {/* Processing State Feedback Banner */}
        {isAnalyzing && (
          <div className="p-4 rounded-xl bg-accent-950/20 border border-accent-500/30 flex items-center gap-3 animate-in fade-in duration-150">
            <Loader2 className="w-5 h-5 animate-spin text-accent-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-accent-300">
                {processingStage}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                Extracting sections, references, datasets, and semantic vector embeddings
              </div>
            </div>
          </div>
        )}

        {/* Analysis Complete Banner */}
        {analysisComplete && (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-emerald-300">
                  12 papers are ready for research.
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  Full text, figures, equations, and references indexed for RAG
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/papers')}
            >
              Open Library
            </Button>
          </div>
        )}

        {/* Primary Action Button Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/80">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent-400" />
            <span>
              {queue.filter((q) => q.status === 'ready' || q.status === 'indexed').length} of {queue.length} files parsed & ready
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              isLoading={isAnalyzing}
              disabled={queue.length === 0}
              className="w-full sm:w-auto"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={handleAnalyzePapers}
            >
              {isAnalyzing ? 'Analyzing Papers...' : 'Analyze Papers'}
            </Button>
          </div>
        </div>

        {/* Info card on future pipeline */}
        <Card className="p-4 bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-400 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-accent-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-sans">
            <strong className="text-zinc-200">How PaperPilot Ingests Literature:</strong> Incoming PDFs are converted into structured markdown representations, mathematical formulas and figures are extracted with bounding boxes, and dense vector embeddings are indexed for semantic retrieval and cross-paper synthesis.
          </div>
        </Card>
      </div>
    </div>
  );
};
