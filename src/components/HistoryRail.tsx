import { useState } from 'react';
import { History, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { MaoQuote } from '../data/quotes';

interface HistoryRailProps {
  history: MaoQuote[];
}

export function HistoryRail({ history }: HistoryRailProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        className="history-rail is-collapsed"
        onClick={() => setCollapsed(false)}
        type="button"
        aria-label="展开抽牌记录"
      >
        <PanelLeftOpen size={16} />
        <span className="collapsed-count">{history.length}</span>
      </button>
    );
  }

  return (
    <section className={`history-rail ${history.length === 0 ? 'is-empty' : ''}`} aria-label="已抽取记录">
      <div className="history-heading">
        <History size={16} />
        <span>已问 {history.length} 次</span>
        <button className="collapse-btn" onClick={() => setCollapsed(true)} type="button" aria-label="收起抽牌记录">
          <PanelLeftClose size={15} />
        </button>
      </div>
      {history.length === 0 ? (
        <p className="history-placeholder">抽到的语录会留在这里</p>
      ) : (
        <div className="history-list">
          {[...history].reverse().map((quote, index) => (
            <div className="history-item" key={`${quote.id}-${index}`}>
              <span className="history-number">{String(history.length - index).padStart(2, '0')}</span>
              <span className="history-text">{quote.text}</span>
              <span className="history-source">{quote.source.split('（')[0]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
