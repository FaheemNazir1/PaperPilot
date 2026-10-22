import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../common/Button';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

interface PdfViewerProps {
  paperId: string;
  filename: string;
}

/** Renders the user's original uploaded PDF (fetched with their Firebase token) page by page. */
export const PdfViewer: React.FC<PdfViewerProps> = ({ paperId, filename }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and parse the PDF once per paper.
  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjs.PDFDocumentLoadingTask | null = null;
    setLoading(true);
    setError(null);
    setDoc(null);
    setBlob(null);
    setPage(1);
    (async () => {
      try {
        const data = await api.getPaperPdf(paperId);
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(await data.arrayBuffer()) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setBlob(data);
        setDoc(pdf);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this PDF.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [paperId]);

  // Draw the current page whenever the page, zoom or document changes.
  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let cancelled = false;
    let task: pdfjs.RenderTask | null = null;
    (async () => {
      try {
        const pdfPage = await doc.getPage(page);
        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ratio = window.devicePixelRatio || 1;
        const viewport = pdfPage.getViewport({ scale: zoom * 1.25 * ratio });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / ratio}px`;
        canvas.style.height = `${viewport.height / ratio}px`;
        task = pdfPage.render({ canvas, viewport });
        await task.promise;
      } catch (err) {
        if (!cancelled && (err as { name?: string })?.name !== 'RenderingCancelledException') {
          setError('This page could not be displayed.');
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, zoom]);

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading PDF…
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-sm text-rose-300">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <p>{error || 'Could not open this PDF.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
          <span className="text-xs text-zinc-300 tabular-nums min-w-[5.5rem] text-center">
            Page {page} of {doc.numPages}
          </span>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(doc.numPages, p + 1))} disabled={page >= doc.numPages} aria-label="Next page">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </Button>
          <span className="text-xs text-zinc-300 tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button size="sm" variant="outline" onClick={download} leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}>
            Download
          </Button>
        </div>
      </div>
      <div className="overflow-auto max-h-[60vh] rounded-lg border border-zinc-800 bg-zinc-950 p-2">
        <canvas ref={canvasRef} className="mx-auto bg-white" aria-label={`Page ${page} of the uploaded PDF`} />
      </div>
    </div>
  );
};
