import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import { ChatMessageItem } from '../components/assistant/ChatMessageItem';
import { CitationDrawer } from '../components/assistant/CitationDrawer';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ChatMessage, CitationItem } from '../types';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

export const AssistantPage: React.FC = () => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Exact suggested questions as requested in Section 10
  const suggestedQuestions = [
    "What methods are most common?",
    "What datasets are being used?",
    "What limitations appear repeatedly?",
    "What research gaps can you identify?"
  ];

  useEffect(() => {
    async function loadChat() {
      const history = await api.getChatHistory();
      setMessages(history);
    }
    loadChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Generate topic-tailored realistic scientific answer with citations
  const generateMockAnswer = (query: string): ChatMessage => {
    const lower = query.toLowerCase();

    if (lower.includes('dataset')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Based on your 12 indexed research papers, the primary benchmark datasets utilized across studies include:

1. **WESAD (Wearable Stress and Affect Detection)**: 15 subjects evaluated for 3-class stress and affect detection with high-resolution ECG, EDA, and Respiration signals [Paper 01, p. 3].
2. **PubMedQA & SciRepEval**: 60,000+ scientific QA passages evaluating biomedical reasoning and claim verification in domain-adapted LLMs [Paper 02, p. 8].
3. **MIMIC-CXR & CheXpert**: Over 1.2 million chest radiograph and clinical report pairs utilized for zero-shot pathology segmentation [Paper 07, p. 5].
4. **ERA5 Global Reanalysis**: Spatiotemporal meteorological variables over a 43-year baseline evaluated for Navier-Stokes physics-informed neural operators [Paper 06, p. 4].

Key observation: Over 65% of evaluated papers report that in-distribution accuracy degrades sharply when testing across alternate dataset splits.`,
        citations: [
          {
            id: `cit-${Date.now()}-1`,
            citationLabel: '[Paper 01, p. 3]',
            paperId: 'paper-01',
            paperTitle: 'Deep Learning Approaches for Multimodal Stress Detection',
            page: 3,
            excerpt: 'The WESAD benchmark provides continuous chest-worn and wrist-worn sensor recordings across 15 subjects subjected to laboratory mental arithmetic and public speaking stressors.',
            confidence: '99.1% Grounding Confidence'
          },
          {
            id: `cit-${Date.now()}-2`,
            citationLabel: '[Paper 07, p. 5]',
            paperId: 'paper-07',
            paperTitle: 'Vision-Language Pre-training for Zero-Shot Medical Image Segmentation',
            page: 5,
            excerpt: 'Training on MIMIC-CXR pairs enables promptable zero-shot segmentation of cardiomegaly matching clinician performance.',
            confidence: '98.5% Grounding Confidence'
          }
        ],
        suggestedFollowUps: [
          'Compare sample sizes between WESAD and MIMIC-CXR.',
          'Which dataset exhibits the highest class imbalance?',
          'What pre-processing steps are used for WESAD?'
        ]
      };
    }

    if (lower.includes('limitation') || lower.includes('gap')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Cross-analyzing the Limitations and Discussion sections across your workspace, four recurring constraints emerge:

• **Demographic & Cohort Homogeneity**: In biomedical studies, cohorts are restricted to healthy young university students (e.g., WESAD N=15), failing to generalize to clinical or elderly populations [Paper 01, p. 11].
• **Cross-Dataset Generalization Failure**: Authors observe severe performance drops (18% to 35%) when evaluating models on external independent datasets without retraining [Paper 02, p. 14].
• **Edge Compute & Real-Time Latency**: Less than 10% of studies benchmark inference latency or memory consumption on embedded edge microcontrollers [Paper 06, p. 9].
• **Bibliographic Attribution Errors**: Generative models exhibit up to 22.4% hallucination in unconstrained literature generation without post-hoc verification [Paper 08, p. 9].`,
        citations: [
          {
            id: `cit-${Date.now()}-1`,
            citationLabel: '[Paper 01, p. 11]',
            paperId: 'paper-01',
            paperTitle: 'Deep Learning Approaches for Multimodal Stress Detection',
            page: 11,
            excerpt: 'A salient limitation of this study is the controlled laboratory environment. Naturalistic stress triggers exhibit non-stationary baseline fluctuations that are absent in artificial arithmetic stressors.',
            confidence: '99.4% Grounding Confidence'
          },
          {
            id: `cit-${Date.now()}-2`,
            citationLabel: '[Paper 08, p. 9]',
            paperId: 'paper-08',
            paperTitle: 'Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering',
            page: 9,
            excerpt: 'Greedy autoregressive decoding resulted in hallucinated bibliographic citations in 22.4% of scientific answers. Constrained decoding over verified vector chunks reduced this to 3.8%.',
            confidence: '98.8% Grounding Confidence'
          }
        ],
        suggestedFollowUps: [
          'How do authors propose mitigating hallucinated citations?',
          'Export these research gaps as thesis topics.',
          'Which papers evaluate cross-dataset validation?'
        ]
      };
    }

    // Default rich response
    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Across the 12 analyzed papers in your workspace regarding "${query}":

1. **Transformer Attention as the Unified Backbone**:
   Multi-head self-attention and cross-modal attention mechanisms appear in 75% of papers, outperforming traditional CNN-LSTM and planar graph baselines [Paper 01, p. 4] [Paper 04, p. 7].

2. **Grounded Retrieval & Verification**:
   Non-parametric vector indexing coupled with post-hoc verification pipelines reduces citation hallucinations by 81% across scientific benchmarks [Paper 03, p. 4] [Paper 08, p. 7].

3. **Multi-Scale Feature Salience**:
   Combining temporal and hierarchical representation learning consistently yields statistically significant gains in classification F1 and ROUGE metrics.`,
      citations: [
        {
          id: `cit-${Date.now()}-1`,
          citationLabel: '[Paper 01, p. 4]',
          paperId: 'paper-01',
          paperTitle: 'Deep Learning Approaches for Multimodal Stress Detection',
          page: 4,
          excerpt: 'We observe that intermediate cross-attention fusion between ECG and EDA representations yields a statistically significant 6.8% increase in F1-score over baseline concatenate-and-classify strategies.',
          confidence: '99.0% Grounding Confidence'
        },
        {
          id: `cit-${Date.now()}-2`,
          citationLabel: '[Paper 04, p. 7]',
          paperId: 'paper-04',
          paperTitle: 'Transformer-Based Methods for Scientific Document Summarization',
          page: 7,
          excerpt: 'Hierarchical sparse attention mechanisms demonstrate superior parameter efficiency, reducing global memory complexity from quadratic O(N²) to linear O(N) while preserving cross-section methodological context.',
          confidence: '98.2% Grounding Confidence'
        }
      ],
      suggestedFollowUps: [
        'What datasets were used in Paper 01 and Paper 04?',
        'What are the open research challenges in these papers?',
        'Summarize the computational complexity of these approaches.'
      ]
    };
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query.trim()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    setTimeout(() => {
      const response = generateMockAnswer(query);
      setMessages((prev) => [...prev, response]);
      setIsSending(false);
      showToast('Grounded answer retrieved with source citations', 'info');
    }, 650);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-accent-400" />
            <span>PaperPilot AI</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ask questions about your research library. Grounded citations with verbatim page references.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm" className="font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1" />
            12 Papers in Context
          </Badge>
        </div>
      </div>

      {/* Suggested Questions Chips */}
      <div className="py-3 flex flex-wrap gap-1.5 shrink-0 overflow-x-auto custom-scrollbar">
        <span className="text-[11px] font-mono text-zinc-500 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-accent-400" />
          Suggested:
        </span>
        {suggestedQuestions.map((question, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(question)}
            className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-all truncate"
          >
            {question}
          </button>
        ))}
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4 pr-1">
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            onCitationClick={(cit) => setActiveCitation(cit)}
            onFollowUpClick={(prompt) => handleSend(prompt)}
          />
        ))}

        {isSending && (
          <div className="flex gap-3 sm:gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-850 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-accent-600/20 border border-accent-500/30 flex items-center justify-center text-accent-400">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="text-xs text-accent-300 font-mono">
                Searching vector index and retrieving passage citations...
              </div>
              <div className="h-3 bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar - Fixed at Bottom */}
      <div className="pt-3 border-t border-zinc-800/80 shrink-0">
        <div className="relative bg-zinc-900/90 border border-zinc-800 focus-within:border-accent-500/50 rounded-xl p-2 transition-all shadow-lg">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your papers... (e.g., What methods are most common?)"
            rows={2}
            className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none px-2 py-1 leading-relaxed font-sans"
          />

          <div className="flex items-center justify-between pt-2 px-2 border-t border-zinc-800/50">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
              <span>Press <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">Enter ↵</kbd> to send</span>
              <span>•</span>
              <span className="hidden sm:inline">Semantic RAG Grounding</span>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={!inputText.trim() || isSending}
              onClick={() => handleSend()}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Citation Excerpt Preview Drawer/Modal */}
      <CitationDrawer
        citation={activeCitation}
        isOpen={!!activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
};
