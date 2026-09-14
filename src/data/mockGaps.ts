import { ResearchGap } from '../types';

export const mockResearchGaps: ResearchGap[] = [
  {
    id: 'gap-01',
    title: 'Limited Cross-Dataset Validation & Evaluation Shifts',
    frequency: 'High-frequency observation',
    frequencyCount: 8,
    category: 'Evaluation',
    description: 'Algorithms achieve impressive results on single in-distribution datasets (e.g. WESAD or PubMedQA) but report acute performance drops of 18-35% when tested on independent external benchmarks due to disparate sensor hardware, sampling rates, and label definitions.',
    whyThisIsAGap: 'Current literature optimizes for benchmark leaderboard metrics using subject-dependent splits rather than testing true out-of-distribution robustness across independent clinical and laboratory cohorts.',
    evidence: 'Schmidt et al. (2023) observed a 22.0% F1-score drop under Leave-One-Subject-Out (LOSO) regimes; Smith et al. (2024) demonstrated cross-corpus factuality drop from 88.7% to 64.2%.',
    potentialDirection: 'Develop unsupervised domain adaptation layers and sensor-agnostic contrastive representation pre-training to enforce cross-hardware invariance.',
    possibleThesisQuestion: 'How can invariant self-supervised representations mitigate catastrophic performance degradation during cross-dataset domain shifts in scientific biosensing and NLP?',
    affectedPapers: [
      'Deep Learning Approaches for Multimodal Stress Detection',
      'A Survey of Large Language Models for Scientific Research',
      'Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering'
    ],
    opportunityScore: 92,
    feasibilityScore: 84,
    potentialImpact: 'Transformative',
    recommendedQuestions: [
      'What universal normalization pipelines mitigate sampling rate discrepancies between wearable devices?',
      'How can zero-shot domain generalization models be formulated to maintain invariance across sensor manufacturers?'
    ]
  },
  {
    id: 'gap-02',
    title: 'Limited Dataset Diversity & Demographic Skew',
    frequency: 'High-frequency observation',
    frequencyCount: 8,
    category: 'Datasets',
    description: 'The vast majority of studies draw exclusively from constrained, homogenous cohorts (e.g. university volunteers aged 19-27), with severely limited representation across ages, comorbidities, and global ethnic distributions.',
    whyThisIsAGap: 'Models trained on narrow demographic subsets fail silently when deployed in diverse real-world or clinical environments, perpetuating algorithmic bias.',
    evidence: 'Rajpurkar et al. (2023) reported significant false-positive spikes in pediatric chest radiographs when models were pre-trained exclusively on adult cohorts.',
    potentialDirection: 'Formulate privacy-preserving federated multi-center data consortia combined with counterfactual demographic data balancing.',
    possibleThesisQuestion: 'To what extent does demographic homogeneity in benchmark datasets bias zero-shot foundation models in multimodal diagnostics, and can synthetic balancing recover calibration?',
    affectedPapers: [
      'Deep Learning Approaches for Multimodal Stress Detection',
      'Vision-Language Pre-training for Zero-Shot Medical Image Segmentation',
      'Transformer-Based Methods for Scientific Document Summarization'
    ],
    opportunityScore: 88,
    feasibilityScore: 78,
    potentialImpact: 'High',
    recommendedQuestions: [
      'How does model calibration degrade when evaluated on pediatric or elderly clinical populations?',
      'Can synthetic data augmentation or cross-domain adversarial adaptation recover lost generalization?'
    ]
  },
  {
    id: 'gap-03',
    title: 'Limited Real-Time Evaluation & Edge Latency Benchmarks',
    frequency: 'Emerging research gap',
    frequencyCount: 4,
    category: 'Scalability',
    description: 'While complex multi-head cross-attention models boost offline accuracy, few works benchmark computational latency, power consumption, or memory footprint on resource-constrained embedded or clinical edge hardware.',
    whyThisIsAGap: 'Scientific breakthroughs remain confined to GPU cluster environments without empirical validation on low-power microcontrollers or real-time clinical telemetry.',
    evidence: 'Lewis et al. (2023) noted non-trivial dense vector retrieval latency bottlenecks; Raissi et al. (2024) highlighted memory ceilings during continuous spatial PDE integration.',
    potentialDirection: 'Explore structured weight pruning, 4-bit quantization-aware training, and knowledge distillation specifically tailored for sparse multi-scale attention.',
    possibleThesisQuestion: 'Can sub-15ms edge inference be achieved for multimodal cross-attention networks through integer quantization without exceeding a 2% accuracy degradation?',
    affectedPapers: [
      'Deep Learning Approaches for Multimodal Stress Detection',
      'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
      'Physics-Informed Neural Networks for High-Dimensional Climate Dynamics Emulation'
    ],
    opportunityScore: 82,
    feasibilityScore: 90,
    potentialImpact: 'High',
    recommendedQuestions: [
      'What quantization and knowledge distillation strategies enable multi-stream transformers to run under 15ms latency?',
      'Can event-driven neuromorphic architectures replace sliding-window FFT features for energy efficiency?'
    ]
  },
  {
    id: 'gap-04',
    title: 'Interpretability & Scientific Hallucination Verification',
    frequency: 'Medium-frequency observation',
    frequencyCount: 5,
    category: 'Interpretability',
    description: 'End-to-end deep neural networks and generative assistants lack transparent mechanistic interpretability. In high-stakes scientific analysis, researchers cannot reliably verify whether intermediate neural representations reflect true physical principles or spurious correlations.',
    whyThisIsAGap: 'Black-box neural representations cannot provide certified guarantees required for peer review and clinical safety standards.',
    evidence: 'Smith et al. (2024) observed unconstrained generative assistants producing fabricated citations in 22.4% of scientific queries; Wang et al. (2024) identified topological graph shortcut learning.',
    potentialDirection: 'Combine neuro-symbolic reasoning verifiers with page-grounded constrained decoding and mechanistic feature attribution maps.',
    possibleThesisQuestion: 'How can formal logical constraint verification be integrated into autoregressive decoders to guarantee physical law consistency in scientific literature copilots?',
    affectedPapers: [
      'A Survey of Large Language Models for Scientific Research',
      'Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering',
      'Contrastive Self-Supervised Learning for Graph Neural Networks in Molecular Property Prediction'
    ],
    opportunityScore: 95,
    feasibilityScore: 68,
    potentialImpact: 'Transformative',
    recommendedQuestions: [
      'How can symbolic reasoning solvers be coupled with neural decoders to guarantee physical law adherence?',
      'What confidence estimation metrics reliably identify when a literature assistant is inventing citations?'
    ]
  }
];
