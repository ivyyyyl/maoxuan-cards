import { useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BookOpen, Check, Copy, LoaderCircle, RefreshCcw, Sparkles, X } from 'lucide-react';
import type { MaoQuote } from '../data/quotes';
import { buildDeepPrompt } from '../data/prompt';

interface ResultOverlayProps {
  phase: 'drawing' | 'result';
  quote: MaoQuote | null;
  onAgain: () => void;
  onClose: () => void;
  aiResult: string;
  aiLoading: boolean;
  aiError: string;
  onInterpret: () => void;
}

export function ResultOverlay({
  phase,
  quote,
  onAgain,
  onClose,
  aiResult,
  aiLoading,
  aiError,
  onInterpret,
}: ResultOverlayProps) {
  const [copied, setCopied] = useState(false);
  const prompt = quote ? buildDeepPrompt(quote) : '';
  const aiHtml = useMemo(() => {
    if (!aiResult) return '';
    return DOMPurify.sanitize(marked.parse(aiResult, { async: false }) as string);
  }, [aiResult]);

  const copyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-label="抽牌结果">
      {phase === 'drawing' && (
        <div className="drawing-state">
          <div className="flipping-card">
            <span>问</span>
          </div>
          <p>正在翻牌</p>
        </div>
      )}

      {phase === 'result' && quote && (
        <div className="result-card">
          <button className="icon-btn result-close" onClick={onClose} type="button" aria-label="收起结果">
            <X size={18} />
          </button>
          <div className="result-seal">答</div>
          <p className="result-kicker">遇事不决 · 问毛选</p>
          <blockquote>{quote.text}</blockquote>
          <div className="result-meta">
            <BookOpen size={15} />
            <span>{quote.source}</span>
          </div>
          <div className="result-tags">
            {quote.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="result-detail">
            <h3>原文选段</h3>
            <p className="detail-excerpt">{quote.excerpt}</p>
          </div>
          <div className="result-detail">
            <h3>怎么解读</h3>
            <p>{quote.interpretation}</p>
          </div>
          <div className="result-detail">
            <h3>AI 解读</h3>
            {!aiResult && !aiLoading && (
              <button className="primary-btn ai-btn" onClick={onInterpret} type="button">
                <Sparkles size={17} />
                生成 AI 解读
              </button>
            )}
            {aiLoading && (
              <div className="ai-loading">
                <LoaderCircle size={17} className="spin" />
                正在生成解读
              </div>
            )}
            {aiError && <p className="ai-error">{aiError}</p>}
            {aiResult && <div className="ai-result markdown-body" dangerouslySetInnerHTML={{ __html: aiHtml }} />}
          </div>
          <details className="result-detail is-collapsible">
            <summary>继续深聊</summary>
            <textarea
              className="prompt-box"
              readOnly
              value={prompt}
              rows={7}
              aria-label="深度解读 Prompt"
            />
            <button className="primary-btn copy-btn" onClick={copyPrompt} type="button">
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? '已复制' : '复制 Prompt'}
            </button>
          </details>
          <button className="primary-btn" onClick={onAgain} type="button">
            <RefreshCcw size={17} />
            再问一次
          </button>
        </div>
      )}
    </div>
  );
}
