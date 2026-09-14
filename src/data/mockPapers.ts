import { Paper } from '../types';

export const mockPapers: Paper[] = [
  {
    id: 'paper-01',
    title: 'Deep Learning Approaches for Multimodal Stress Detection',
    authors: ['K. Schmidt', 'A. Reiss', 'R. Duerichen', 'C. Van Laerhoven'],
    year: 2023,
    venue: 'IEEE Transactions on Biomedical Engineering',
    doi: '10.1109/TBME.2023.3241902',
    category: 'Biomedical Computing',
    researchArea: 'Affective Computing & Biosensors',
    tags: ['Multimodal', 'Sensor Fusion', 'Affective Computing', 'Deep Learning'],
    abstract: 'Multimodal physiological monitoring enables early and objective assessment of psychological stress. In this work, we investigate dual-stream convolutional and recurrent neural network architectures combining electrocardiogram (ECG), electrodermal activity (EDA), and respiration signals collected during laboratory stressors.',
    summary: 'Proposes a dual-stream CNN-Transformer architecture combining ECG, EDA, and respiration signals. Demonstrates that early cross-attention sensor fusion improves stress detection F1-score by 6.8% over isolated unimodal baselines.',
    methodology: 'Dual-stream 1D-CNN feature extraction with cross-modal multi-head self-attention. Evaluated using subject-wise Leave-One-Subject-Out (LOSO) cross-validation.',
    keyFindings: [
      'Early fusion via cross-attention outperforms late concatenation by 6.8% F1-score.',
      'EDA and ECG contribute 78% of discriminating power under acute cognitive stress.',
      'Subject variability remains the primary source of classification degradation.'
    ],
    limitations: [
      'Laboratory-induced stressors lack naturalistic ecological validity.',
      'Cohort size limited to 15 healthy adult subjects.',
      'Sensor motion artifacts were manually filtered prior to training.'
    ],
    dataset: 'WESAD (Wearable Stress and Affect Detection)',
    model: '1D-CNN + Cross-Attention Transformer',
    status: 'Analyzed',
    citationsCount: 142,
    pdfSize: '3.4 MB',
    addedAt: '2026-03-01'
  },
  {
    id: 'paper-02',
    title: 'A Survey of Large Language Models for Scientific Research: Architectures and Reasoning',
    authors: ['H. Zhang', 'J. Chen', 'M. Lin', 'R. Sutton'],
    year: 2024,
    venue: 'ACM Computing Surveys',
    doi: '10.1145/3648102',
    category: 'Artificial Intelligence',
    researchArea: 'Scientific LLMs & Reasoning',
    tags: ['Large Language Models', 'Scientific Discovery', 'Reasoning', 'Survey'],
    abstract: 'Scientific literature is growing at an exponential rate, overwhelming researchers. This comprehensive survey systematically reviews large language models tailored for scientific reasoning, literature synthesis, hypothesis generation, and experimental design across chemistry, biology, and computer science.',
    summary: 'Comprehensive survey of 60+ domain-adapted scientific LLMs. Identifies structured context retrieval, mathematical verification, and multi-step symbolic grounding as vital prerequisites for autonomous research assistants.',
    methodology: 'Systematic taxonomic review of model architectures, fine-tuning objectives, scientific benchmarks (PubMedQA, SciQ, ChemProt), and hallucination evaluation frameworks.',
    keyFindings: [
      'General-purpose LLMs achieve high fluency but suffer 18-24% hallucination rates in citation attribution.',
      'Domain-adapted tokenizers reduce token fragmentation for biochemical formulas by 42%.',
      'Chain-of-thought prompting coupled with vector retrieval improves scientific claim verification accuracy.'
    ],
    limitations: [
      'Evaluation metrics remain largely qualitative or proxy-based.',
      'Computational costs prohibit broad reproducibility across academic institutions.',
      'Lack of consensus benchmarks for open-ended hypothesis validation.'
    ],
    dataset: 'SciRepEval, PubMedQA, ArXiv Multi-discipline Corpus',
    model: 'LLaMA-3-Sci, Galactica-30B, ScholarLM',
    status: 'Analyzed',
    citationsCount: 310,
    pdfSize: '5.1 MB',
    addedAt: '2026-03-02'
  },
  {
    id: 'paper-03',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: ['P. Lewis', 'E. Perez', 'A. Piktus', 'F. Petroni', 'V. Karpukhin'],
    year: 2023,
    venue: 'NeurIPS Proceedings',
    doi: '10.5555/3495724.3496517',
    category: 'Natural Language Processing',
    researchArea: 'Dense Retrieval & RAG',
    tags: ['RAG', 'Dense Retrieval', 'Information Retrieval', 'Vector Search'],
    abstract: 'Large pre-trained language models store factual knowledge in their parameters, but their ability to access and precisely manipulate knowledge is still limited. We explore general-purpose fine-tuning recipes for Retrieval-Augmented Generation (RAG)—models which combine pre-trained parametric and non-parametric memory.',
    summary: 'Foundational framework combining dense passage retrieval with seq2seq generation. Shows that non-parametric dense vector indices allow continuous knowledge updates without costly model retraining.',
    methodology: 'DPR (Dense Passage Retriever) coupled with BART generator, optimized end-to-end with marginal likelihood over top-k retrieved passages.',
    keyFindings: [
      'RAG achieves state-of-the-art results on open-domain question answering benchmarks.',
      'Generations are significantly more factual and verifiable through explicit passage pointers.',
      'Parametric memory decay can be bypassed by swapping external document indices.'
    ],
    limitations: [
      'Susceptible to retrieval noise when queries are ambiguous.',
      'Fixed top-k passage truncation limits long-document reasoning synthesis.',
      'Latency overhead introduced by dense vector indexing at inference time.'
    ],
    dataset: 'Natural Questions, TriviaQA, MS-MARCO',
    model: 'DPR + BART-Large',
    status: 'Indexed',
    citationsCount: 2840,
    pdfSize: '2.8 MB',
    addedAt: '2026-03-04'
  },
  {
    id: 'paper-04',
    title: 'Transformer-Based Methods for Scientific Document Summarization: A Multi-Scale Perspective',
    authors: ['E. Cohan', 'I. Cachola', 'D. S. Weld'],
    year: 2024,
    venue: 'Journal of Artificial Intelligence Research (JAIR)',
    doi: '10.1613/jair.1.14201',
    category: 'Natural Language Processing',
    researchArea: 'Document Summarization',
    tags: ['Summarization', 'Transformers', 'Document Analysis', 'Long-Context'],
    abstract: 'Scientific papers represent long, complex documents with high information density, hierarchical section organization, and specialized vocabulary. We propose a hierarchical sparse-attention transformer capable of generating section-level and document-level multi-scale summaries.',
    summary: 'Introduces a hierarchical multi-scale attention network specifically engineered for 15,000+ token academic papers. Evaluates section-specific salience scoring to preserve nuance in methodology and discussion.',
    methodology: 'Hierarchical sparse attention with chunked sliding windows and cross-section global tokens. Benchmarked on arXiv and PubMed long-form summarization datasets.',
    keyFindings: [
      'Explicit hierarchical section modeling improves ROUGE-L scores by 4.3 points over standard flat transformers.',
      'Methodology and Discussion sections require distinct abstraction parameters compared to Introduction.',
      'Reduces GPU memory footprint by 64% using adaptive token routing.'
    ],
    limitations: [
      'Sensitive to non-standard paper formatting and missing header tags.',
      'Extractive-abstractive hybrid leads to occasional stylistic discrepancies between sections.',
      'Requires pre-segmented documents.'
    ],
    dataset: 'arXiv Long-Paper Benchmark, PubMed-100k',
    model: 'Hierarchical Longformer-Sci',
    status: 'Analyzed',
    citationsCount: 189,
    pdfSize: '4.2 MB',
    addedAt: '2026-03-05'
  },
  {
    id: 'paper-05',
    title: 'Contrastive Self-Supervised Learning for Graph Neural Networks in Molecular Property Prediction',
    authors: ['Y. Wang', 'T. Kipf', 'S. Bengio', 'A. Grover'],
    year: 2024,
    venue: 'Nature Machine Intelligence',
    doi: '10.1038/s42256-024-00812-x',
    category: 'Bioinformatics & ChemAI',
    researchArea: 'Bioinformatics & ChemAI',
    tags: ['Graph Neural Networks', 'Drug Discovery', 'Self-Supervised', 'Contrastive Learning'],
    abstract: 'Accurate molecular property prediction is critical for accelerated pharmacological discovery. However, experimental assay data is scarce and expensive. We present MolCL, a multi-view graph contrastive learning framework that captures sub-graph motifs and 3D conformal stereochemistry.',
    summary: 'Employs contrastive self-supervised graph neural networks to pre-train on 10M unlabeled molecular graphs. Demonstrates remarkable transfer performance on blood-brain barrier penetration and toxicity assays.',
    methodology: 'Dual-level contrastive loss optimizing node-level chemical bond embeddings and graph-level scaffold representations using Weisfeiler-Lehman topological augmentations.',
    keyFindings: [
      'Self-supervised pre-training yields 14% improvement in ROC-AUC on low-data downstream drug targets.',
      'Motif-based graph perturbation prevents collapse into trivial planar representations.',
      'Robust to conformational rotations and chirality transformations.'
    ],
    limitations: [
      'High computational overhead for 3D coordinate relaxation.',
      'Limited generalization to large macromolecular complexes (proteins and nucleic acids).',
      'Requires heuristic subgraph filtering.'
    ],
    dataset: 'ZINC15, MoleculeNet (Tox21, HIV, BACE)',
    model: 'MolCL (GNN + Graph Transformer)',
    status: 'Analyzed',
    citationsCount: 215,
    pdfSize: '4.7 MB',
    addedAt: '2026-03-07'
  },
  {
    id: 'paper-06',
    title: 'Physics-Informed Neural Networks for High-Dimensional Climate Dynamics Emulation',
    authors: ['M. Raissi', 'G. E. Karniadakis', 'S. Rasp', 'L. Bretherton'],
    year: 2024,
    venue: 'Geophysical Research Letters',
    doi: '10.1029/2024GL10892',
    category: 'Earth & Climate Sciences',
    researchArea: 'Computational Climate Modeling',
    tags: ['Physics-Informed ML', 'Climate Modeling', 'PDE Solvers', 'Spatiotemporal'],
    abstract: 'Numerical global climate models (GCMs) solve Navier-Stokes and thermodynamic equations at immense supercomputing cost. We design a physics-informed neural operator (PINO) that integrates fluid conservation laws directly into the loss function for sub-seasonal precipitation forecasting.',
    summary: 'Develops a physics-informed neural operator embedding Navier-Stokes conservation laws into loss formulations. Delivers a 450x speedup over numerical PDEs with bounded energy drift.',
    methodology: 'Fourier Neural Operators constrained by Navier-Stokes vorticity and mass conservation differential equations. Trained on ERA5 atmospheric reanalysis data.',
    keyFindings: [
      'Maintains physical consistency over 30-day forecast horizons without unphysical energy divergence.',
      'Inference speedup of 450x compared to traditional finite-element numerical weather prediction models.',
      'Accurately captures extreme convection events in tropical belts.'
    ],
    limitations: [
      'Struggles with chaotic boundary conditions during sudden stratospheric warming events.',
      'Resolution capped at 0.25° grid due to memory constraints.',
      'High sensitivity to gradient pathology during hyperparameter tuning.'
    ],
    dataset: 'ERA5 Reanalysis (1979-2022), NOAA GFS',
    model: 'Physics-Informed Fourier Neural Operator (PINO)',
    status: 'Analyzed',
    citationsCount: 164,
    pdfSize: '6.3 MB',
    addedAt: '2026-03-08'
  },
  {
    id: 'paper-07',
    title: 'Vision-Language Pre-training for Zero-Shot Medical Image Segmentation and Report Grounding',
    authors: ['S. Rajpurkar', 'E. Topol', 'F. Wang', 'A. Ng'],
    year: 2023,
    venue: 'IEEE Transactions on Medical Imaging',
    doi: '10.1109/TMI.2023.3289011',
    category: 'Medical Computer Vision',
    researchArea: 'Medical Computer Vision',
    tags: ['Medical Vision', 'Zero-Shot', 'Multimodal', 'Clinical AI'],
    abstract: 'Annotating medical images requires specialized clinician expertise and is bottlenecked by regulatory constraints. We formulate MedVLP, a vision-language foundation model trained on 1.2M radiograph-report pairs capable of open-vocabulary zero-shot anatomical segmentation.',
    summary: 'A multimodal foundation model trained on radiograph-report pairings capable of zero-shot pathology segmentation. Achieves radiologist-level localization of pneumothorax and cardiomegaly without task-specific tuning.',
    methodology: 'Contrastive vision-language pre-training with text-guided cross-attention mask decoders. Evaluated across MIMIC-CXR and CheXpert datasets.',
    keyFindings: [
      'Zero-shot Dice score reaches 84.1% on thoracic abnormality segmentation.',
      'Direct natural language prompts enable flexible queries without fine-tuning masks.',
      'Cross-attention maps correlate with radiologist eye-tracking heatmaps.'
    ],
    limitations: [
      'Susceptible to linguistic ambiguity in free-text clinical impressions.',
      'Performance drops on rare conditions with under 50 training references.',
      'Demographic bias detected across pediatric vs adult age distributions.'
    ],
    dataset: 'MIMIC-CXR, CheXpert, VinDr-CXR',
    model: 'MedVLP (Swin-Transformer + BioClinicalBERT)',
    status: 'Embedding Ready',
    citationsCount: 420,
    pdfSize: '3.9 MB',
    addedAt: '2026-03-10'
  },
  {
    id: 'paper-08',
    title: 'Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering',
    authors: ['L. B. Smith', 'D. Hendrycks', 'K. Cho', 'J. Weston'],
    year: 2024,
    venue: 'Transactions of the Association for Computational Linguistics (TACL)',
    doi: '10.1162/tacl_a_00619',
    category: 'Natural Language Processing',
    researchArea: 'Scientific Factuality & Alignment',
    tags: ['Hallucination', 'Factuality', 'Evaluation', 'Benchmarking'],
    abstract: 'Hallucinated citations and fictitious numerical claims pose catastrophic risks in scientific AI assistants. This paper presents SciFact-Bench, a diagnostic benchmark for evaluating citation precision, claim entailment, and counterfactual robustness in scientific QA.',
    summary: 'Rigorous empirical benchmark evaluating 8 hallucination mitigation techniques across scientific literature assistants. Demonstrates that citation-grounded constrained decoding reduces fictitious citations by 81%.',
    methodology: 'Adversarial perturbation of scientific claims, counterfactual citation insertion, and multi-annotator fact-checking verification across biology, physics, and computer science.',
    keyFindings: [
      'Post-hoc verification pipelines reduce fictitious citations by 81% compared to greedy decoding.',
      'Self-consistency voting alone does not prevent correlated hallucinations across model families.',
      'Explicit page and section citation grounding improves human expert trust scores from 3.1 to 4.7 out of 5.'
    ],
    limitations: [
      'Verification pipelines increase response latency by approximately 2.4x.',
      'High sensitivity to chunking granularity in source document vectorization.',
      'Benchmarking limited to English-language peer-reviewed journals.'
    ],
    dataset: 'SciFact-Bench (3,500 expert-annotated scientific queries)',
    model: 'FactCheck-LM + Constrained Decoders',
    status: 'Analyzed',
    citationsCount: 96,
    pdfSize: '3.1 MB',
    addedAt: '2026-03-11'
  }
];
