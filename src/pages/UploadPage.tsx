import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { DropZone } from '../components/upload/DropZone';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { api, MAX_UPLOAD_MB } from '../lib/api';
import { useLibrary } from '../contexts/LibraryContext';
import { useToast } from '../context/ToastContext';
import { formatBytes, formatDate, formatFileSize } from '../lib/utils';
import { Paper } from '../types';

interface SelectedFile {
  key: string;
  file: File;
  /** Set when the server rejected this file; the file stays listed so it can be retried or removed. */
  error?: string;
}

interface RejectedFile {
  name: string;
  reason: string;
}

const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refresh } = useLibrary();

  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const [uploaded, setUploaded] = useState<Paper[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    const accepted: SelectedFile[] = [];
    const problems: RejectedFile[] = [];
    const known = new Set(selected.map((s) => s.key));

    for (const file of files) {
      const key = fileKey(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) problems.push({ name: file.name, reason: 'Only PDF files are supported.' });
      else if (file.size === 0) problems.push({ name: file.name, reason: 'The file is empty.' });
      else if (file.size > MAX_BYTES)
        problems.push({ name: file.name, reason: `Larger than the ${MAX_UPLOAD_MB} MB limit (${formatFileSize(file.size)}).` });
      else if (!known.has(key)) {
        known.add(key);
        accepted.push({ key, file });
      }
    }

    setRejected(problems);
    setRequestError(null);
    if (accepted.length > 0) setSelected((prev) => [...prev, ...accepted]);
  };

  const handleRemove = (key: string) => {
    setSelected((prev) => prev.filter((s) => s.key !== key));
  };

  const handleUpload = async () => {
    if (selected.length === 0 || isUploading) return;
    setIsUploading(true);
    setRequestError(null);
    setRejected([]);

    const batch = selected;
    try {
      const { items, papers } = await api.uploadPapers(batch.map((s) => s.file));

      // The server reports one item per file, in the order they were sent.
      const failed: SelectedFile[] = [];
      batch.forEach((entry, i) => {
        const item = items[i];
        if (!item || item.status !== 'uploaded') {
          failed.push({ ...entry, error: item?.error || 'This file was not uploaded.' });
        }
      });

      const okCount = batch.length - failed.length;
      // Refresh first so the sidebar/dashboard counts already include the new papers when the result appears.
      if (okCount > 0) await refresh();
      setSelected(failed);
      setUploaded((prev) => [...prev, ...papers]);

      if (okCount > 0) {
        showToast(okCount === 1 ? 'Paper uploaded' : `${okCount} papers uploaded`, 'success');
      }
      if (failed.length > 0) {
        showToast(`${failed.length} file${failed.length === 1 ? '' : 's'} could not be uploaded`, 'error');
      }
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const hasFailures = selected.some((s) => s.error);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Upload Research Papers</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Add PDFs to your private library. Uploaded papers are stored as-is; analysis features are not available yet.
        </p>
      </div>

      <DropZone onFilesSelected={handleFilesSelected} maxSizeMb={MAX_UPLOAD_MB} disabled={isUploading} />

      {/* Files the browser-side checks refused */}
      {rejected.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 space-y-1">
          <div className="font-medium">Some files were not added</div>
          <ul className="text-xs text-amber-200/90 space-y-0.5">
            {rejected.map((r, i) => (
              <li key={`${r.name}-${i}`}>
                <span className="font-medium">{r.name}</span> — {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selected files */}
      {selected.length > 0 && (
        <section aria-label="Selected files" className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">
            {selected.length} file{selected.length === 1 ? '' : 's'} selected
          </h2>
          <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/40">
            {selected.map((s) => (
              <li key={s.key} className="flex items-start gap-3 px-4 py-3">
                <FileText className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-zinc-200 truncate" title={s.file.name}>
                    {s.file.name}
                  </div>
                  <div className="text-xs text-zinc-500">{formatBytes(s.file.size)}</div>
                  {s.error && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{s.error}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(s.key)}
                  disabled={isUploading}
                  aria-label={`Remove ${s.file.name}`}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>

          {requestError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium">Upload failed</div>
                <div className="text-xs text-rose-200/90">{requestError}</div>
                <div className="text-xs text-rose-200/70 mt-0.5">Your selection is kept — you can try again.</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {isUploading && (
              <span role="status" className="text-xs text-zinc-400">
                Uploading {selected.length} file{selected.length === 1 ? '' : 's'}…
              </span>
            )}
            <Button
              variant="primary"
              size="md"
              isLoading={isUploading}
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={handleUpload}
            >
              {isUploading ? 'Uploading' : requestError || hasFailures ? 'Retry upload' : `Upload ${selected.length === 1 ? 'paper' : `${selected.length} papers`}`}
            </Button>
          </div>
        </section>
      )}

      {/* Success: only what actually happened — the file is stored, nothing more */}
      {uploaded.length > 0 && (
        <section aria-label="Upload results" className="space-y-3">
          {uploaded.map((paper) => (
            <div key={paper.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Paper uploaded successfully
              </div>
              <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="sm:col-span-2 min-w-0">
                  <dt className="text-xs text-zinc-500">Filename</dt>
                  <dd className="text-zinc-200 truncate" title={paper.originalFilename || paper.title}>
                    {paper.originalFilename || paper.title}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">File size</dt>
                  <dd className="text-zinc-200">{formatBytes(paper.sizeBytes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Uploaded</dt>
                  <dd className="text-zinc-200">{paper.uploadedAt ? formatDate(paper.uploadedAt) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Status</dt>
                  <dd>
                    <Badge variant="neutral">Uploaded — not yet analyzed</Badge>
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => navigate(`/papers?paper=${encodeURIComponent(paper.id)}`)}>
                  View Paper
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => navigate('/papers')}>
              Go to My Papers
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};
