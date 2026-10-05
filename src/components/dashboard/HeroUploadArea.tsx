import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileUp, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

export const HeroUploadArea: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // Navigate to /upload with drop prompt or files
    navigate('/upload');
  };

  const handleFileChange = () => {
    navigate('/upload');
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-200 ${
        isDragging
          ? 'border-accent-400 bg-accent-500/10'
          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/70 hover:bg-zinc-900/40'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="max-w-md mx-auto space-y-3">
        <div className="w-12 h-12 rounded-xl bg-accent-600/15 border border-accent-500/30 text-accent-400 mx-auto flex items-center justify-center transition-transform group-hover:scale-105">
          <FileUp className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-semibold text-zinc-100">
            Upload your research papers
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Drag & drop PDFs here or browse files
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
          <Sparkles className="w-3 h-3 text-accent-400" />
          <span>Supports multiple scientific PDFs</span>
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => navigate('/upload')}
          >
            Upload Papers
          </Button>
        </div>
      </div>
    </div>
  );
};
