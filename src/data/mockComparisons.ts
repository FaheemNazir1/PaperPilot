import { PaperComparisonRow } from '../types';

export const mockComparisonData: PaperComparisonRow[] = [
  {
    paperId: 'paper-01',
    paperTitle: 'Deep Learning Approaches for Multimodal Stress Detection',
    authors: 'K. Schmidt et al.',
    year: 2023,
    method: 'Dual-Stream Cross-Attention Sensor Fusion',
    dataset: 'WESAD (15 subjects, ECG/EDA/Respiration)',
    model: '1D-CNN + Multi-Head Self-Attention',
    mainFinding: 'Early cross-attention fusion yields +6.8% F1-score over isolated unimodal channels; EDA dominates acute cognitive response.',
    limitations: 'Subject-wise generalization variance; laboratory stressors lack natural workplace ecological validity.',
    performanceMetric: '94.2% F1-score (3-class)'
  },
  {
    paperId: 'paper-02',
    paperTitle: 'A Survey of Large Language Models for Scientific Research',
    authors: 'H. Zhang et al.',
    year: 2024,
    method: 'Systematic Taxonomic Synthesis & Multi-task Benchmarking',
    dataset: 'PubMedQA, SciQ, SciRepEval (60+ papers analyzed)',
    model: 'LLaMA-3-Sci, Galactica-30B, ScholarLM',
    mainFinding: 'Domain-adapted tokenizers reduce chemical fragmentation by 42%; retrieval augmentation reduces ungrounded claims.',
    limitations: 'High inference compute; lacking unified evaluation metrics for open-ended multi-step hypothesis generation.',
    performanceMetric: '88.7% factuality retention'
  },
  {
    paperId: 'paper-03',
    paperTitle: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: 'P. Lewis et al.',
    year: 2023,
    method: 'End-to-end Dense Passage Retrieval with Seq2Seq Generation',
    dataset: 'Natural Questions, TriviaQA, MS-MARCO',
    model: 'DPR (Bi-encoder) + BART-Large Generator',
    mainFinding: 'Non-parametric vector index enables real-time document updates without model retraining; superior factual precision.',
    limitations: 'Susceptible to query ambiguity and top-k retrieval cutoff; latency overhead in dense vector traversal.',
    performanceMetric: '44.8 Exact Match (NQ)'
  },
  {
    paperId: 'paper-04',
    paperTitle: 'Transformer-Based Methods for Scientific Document Summarization',
    authors: 'E. Cohan et al.',
    year: 2024,
    method: 'Hierarchical Multi-Scale Sparse-Attention Routing',
    dataset: 'arXiv Long-Paper, PubMed-100k',
    model: 'Hierarchical Longformer-Sci',
    mainFinding: 'Explicit section modeling improves ROUGE-L by 4.3 points while cutting GPU memory usage by 64%.',
    limitations: 'Dependent on structured document section headers; occasional stylistic seams in hybrid extractive-abstractive text.',
    performanceMetric: '46.1 ROUGE-L'
  },
  {
    paperId: 'paper-05',
    paperTitle: 'Contrastive Self-Supervised Learning for Graph Neural Networks in Molecular Property Prediction',
    authors: 'Y. Wang et al.',
    year: 2024,
    method: 'Multi-View Graph Contrastive Learning (Node & Scaffold)',
    dataset: 'ZINC15 (10M molecules), MoleculeNet',
    model: 'MolCL (Weisfeiler-Lehman GNN + Graph Transformer)',
    mainFinding: 'Self-supervised pre-training yields 14% ROC-AUC gains on low-data downstream pharmacological targets.',
    limitations: 'High compute overhead for 3D coordinate relaxation; does not generalize well to large multi-protein complexes.',
    performanceMetric: '86.4% ROC-AUC (Tox21)'
  },
  {
    paperId: 'paper-06',
    paperTitle: 'Physics-Informed Neural Networks for High-Dimensional Climate Dynamics Emulation',
    authors: 'M. Raissi et al.',
    year: 2024,
    method: 'Fourier Neural Operators with Navier-Stokes Conservation Constraints',
    dataset: 'ERA5 Global Reanalysis (1979-2022)',
    model: 'Physics-Informed Fourier Neural Operator (PINO)',
    mainFinding: 'Maintains conservation of mass and vorticity over 30-day horizons with 450x speedup over numerical PDEs.',
    limitations: 'Struggles with chaotic boundary conditions during sudden stratospheric warming; grid resolution capped at 0.25°.',
    performanceMetric: '450x Speedup, <0.04 RMSE'
  },
  {
    paperId: 'paper-07',
    paperTitle: 'Vision-Language Pre-training for Zero-Shot Medical Image Segmentation',
    authors: 'S. Rajpurkar et al.',
    year: 2023,
    method: 'Contrastive Cross-Modal Alignment with Natural Language Prompts',
    dataset: 'MIMIC-CXR, CheXpert (1.2M radiograph pairs)',
    model: 'MedVLP (Swin Transformer + BioClinicalBERT)',
    mainFinding: 'Zero-shot Dice score reaches 84.1% on thoracic abnormalities without task-specific pixel annotations.',
    limitations: 'Vulnerable to ambiguous free-text clinical reports; lower performance on rare pathologies (<50 training instances).',
    performanceMetric: '84.1% Mean Dice Score'
  },
  {
    paperId: 'paper-08',
    paperTitle: 'Benchmarking Hallucination Mitigation Strategies in Scientific QA',
    authors: 'L. B. Smith et al.',
    year: 2024,
    method: 'Adversarial Claim Perturbation & Constrained Fact-Checking Decoders',
    dataset: 'SciFact-Bench (3,500 expert-annotated queries)',
    model: 'FactCheck-LM + Constrained Decoders',
    mainFinding: 'Post-hoc citation verification pipelines eliminate 81% of fictitious citations; page-level grounding maximizes clinician trust.',
    limitations: 'Increases query response latency by 2.4x; requires fine-grained PDF text chunking.',
    performanceMetric: '81% Hallucination Reduction'
  }
];
