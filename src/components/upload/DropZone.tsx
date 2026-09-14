import React, { useRef, useState } from 'react';
import { FileText, Upload, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files);
      onFilesSelected(validFiles);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-200 group bg-zinc-900/40',
        isDragOver
          ? 'border-accent-500 bg-accent-600/10 scale-[1.005]'
          : 'border-zinc-800 hover:border-zinc-750 hover:bg-zinc-900/60'
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept=".pdf,application/pdf"
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-accent-400 mb-4 group-hover:scale-105 group-hover:border-accent-500/50 transition-all duration-200 shadow-sm">
          <FileText className="w-7 h-7 text-accent-400" />
        </div>

        <h3 className="text-base font-semibold text-zinc-100 tracking-tight mb-1">
          Upload Research Papers
        </h3>

        <p className="text-xs text-zinc-300 font-medium">
          Drag & drop your PDF files here
        </p>

        <span className="text-[11px] text-zinc-500 my-1 font-mono">or</span>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Upload className="w-3.5 h-3.5" />}
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 mb-4"
        >
          Browse files
        </Button>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
          <span className="text-zinc-400">Supported: PDF</span>
          <span>•</span>
          <span>Maximum 20 MB per file</span>
        </div>
      </div>
    </div>
  );
};
