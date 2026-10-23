export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  doi?: string;
  category: string;
  researchArea: string;
  tags: string[];
  abstract: string;
  summary: string;
  methodology: string;
  keyFindings: string[];
  limitations: string[];
  dataset: string;
  model: string;
  /** 'Uploaded' = the PDF is stored; nothing has been analysed. Other values only appear on demo papers. */
  status: 'Uploaded' | 'Indexed' | 'Embedding Ready' | 'Processing' | 'Analyzed';
  citationsCount: number;
  pdfSize: string;
  addedAt: string;
  userId?: number;
  is_demo?: boolean;
  original_text?: string;
  cleaned_text?: string;
  sections?: PaperSection[];
  /** Upload metadata (user-owned papers only) */
  originalFilename?: string | null;
  sizeBytes?: number | null;
  pageCount?: number | null;
  uploadedAt?: string | null;
}

export interface PaperSection {
  id: string;
  paper_id: string;
  section_type: 'title' | 'abstract' | 'introduction' | 'methodology' | 'results' | 'discussion' | 'limitations' | 'conclusion' | 'references' | 'other' | string;
  heading: string;
  content: string;
  page_start: number;
  page_end: number;
}

export interface ReviewSection {
  id: string;
  title: string;
  content: string;
}

export interface ReviewReference {
  citationId: string;
  text: string;
  paperId?: string;
  title?: string;
  authors?: string;
  year?: number;
}

export interface LiteratureReview {
  id: string;
  title: string;
  abstract: string;
  topic: string;
  reviewStyle: 'IEEE' | 'APA 7th' | 'Nature' | 'ACM' | 'Harvard';
  length: 'Brief' | 'Medium' | 'Comprehensive';
  focusAreas: string[];
  paperCount: number;
  paperIds: string[];
  generatedAt: string;
  sections: ReviewSection[];
  references: ReviewReference[];
  researchGapsSummary: string[];
}

export interface PaperComparisonRow {
  paperId: string;
  paperTitle: string;
  authors: string;
  year: number;
  method: string;
  dataset: string;
  model: string;
  mainFinding: string;
  limitations: string;
  performanceMetric: string;
}

export interface ResearchGap {
  id: string;
  title: string;
  frequency: 'High-frequency observation' | 'Medium-frequency observation' | 'Emerging research gap';
  frequencyCount: number;
  category: 'Methodology' | 'Evaluation' | 'Datasets' | 'Interpretability' | 'Scalability';
  description: string;
  whyThisIsAGap: string;
  evidence: string;
  potentialDirection: string;
  possibleThesisQuestion: string;
  affectedPapers: string[];
  opportunityScore: number; // 0-100
  feasibilityScore: number; // 0-100
  potentialImpact: 'High' | 'Medium' | 'Transformative';
  recommendedQuestions: string[];
}

export interface CitationItem {
  id: string;
  citationLabel: string; // e.g. "[Paper 01, p. 4]"
  paperId: string;
  paperTitle: string;
  page: number;
  excerpt: string;
  confidence?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  citations?: CitationItem[];
  suggestedFollowUps?: string[];
}

/** Per-file outcome returned by POST /papers/upload */
export interface UploadResult {
  id: string;
  name: string;
  status: 'uploaded' | 'error';
  size?: string;
  pages?: number | null;
  paperId?: string;
  title?: string;
  error?: string;
}

export interface LibraryStats {
  personalPapers: number;
  demoPapers: number;
}

export interface AnalyzeResult {
  paper_id: string;
  title: string;
  abstract: string;
  status: string;
}

export interface OutputQualityFlags {
  repeated_phrases: boolean;
  citation_spam: boolean;
  unsupported_citations: boolean;
  truncated: boolean;
  warnings: string[];
}

export interface GenerateReviewResponse {
  related_work: string;
  model: string;
  tokens_requested: number;
  quality: OutputQualityFlags;
  disclaimer: string;
  /** Maps citation index ("1","2"…) to {paper_id, title} for citations grounded to real papers. */
  citation_map: Record<string, { paper_id: string; title?: string }>;
  /** Metadata about the grounding pass applied to raw model output. */
  grounding: {
    removed_sentence_count: number;
    pov_fixes_applied: boolean;
    insufficient_evidence: boolean;
  };
}

export interface ModelStatus {
  model_available: boolean;
  adapter_path: string;
  load_error: string | null;
}
