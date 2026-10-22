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

export interface PaperSummary {
  summary: string;
  model: string;
  /** Tokens the model actually read (max 512). */
  inputTokens: number;
  /** Tokens in the text extracted from the PDF. */
  totalTokens: number;
  /** True when the model read only the start of the extracted text. */
  truncated: boolean;
}

export interface ChatCitation {
  /** The [n] marker used in the answer text. */
  ref: number;
  paperId: string;
  paperTitle: string;
  section: string;
  pageStart: number;
  pageEnd: number;
  chunkId: string;
  excerpt: string;
}

export type ChatStatus = 'answered' | 'refused' | 'clarify' | 'no_papers' | 'insufficient_evidence';

export interface ChatReply {
  category: string;
  status: ChatStatus;
  answer: string;
  citations: ChatCitation[];
  evidence: {
    papersSearched: { id: string; title: string }[];
    papersUnavailable: { id: string; title: string; reason: string }[];
    paperSetTruncated?: boolean;
  };
  model: string | null;
}

export interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reply?: ChatReply;
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
