import type { MaoQuote } from '../data/quotes';

interface CardFanProps {
  quotes: MaoQuote[];
  rotation: number;
  disabled: boolean;
  onSelect: (index: number) => void;
}

function shortestDelta(angle: number): number {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

export function CardFan({ quotes, rotation, disabled, onSelect }: CardFanProps) {
  if (quotes.length === 0) {
    return <div className="card-fan card-fan-empty">牌库已空，点击重置</div>;
  }

  const step = 360 / quotes.length;

  return (
    <div className={`card-fan ${disabled ? 'is-disabled' : ''}`}>
      <div
        className="ring"
        style={{
          transform: `translateY(var(--ring-lift)) rotateX(var(--ring-tilt)) rotateY(${rotation}deg)`,
        }}
      >
        {quotes.map((quote, index) => {
          const base = index * step;
          const relative = shortestDelta(base + rotation);
          const focus = 1 - Math.min(Math.abs(relative) / 110, 1);
          const scale = 0.82 + focus * 0.32;
          const opacity = 0.26 + focus * 0.74;
          const zLift = focus * 52;
          const isActive = Math.abs(relative) <= step / 2;
          return (
            <button
              key={quote.id}
              className={`fan-card ${isActive ? 'is-active' : ''}`}
              style={{
                transform: `rotateY(${base}deg) translateZ(var(--ring-radius)) translateZ(${zLift}px) scale(${scale})`,
                opacity,
              }}
              onClick={() => onSelect(index)}
              type="button"
              aria-label={`选择第 ${index + 1} 张卡片：${quote.text}`}
              aria-pressed={isActive}
              disabled={disabled}
            >
              <span className="card-face-back">
                <span className="card-seal">问</span>
                <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="card-rule" />
                <span className="card-tag">{quote.tags[0]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
