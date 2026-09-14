export interface DashboardStats {
  papersAnalyzed: number;
  literatureReviews: number;
  keyInsights: number;
  researchGaps: number;
  totalCitationsIndexed: number;
  activeWorkspaces: number;
}

export const mockDashboardStats: DashboardStats = {
  papersAnalyzed: 12,
  literatureReviews: 8,
  keyInsights: 47,
  researchGaps: 23,
  totalCitationsIndexed: 4328,
  activeWorkspaces: 3
};

export interface AIInsightItem {
  id: string;
  category: 'Consensus' | 'Trend' | 'Open Challenge' | 'Divergence';
  text: string;
  supportingPaperCount: number;
  confidence: 'High' | 'Moderate';
  impactTag: string;
  contributingPapers: string[];
}

export const mockAIInsights: AIInsightItem[] = [
  {
    id: 'ins-01',
    category: 'Consensus',
    text: '3 papers report improved performance when multimodal physiological signals are combined through cross-attention rather than late concatenation.',
    supportingPaperCount: 3,
    confidence: 'High',
    impactTag: '+6.8% Avg Gain',
    contributingPapers: [
      'Deep Learning Approaches for Multimodal Stress Detection',
      'Vision-Language Pre-training for Zero-Shot Medical Image Segmentation',
      'Transformer-Based Methods for Scientific Document Summarization'
    ]
  },
  {
    id: 'ins-02',
    category: 'Trend',
    text: 'Transformer-based models appear frequently across 75% of your selected papers, replacing recurrent LSTM backbones for long-range temporal modeling.',
    supportingPaperCount: 9,
    confidence: 'High',
    impactTag: 'Dominant Paradigm',
    contributingPapers: [
      'A Survey of Large Language Models for Scientific Research',
      'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
      'Transformer-Based Methods for Scientific Document Summarization'
    ]
  },
  {
    id: 'ins-03',
    category: 'Open Challenge',
    text: 'Several papers identify limited cross-dataset validation as an open research challenge, with performance drops averaging 22% during external evaluations.',
    supportingPaperCount: 6,
    confidence: 'High',
    impactTag: 'Critical Research Gap',
    contributingPapers: [
      'Deep Learning Approaches for Multimodal Stress Detection',
      'A Survey of Large Language Models for Scientific Research',
      'Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering'
    ]
  },
  {
    id: 'ins-04',
    category: 'Consensus',
    text: 'Domain-adapted tokenization and post-hoc verification pipelines eliminate over 81% of ungrounded citation errors in academic RAG.',
    supportingPaperCount: 4,
    confidence: 'High',
    impactTag: '81% Verification Gain',
    contributingPapers: [
      'Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering',
      'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
      'A Survey of Large Language Models for Scientific Research'
    ]
  }
];
