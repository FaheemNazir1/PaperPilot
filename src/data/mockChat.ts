import { ChatMessage } from '../types';

export const mockChatHistory: ChatMessage[] = [
  {
    id: 'msg-01',
    sender: 'user',
    timestamp: '10:42 AM',
    text: 'What are the most common methods used across these papers?'
  },
  {
    id: 'msg-02',
    sender: 'assistant',
    timestamp: '10:43 AM',
    text: `Across the 12 analyzed papers in your workspace, three primary methodological paradigms appear most frequently:

1. **Transformer-Based Attention Architectures (75% of papers)**:
   From hierarchical long-context transformers for document summarization to Fourier neural operators and cross-attention sensor fusion, multi-head attention is the unifying architectural backbone.

2. **Multimodal Feature Alignment & Fusion (58% of papers)**:
   Authors consistently report that combining heterogeneous data streams (e.g., physiological sensor signals, vision-language report pairs, or multi-view molecular graphs) substantially outperforms unimodal baselines, provided fusion occurs at intermediate representations rather than naive early concatenation.

3. **Self-Supervised & Contrastive Pre-training (50% of papers)**:
   Given the high cost of expert scientific annotations (radiologist masks, molecular wet-lab assays), contrastive learning on large unlabeled corpora is heavily utilized to learn invariant representations before fine-tuning on downstream tasks.`,
    citations: [
      {
        id: 'cit-01',
        citationLabel: '[Paper 01, p. 4]',
        paperId: 'paper-01',
        paperTitle: 'Deep Learning Approaches for Multimodal Stress Detection',
        page: 4,
        excerpt: 'We observe that intermediate cross-attention fusion between ECG and EDA representations yields a statistically significant 6.8% increase in F1-score over baseline concatenate-and-classify strategies (p < 0.01).'
      },
      {
        id: 'cit-02',
        citationLabel: '[Paper 04, p. 7]',
        paperId: 'paper-04',
        paperTitle: 'Transformer-Based Methods for Scientific Document Summarization',
        page: 7,
        excerpt: 'Hierarchical sparse attention mechanisms demonstrate superior parameter efficiency, reducing global memory complexity from quadratic O(N²) to linear O(N) while preserving cross-section methodological context.'
      },
      {
        id: 'cit-03',
        citationLabel: '[Paper 07, p. 6]',
        paperId: 'paper-07',
        paperTitle: 'Vision-Language Pre-training for Zero-Shot Medical Image Segmentation',
        page: 6,
        excerpt: 'Pre-training on 1.2M radiograph-report pairings through bidirectional contrastive alignment enables zero-shot promptable localization of cardiomegaly and pneumothorax matching senior radiologist consensus.'
      }
    ],
    suggestedFollowUps: [
      'Where do the authors disagree on evaluation protocols?',
      'Which datasets show the highest cross-domain transfer drop?',
      'Summarize the reported computational latency numbers.'
    ]
  },
  {
    id: 'msg-03',
    sender: 'user',
    timestamp: '10:45 AM',
    text: 'What major limitations or research gaps are highlighted in these papers?'
  },
  {
    id: 'msg-04',
    sender: 'assistant',
    timestamp: '10:45 AM',
    text: `Synthesizing the Discussion and Limitations sections across your workspace, four systemic bottlenecks are explicitly recognized by the researchers:

• **Ecological Validity & Cohort Homogeneity**: In biomedical and affective studies, cohorts are predominantly constrained to small numbers of healthy young adults (e.g., WESAD N=15), failing to generalize to clinical pathologies.
• **Cross-Dataset Distribution Shift**: Models evaluated on distinct independent benchmarks show acute performance degradation (up to 35% drop), primarily caused by variations in sensor placement, sampling rates, or annotation guidelines.
• **Computational Latency on Edge Hardware**: None of the transformer-based multimodal pipelines have been rigorously validated on low-power wearable or clinical bedside microcontrollers.
• **Citation Attribution & Hallucination**: Generative assistants struggle to maintain grounded provenance without explicit constrained decoding and post-hoc verification passes.`,
    citations: [
      {
        id: 'cit-04',
        citationLabel: '[Paper 01, p. 11]',
        paperId: 'paper-01',
        paperTitle: 'Deep Learning Approaches for Multimodal Stress Detection',
        page: 11,
        excerpt: 'A salient limitation of this study is the controlled laboratory environment. Naturalistic stress triggers exhibit non-stationary baseline fluctuations that are absent in artificial arithmetic stressors.'
      },
      {
        id: 'cit-05',
        citationLabel: '[Paper 08, p. 9]',
        paperId: 'paper-08',
        paperTitle: 'Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering',
        page: 9,
        excerpt: 'Greedy autoregressive decoding resulted in hallucinated bibliographic citations in 22.4% of scientific answers. Constrained decoding over verified vector chunks reduced this to 3.8%.'
      }
    ],
    suggestedFollowUps: [
      'Draft a methodology section addressing the cross-dataset validation gap.',
      'Compare dataset sizes across the biomedical papers.',
      'Export these limitations as bullet points for my review.'
    ]
  }
];

export const mockDefaultPrompts: string[] = [
  'What are the most common methods used across these papers?',
  'Where do the authors disagree on sensor placement or modality weighting?',
  'Extract the reported accuracy metrics and benchmark datasets.',
  'Identify unexplored research gaps suitable for a thesis topic.'
];
