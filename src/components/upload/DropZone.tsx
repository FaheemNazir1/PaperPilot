import React, { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxSizeMb: number;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, maxSizeMb, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    // Validation (type, size) happens in the page so rejected files can be reported to the user.
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
    e.target.value = ''; // allow re-selecting the same file after removing it
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative border border-dashed rounded-xl p-6 sm:p-8 text-center transition-colors duration-200 bg-zinc-900/40',
        disabled && 'opacity-60',
        isDragOver
          ? 'border-accent-500 bg-accent-600/10'
          : 'border-zinc-700/80 hover:border-zinc-600'
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept=".pdf,application/pdf"
        className="hidden"
        aria-label="Choose PDF files to upload"
      />

      <div className="flex flex-col items-center justify-center max-w-md mx-auto gap-3">
        <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center">
          <FileText className="w-5 h-5 text-accent-400" aria-hidden="true" />
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-200">Drag and drop PDF files here</p>
          <p className="text-xs text-zinc-500 mt-1">PDF only, up to {maxSizeMb} MB each</p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          leftIcon={<Upload className="w-3.5 h-3.5" />}
          onClick={() => fileInputRef.current?.click()}
        >
          Browse files
        </Button>
      </div>
    </div>
  );
};
