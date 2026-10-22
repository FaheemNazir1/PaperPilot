import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, BookOpen, Bot, FileText, Loader2, Send, Sparkles, User } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useLibrary } from '../contexts/LibraryContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { ChatCitation, MentorMessage } from '../types';

const MAX_MESSAGE_CHARS = 2000;

const SUGGESTIONS = [
  'Explain the methodology of my selected paper in simple terms',
  'What limitations does this paper acknowledge?',
  'Which datasets and evaluation metrics were used?',
  'Compare the methods used in my selected papers',
  'What research gaps do these papers suggest?',
];

const pageLabel = (c: ChatCitation) => (c.pageStart === c.pageEnd ? `p. ${c.pageStart}` : `pp. ${c.pageStart}–${c.pageEnd}`);

const Sources: React.FC<{ citations: ChatCitation[] }> = ({ citations }) => {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Sources</p>
      <ul className="space-y-1.5">
        {citations.map((c) => (
          <li key={c.chunkId} className="text-xs text-zinc-400">
            <details>
              <summary className="cursor-pointer list-none hover:text-zinc-200">
                <span className="font-mono text-accent-400">[{c.ref}]</span> {c.paperTitle} ·{' '}
                <span className="capitalize">{c.section}</span> · {pageLabel(c)}
              </summary>
              <p className="mt-1 ml-5 rounded border border-zinc-800 bg-zinc-950/60 p-2 text-zinc-300 leading-relaxed">
                {c.excerpt}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
};

const MessageBubble: React.FC<{ message: MentorMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const reply = message.reply;
  const note =
    reply && reply.status !== 'answered' && reply.status !== 'refused' && reply.status !== 'clarify'
      ? reply.status === 'no_papers'
        ? 'No papers available'
        : 'Not enough evidence in your papers'
      : null;

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-8 h-8 shrink-0 rounded-full flex items-center justify-center border',
          isUser ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-accent-600/20 border-accent-500/40 text-accent-300',
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          'min-w-0 max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed',
          isUser ? 'bg-accent-600/20 border border-accent-500/30 text-zinc-100' : 'bg-zinc-900/70 border border-zinc-800 text-zinc-200',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <>
            {note && <Badge variant="neutral">{note}</Badge>}
            <div className="mentor-md break-words [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_table]:my-2 [&_table]:text-xs [&_th]:border [&_th]:border-zinc-700 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-zinc-800 [&_td]:px-2 [&_td]:py-1 [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
            {reply && <Sources citations={reply.citations} />}
            {reply && reply.evidence.papersUnavailable.length > 0 && (
              <p className="mt-2 text-xs text-amber-300/90">
                Couldn&apos;t read: {reply.evidence.papersUnavailable.map((p) => `"${p.title}"`).join(', ')}.
              </p>
            )}
            {reply?.status === 'answered' && reply.evidence.papersSearched.length > 0 && (
              <p className="mt-2 text-[11px] text-zinc-500">
                Searched {reply.evidence.papersSearched.length} paper{reply.evidence.papersSearched.length === 1 ? '' : 's'}
                {reply.model ? ` · ${reply.model}` : ''}. Check important claims against the sources.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const AssistantPage: React.FC = () => {
  const { papers, status: libraryStatus } = useLibrary();
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const selectedTitles = useMemo(() => papers.filter((p) => selected.has(p.id)).map((p) => p.title), [papers, selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMessage: MentorMessage = { id: `u-${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setSending(true);
    try {
      const reply = await api.chat(content, selected.size > 0 ? Array.from(selected) : undefined, history);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply.answer, reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The Research Mentor could not answer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-100">
          <Sparkles className="w-5 h-5 text-accent-400" aria-hidden="true" />
          Research Mentor
          <Badge variant="neutral">Experimental</Badge>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ask about your uploaded papers, research methods and literature surveys. Answers are grounded in your own
          papers and cite their sources. Unrelated questions are declined.
        </p>
      </div>

      <Card variant="subtle" className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            Papers to use
          </span>
          <span className="text-[11px] text-zinc-500">
            {selected.size === 0 ? 'None selected: searches up to 8 of your papers' : `${selected.size} selected`}
          </span>
        </div>
        {libraryStatus === 'loading' ? (
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading your library…
          </p>
        ) : papers.length === 0 ? (
          <p className="text-xs text-zinc-400">
            You have no uploaded papers yet.{' '}
            <Link to="/upload" className="text-accent-400 hover:underline">
              Upload a paper
            </Link>{' '}
            to get answers grounded in its text.
          </p>
        ) : (
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {papers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={selected.has(p.id)}
                title={p.title}
                className={cn(
                  'inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  selected.has(p.id)
                    ? 'border-accent-500/60 bg-accent-600/20 text-accent-200'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
                )}
              >
                <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="w-8 h-8 text-zinc-600" aria-hidden="true" />
            <p className="max-w-md text-sm text-zinc-400">
              Select one or more papers above, then ask a research question. Try one of these:
            </p>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  disabled={sending}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-accent-500/50 hover:text-white disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-zinc-400" role="status">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {selectedTitles.length > 0 ? 'Reading your selected papers…' : 'Reading your papers…'}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Ask about a paper, a method, or your literature survey…"
          aria-label="Message the Research Mentor"
          className="min-h-[3rem] flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500/60 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
        <Button type="submit" variant="primary" isLoading={sending} disabled={sending || !input.trim()} leftIcon={!sending ? <Send className="w-4 h-4" aria-hidden="true" /> : undefined}>
          Send
        </Button>
      </form>
    </div>
  );
};
