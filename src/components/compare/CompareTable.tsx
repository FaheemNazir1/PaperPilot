import React, { useState } from 'react';
import { PaperComparisonRow } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { Download, Filter, Check, Eye, AlertCircle, Sparkles, GitCompare } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface CompareTableProps {
  data: PaperComparisonRow[];
  allPapers: { id: string; title: string; year: number }[];
  selectedPaperIds: string[];
  onTogglePaper: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const CompareTable: React.FC<CompareTableProps> = ({
  data,
  allPapers,
  selectedPaperIds,
  onTogglePaper,
  onSelectAll,
  onClearAll
}) => {
  const { showToast } = useToast();
  const [highlightDiff, setHighlightDiff] = useState(false);

  const handleExportCSV = () => {
    const headers = ['Paper', 'Authors', 'Year', 'Method', 'Dataset', 'Model', 'Main Finding', 'Limitations', 'Metric'];
    const rows = data.map(r => [
      `"${r.paperTitle.replace(/"/g, '""')}"`,
      `"${r.authors}"`,
      r.year,
      `"${r.method.replace(/"/g, '""')}"`,
      `"${r.dataset.replace(/"/g, '""')}"`,
      `"${r.model.replace(/"/g, '""')}"`,
      `"${r.mainFinding.replace(/"/g, '""')}"`,
      `"${r.limitations.replace(/"/g, '""')}"`,
      `"${r.performanceMetric}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'paperpilot_comparison_matrix.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Comparison matrix exported as CSV', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Paper Multiselector Bar */}
      <Card className="p-4 bg-zinc-900/60 border border-zinc-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-accent-400" />
            <span className="text-xs font-semibold text-zinc-200">
              Active Papers in Comparison Matrix ({selectedPaperIds.length} of {allPapers.length})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={onSelectAll}
              className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
            >
              Select All
            </button>
            <span className="text-zinc-600">•</span>
            <button
              onClick={onClearAll}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Paper Toggle Chips */}
        <div className="flex flex-wrap gap-1.5">
          {allPapers.map((paper) => {
            const isSelected = selectedPaperIds.includes(paper.id);
            return (
              <button
                key={paper.id}
                onClick={() => onTogglePaper(paper.id)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-medium shadow-xs'
                    : 'bg-zinc-950/60 text-zinc-400 border border-zinc-850 hover:border-zinc-750 hover:text-zinc-300'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? 'bg-accent-400' : 'bg-zinc-600'
                  }`}
                />
                <span className="truncate max-w-[200px] sm:max-w-[240px] text-left">
                  {paper.title} ({paper.year})
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHighlightDiff(!highlightDiff)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              highlightDiff
                ? 'bg-accent-600/15 text-accent-300 border-accent-500/40 font-medium'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Highlight Method Differences</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Comparison Table Container */}
      {data.length === 0 ? (
        <EmptyState
          icon={GitCompare}
          title="No papers selected for comparison"
          description="Choose one or more papers from the selector above to populate the cross-paper comparison matrix."
          actionLabel="Select All Papers"
          onAction={onSelectAll}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800/90 bg-zinc-950/70 shadow-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[11px] tracking-wider">
                <th className="p-3.5 font-semibold min-w-[240px] sticky left-0 bg-zinc-900/95 z-10 border-r border-zinc-800">
                  Paper & Citation
                </th>
                <th className="p-3.5 font-semibold min-w-[200px]">Method</th>
                <th className="p-3.5 font-semibold min-w-[180px]">Dataset</th>
                <th className="p-3.5 font-semibold min-w-[180px]">Model Architecture</th>
                <th className="p-3.5 font-semibold min-w-[240px]">Main Finding</th>
                <th className="p-3.5 font-semibold min-w-[220px]">Reported Limitations</th>
                <th className="p-3.5 font-semibold min-w-[140px]">Reported Metric</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {data.map((row) => (
                <tr
                  key={row.paperId}
                  className="hover:bg-zinc-900/40 transition-colors group"
                >
                  {/* Paper Title & Authors */}
                  <td className="p-3.5 sticky left-0 bg-zinc-950/95 group-hover:bg-zinc-900/90 z-10 border-r border-zinc-800">
                    <div className="font-semibold text-zinc-100 leading-snug line-clamp-2">
                      {row.paperTitle}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {row.authors} • <span className="font-mono">{row.year}</span>
                    </div>
                  </td>

                  {/* Method */}
                  <td className={`p-3.5 leading-relaxed ${highlightDiff ? 'bg-accent-600/10 text-accent-200' : ''}`}>
                    <span className="font-medium text-zinc-200 block">{row.method}</span>
                  </td>

                  {/* Dataset */}
                  <td className="p-3.5">
                    <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                      {row.dataset}
                    </Badge>
                  </td>

                  {/* Model */}
                  <td className="p-3.5 font-mono text-[11px] text-zinc-300">
                    {row.model}
                  </td>

                  {/* Main Finding */}
                  <td className="p-3.5 leading-relaxed text-zinc-300">
                    {row.mainFinding}
                  </td>

                  {/* Limitations */}
                  <td className="p-3.5 leading-relaxed text-zinc-400">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
                      <span>{row.limitations}</span>
                    </div>
                  </td>

                  {/* Performance Metric */}
                  <td className="p-3.5">
                    <Badge variant="success" size="sm" className="font-mono text-[11px]">
                      {row.performanceMetric}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
