import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import { CompareTable } from '../components/compare/CompareTable';
import { PaperComparisonRow } from '../types';
import { api } from '../lib/api';

export const ComparePage: React.FC = () => {
  const location = useLocation();
  const [comparisonData, setComparisonData] = useState<PaperComparisonRow[]>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([
    'paper-01',
    'paper-02',
    'paper-03',
    'paper-04'
  ]);
  const [allPapersMeta, setAllPapersMeta] = useState<{ id: string; title: string; year: number }[]>([]);

  useEffect(() => {
    async function loadData() {
      const papers = await api.getPapers();
      setAllPapersMeta(papers.map((p) => ({ id: p.id, title: p.title, year: p.year })));
      const matrix = await api.getComparisonMatrix();
      setComparisonData(matrix);

      // Check if routed with specific initial paper
      const initialId = (location.state as any)?.initialPaperId;
      if (initialId && !selectedPaperIds.includes(initialId)) {
        setSelectedPaperIds((prev) => [initialId, ...prev.filter((id) => id !== initialId)]);
      }
    }
    loadData();
  }, [location.state]);

  const handleTogglePaper = (id: string) => {
    if (selectedPaperIds.includes(id)) {
      setSelectedPaperIds(selectedPaperIds.filter((p) => p !== id));
    } else {
      setSelectedPaperIds([...selectedPaperIds, id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedPaperIds(allPapersMeta.map((p) => p.id));
  };

  const handleClearAll = () => {
    setSelectedPaperIds([]);
  };

  const filteredMatrix = comparisonData.filter((row) =>
    selectedPaperIds.includes(row.paperId)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <GitCompare className="w-5 h-5 text-accent-400" />
            <span>Cross-Paper Comparison Matrix</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Compare methodology, datasets, neural architectures, empirical findings, and limitations side-by-side
          </p>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <CompareTable
        data={filteredMatrix}
        allPapers={allPapersMeta}
        selectedPaperIds={selectedPaperIds}
        onTogglePaper={handleTogglePaper}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
      />
    </div>
  );
};
