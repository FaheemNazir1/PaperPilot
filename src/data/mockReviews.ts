import { LiteratureReview } from '../types';

export const mockReviews: LiteratureReview[] = [
  {
    id: 'rev-01',
    title: 'Multimodal Sensor Fusion and Deep Representation Learning in Physiological Stress Detection: A Systematic Review',
    topic: 'Multimodal Physiological Stress Detection & Affective Computing',
    abstract: 'Continuous, objective assessment of physiological stress has emerged as a cornerstone of preventive healthcare and affective human-computer interaction. While unimodal biosignals suffer from motion artifacts and baseline drift, recent literature leverages deep multimodal neural architectures and cross-modal attention mechanisms. This systematic review synthesizes findings across twelve peer-reviewed studies (2020–2024), establishing a taxonomy of sensor fusion paradigms, comparing benchmark classification performances, and identifying pivotal research gaps regarding cohort diversity and edge latency.',
    reviewStyle: 'IEEE',
    length: 'Medium',
    focusAreas: ['Methods', 'Results', 'Limitations', 'Research Gaps'],
    paperCount: 12,
    paperIds: ['paper-01', 'paper-04', 'paper-08'],
    generatedAt: '2026-03-12',
    researchGapsSummary: [
      'Severe cohort homogeneity: Over 75% of public benchmarks draw solely from university students aged 19-27.',
      'Out-of-distribution evaluation drop: Performance plummets by up to 22% during Leave-One-Subject-Out (LOSO) cross-dataset splits.',
      'Lack of real-time embedded benchmarking: Multi-branch attention networks remain untested on microcontrollers with sub-15ms budgets.'
    ],
    sections: [
      {
        id: 'sec-1',
        title: '1. Overview & Introduction',
        content: `Chronic psychological stress is an established catalyst for cardiovascular disorders, immune suppression, and psychiatric morbidities. Conventional clinical diagnostics rely on retrospective psychometric self-reporting scales (e.g., Perceived Stress Scale [PSS]), which inevitably suffer from recall bias, subjective variance, and latency.

The emergence of non-invasive wearable biosensors enables autonomous, real-time physiological telemetry. Signals such as Electrocardiography (ECG), Photoplethysmography (PPG), Electrodermal Activity (EDA), and Respiration (RESP) reflect autonomic nervous system (ANS) tone. Specifically, sympathetic activation induces skin conductance spikes and depresses heart rate variability, whereas parasympathetic rebound restores respiratory sinus arrhythmia [1].

Despite rapid algorithmic progress in neural representation learning, translating controlled laboratory protocols into robust ambulatory systems remains hindered by sensor motion artifacts and subject-dependent physiological baselines [1, 2]. This review presents a critical synthesis of the current state of the art.`
      },
      {
        id: 'sec-2',
        title: '2. Surveyed Methodologies',
        content: `Three primary methodological paradigms dominate the literature:
• Multimodal Early Fusion: Concatenating normalized temporal sensor channels at the input layer into 1D convolutional filter banks. While computationally lightweight for microcontrollers, it imposes a rigid temporal alignment across disparate sampling rates [1].
• Hierarchical Cross-Modal Attention: Employing query-key-value self-attention where ECG autonomic features dynamically attend to electrodermal arousal spikes [1, 4]. This cross-attention mechanism achieves the highest reported classification stability, yielding a +6.8% F1-score improvement over unimodal baselines.
• Contrastive Self-Supervised Graph Representations: Constructing topological graph representations of cardiac intervals and autonomic co-activations to pre-train backbones on unlabeled physiological data [3].`
      },
      {
        id: 'sec-3',
        title: '3. Benchmark Datasets & Cohort Characteristics',
        content: `Empirical evaluations across the surveyed literature primarily rely on four canonical open-source physiological corpora:
• WESAD (Wearable Stress and Affect Detection): 15 subjects monitored via wrist and chest sensors during Trier Social Stress Tests (TSST), amusement, and meditation baselines [1].
• DEAP (Database for Emotion Analysis using Physiological Signals): 32 participants reacting to affective audiovisual stimuli with 32-channel EEG and peripheral biosignals [2].
• SWELL-KW: 25 office knowledge workers subjected to cognitive workload manipulations (email interruptions and time pressure) [1].
• MIMIC-III / PhysioNet Challenge: Clinical ICU high-resolution waveform recordings for acute autonomic decompensation benchmark validation [5].`
      },
      {
        id: 'sec-4',
        title: '4. Key Empirical Findings',
        content: `Synthesizing experimental results across the corpus reveals three core empirical findings:
1. Differential Modality Salience: EDA and ECG collectively account for over 78% of discriminating power under acute cognitive and social evaluative stressors, whereas respiration predominantly aids in disambiguating physical exertion from psychological strain [1].
2. Attention-Based Robustness: Attention-guided feature fusion reduces motion artifact misclassifications by 31% compared to static late concatenation [1, 4].
3. Pre-training Benefits: Graph-based contrastive pre-training and self-supervised representations on unannotated biosignal streams improve downstream task adaptation by up to 14% on small clinical cohorts [3].`
      },
      {
        id: 'sec-5',
        title: '5. Contradictions & Methodological Differences',
        content: `Significant discrepancies emerge when evaluating subject-dependent versus subject-independent protocols:
• Intra-subject vs. Inter-subject Validation: Studies employing random k-fold cross-validation report optimistic accuracies exceeding 94%. However, when evaluated under strict Leave-One-Subject-Out (LOSO) regimes, reported scores drop by 14.5% to 22.0%, exposing severe sensitivity to individual basal autonomic variability [1, 5].
• Signal Pre-filtering Controversy: While early studies advocate aggressive bandpass filtering and wavelet denoising, recent deep transformer literature demonstrates that raw, unfiltered waveforms with temporal dropout yield superior generalizability across unseen sensor hardware [4].`
      },
      {
        id: 'sec-6',
        title: '6. Reported Limitations',
        content: `Across the analyzed literature, authors consistently acknowledge several structural limitations:
• Lack of Ecological Validity: Laboratory-induced stressors (mental arithmetic, public speaking) fail to mirror the chronic, low-intensity stressors characteristic of daily workplace environments [1, 2].
• Demographic Homogeneity: Cohorts remain overwhelmingly biased toward university students aged 19–27, leaving pediatric, geriatric, and hypertensive patient groups underrepresented [1].
• Sensor Drift & Motion Artifacts: Physical movement during ambulatory activities introduces high-amplitude artifacts that corrupt PPG and EDA baseline conductance measurements [1, 3].`
      },
      {
        id: 'sec-7',
        title: '7. Unaddressed Research Gaps',
        content: `Synthesizing limitations and cross-study differences highlights four critical research gaps:
1. Multi-Center Standardization Gap: Lack of standardized electrode placements and sampling frequencies across open datasets severely limits cross-corpus validation.
2. Edge Latency and Computational Budget: Fewer than 10% of surveyed studies benchmark inference latency, thermal dissipation, or battery consumption on commercial smartwatch microcontrollers.
3. Adaptive Subject Calibration: Absence of few-shot or online domain adaptation methods that can calibrate to a new user's physiological baseline within 5 minutes of wear.
4. Clinician-Centric Interpretability: Black-box neural representations fail to map to standard clinical autonomic indices (e.g., LF/HF ratio, SDNN), restricting diagnostic trust.`
      },
      {
        id: 'sec-8',
        title: '8. Conclusion & Future Roadmap',
        content: `Multimodal physiological stress detection has achieved algorithmic maturity in controlled settings, proving that intermediate cross-attention fusion definitively surpasses unimodal telemetry. However, the subsequent frontier of research requires a decisive pivot from marginal model tweaking to resolving foundational dataset distribution shifts.

Subsequent investigations should prioritize: (1) self-supervised domain adaptation to eliminate subject-specific calibration overhead; (2) open-source multi-center benchmark standardization; and (3) integer quantization for sub-15ms edge deployment on wearable biomedical hardware.`
      }
    ],
    references: [
      {
        citationId: '[1]',
        text: 'K. Schmidt, A. Reiss, R. Duerichen, and C. Van Laerhoven, "Deep Learning Approaches for Multimodal Stress Detection," IEEE Trans. Biomed. Eng., vol. 70, no. 6, pp. 1820–1831, 2023.',
        paperId: 'paper-01',
        title: 'Deep Learning Approaches for Multimodal Stress Detection',
        authors: 'K. Schmidt et al.',
        year: 2023
      },
      {
        citationId: '[2]',
        text: 'P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," in Proc. NeurIPS, 2023, pp. 9459–9474.',
        paperId: 'paper-03',
        title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
        authors: 'P. Lewis et al.',
        year: 2023
      },
      {
        citationId: '[3]',
        text: 'H. Zhang, J. Chen, M. Lin, and R. Sutton, "A Survey of Large Language Models for Scientific Research: Architectures and Reasoning," ACM Comput. Surv., vol. 56, no. 4, pp. 1–38, 2024.',
        paperId: 'paper-02',
        title: 'A Survey of Large Language Models for Scientific Research',
        authors: 'H. Zhang et al.',
        year: 2024
      },
      {
        citationId: '[4]',
        text: 'E. Cohan, I. Cachola, and D. S. Weld, "Transformer-Based Methods for Scientific Document Summarization: A Multi-Scale Perspective," J. Artif. Intell. Res., vol. 79, pp. 412–448, 2024.',
        paperId: 'paper-04',
        title: 'Transformer-Based Methods for Scientific Document Summarization',
        authors: 'E. Cohan et al.',
        year: 2024
      },
      {
        citationId: '[5]',
        text: 'L. B. Smith, D. Hendrycks, K. Cho, and J. Weston, "Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering," Trans. Assoc. Comput. Linguist., vol. 12, pp. 245–261, 2024.',
        paperId: 'paper-08',
        title: 'Benchmarking Hallucination Mitigation Strategies in Scientific QA',
        authors: 'L. B. Smith et al.',
        year: 2024
      }
    ]
  },
  {
    id: 'rev-02',
    title: 'Grounded Retrieval-Augmented Generation and Hallucination Mitigation in Academic Workspaces',
    topic: 'Large Language Models & Scientific Verification',
    abstract: 'Hallucination of citations and numerical claims in LLM-assisted scientific literature review poses catastrophic risks. This review examines dense bi-encoder architectures, section-grounded vector indices, and constrained decoding recipes that reduce attribution errors while maintaining fluency.',
    reviewStyle: 'ACM',
    length: 'Comprehensive',
    focusAreas: ['Methods', 'Results', 'Research Gaps'],
    paperCount: 16,
    paperIds: ['paper-02', 'paper-03', 'paper-08'],
    generatedAt: '2026-03-09',
    researchGapsSummary: [
      'Tokenization fragmentation for IUPAC chemical formulas and mathematical expressions.',
      'Latency overhead of multi-stage claim verification loops during interactive chat.',
      'Absence of unified human-expert benchmarks for long-form multi-paper synthesis.'
    ],
    sections: [
      {
        id: 'sec-1',
        title: '1. Introduction',
        content: 'Large Language Models (LLMs) possess vast parametric encyclopedic knowledge but struggle with temporal obsolescence and catastrophic hallucinations when applied to specialized scientific domains [2]. Grounded retrieval-augmented generation represents the critical foundation for trustworthy literature assistants.'
      },
      {
        id: 'sec-2',
        title: '2. Dense Retrieval Architectures in Scientific Corpus Mining',
        content: 'Dense bi-encoder retrieval architectures map specialized domain terminology into dense vector manifolds, allowing semantic nearest-neighbor retrieval that fundamentally surpasses keyword BM25 baselines [2, 3]. Post-hoc constrained decoders further ensure that every generated sentence directly cites indexed passages [5].'
      }
    ],
    references: [
      {
        citationId: '[1]',
        text: 'P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," NeurIPS, 2023.',
        paperId: 'paper-03',
        title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
        authors: 'P. Lewis et al.',
        year: 2023
      },
      {
        citationId: '[2]',
        text: 'L. B. Smith, D. Hendrycks, K. Cho, and J. Weston, "Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering," TACL, 2024.',
        paperId: 'paper-08',
        title: 'Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering',
        authors: 'L. B. Smith et al.',
        year: 2024
      }
    ]
  }
];
