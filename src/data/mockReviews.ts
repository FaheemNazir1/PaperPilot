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
        title: '1. Introduction & Background',
        content: `Chronic psychological stress is an established catalyst for cardiovascular disorders, immune suppression, and psychiatric morbidities. Conventional clinical diagnostics rely on retrospective psychometric self-reporting scales (e.g., Perceived Stress Scale [PSS]), which inevitably suffer from recall bias, subjective variance, and latency.

The emergence of non-invasive wearable biosensors enables autonomous, real-time physiological telemetry. Signals such as Electrocardiography (ECG), Photoplethysmography (PPG), Electrodermal Activity (EDA), and Respiration (RESP) reflect autonomic nervous system (ANS) tone. Specifically, sympathetic activation induces skin conductance spikes and depresses heart rate variability, whereas parasympathetic rebound restores respiratory sinus arrhythmia [1].

Despite rapid algorithmic progress in neural representation learning, translating controlled laboratory protocols into robust ambulatory systems remains hindered by sensor motion artifacts and subject-dependent physiological baselines [1, 2]. This review presents a critical synthesis of the current state of the art.`
      },
      {
        id: 'sec-2',
        title: '2. Thematic Analysis: Modalities & Fusion Strategies',
        content: `A central theme permeating the surveyed corpus is the categorical limitation of unimodal sensing. Single-channel classifiers consistently report accuracy degradation under physical movement or ambient thermal shifts. Consequently, multimodal sensor fusion represents the prevailing paradigm across all twelve investigated works.

Three distinct architectural themes characterize the literature:
• Early Input-Level Concatenation: Raw time-series or spectrogram representations are fused at the initial network layer. While computationally light, this strategy forces diverse sampling frequencies into an arbitrary shared temporal grid, obscuring transient autonomic reflexes.
• Late Decision-Level Aggregation: Independent neural backbones process individual modalities, combining predictions via learned softmax weighting or Bayesian voting. This isolates channel failures but sacrifices inter-modality cross-correlations [1, 3].
• Intermediate Cross-Modal Attention: The most promising paradigm employs cross-attention mechanisms where ECG temporal representations dynamically query and modulate EDA feature maps [1, 4]. This approach yields an average +6.8% F1-score enhancement over unimodal baselines.`
      },
      {
        id: 'sec-3',
        title: '3. Methodological Comparison across Benchmark Datasets',
        content: `A rigorous comparison of evaluated architectures reveals a pronounced shift from classical Convolutional-Recurrent hybrids (CNN-LSTM) toward sparse hierarchical transformers and neural operators.

On the benchmark WESAD dataset (15 subjects subjected to Trier Social Stress Test regimes):
• CNN-LSTM models achieved 86.4% mean F1-score across 3-class affective states (baseline, stress, amusement) [1].
• Dual-stream cross-attention transformers elevated performance to 94.2% F1-score, driven by synchronized temporal alignment between cardiac and galvanic peaks [1, 4].
• However, when evaluated under strict Leave-One-Subject-Out (LOSO) regimes, reported scores dropped by 14.5% to 22.0%, exposing severe sensitivity to individual basal autonomic variability [1, 5].`
      },
      {
        id: 'sec-4',
        title: '4. Key Findings & Empirical Evidence',
        content: `Synthesizing experimental results across the corpus reveals three core empirical findings:
1. Differential Modality Salience: EDA and ECG collectively account for over 78% of discriminating power under acute cognitive and social evaluative stressors, whereas respiration predominantly aids in disambiguating physical exertion from psychological strain [1].
2. Pre-training Benefits: Graph-based contrastive pre-training and self-supervised representations on unannotated biosignal streams improve downstream task adaptation by up to 14% on small clinical cohorts [3].
3. Grounding & Hallucination Mitigation: When deploying AI literature synthesis copilots to interpret clinical telemetry, post-hoc citation verification pipelines eliminate 81% of ungrounded claim hallucinations [5].`
      },
      {
        id: 'sec-5',
        title: '5. Critical Research Gaps & Vulnerabilities',
        content: `Despite remarkable laboratory metrics, four critical research gaps impede clinical and ecological deployment:
• Limited Dataset Diversity & Demographic Skew: Over 75% of public research relies on young, healthy adult cohorts, leaving pediatric, geriatric, and cardiovascular patient groups completely uncharacterized.
• Cross-Dataset Generalization Failure: Algorithms trained on WESAD experience severe performance drops of 18–35% when tested on independent benchmarks (e.g., DEAP, SWELL-KW) due to unstandardized electrode placements and sampling rates [1, 2].
• Neglect of Embedded Edge Latency: Less than 10% of studies benchmark inference latency, thermal dissipation, or battery consumption on commercial smartwatch microcontrollers.
• Interpretability Deficits: Black-box attention weights do not reliably correlate with clinical causal biomarkers, restricting clinician adoption.`
      },
      {
        id: 'sec-6',
        title: '6. Conclusion & Future Roadmap',
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
