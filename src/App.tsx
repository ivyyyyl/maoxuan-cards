import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  MousePointerClick,
  RotateCcw,
} from 'lucide-react';
import { CameraStage } from './components/CameraStage';
import { CardFan } from './components/CardFan';
import { ResultOverlay } from './components/ResultOverlay';
import { HistoryRail } from './components/HistoryRail';
import { QUOTES, shuffleQuotes, type MaoQuote } from './data/quotes';
import { askDeepSeek } from './api/deepseek';
import { buildAiMessages } from './data/prompt';
import { useHandsCamera } from './hooks/useHandsCamera';
import type { GestureEvent } from './engine/gestures';

type Phase = 'playing' | 'drawing' | 'result';

function App() {
  const [initialDeck] = useState(() => shuffleQuotes(QUOTES));
  const [deck, setDeck] = useState(() => initialDeck.slice(28));
  const [hand, setHand] = useState(() => initialDeck.slice(0, 28));
  const [phase, setPhase] = useState<Phase>('playing');
  const [drawnQuote, setDrawnQuote] = useState<MaoQuote | null>(null);
  const [history, setHistory] = useState<MaoQuote[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'gesture' | 'mouse'>('gesture');
  const [ringOffset, setRingOffset] = useState(0);
  const didInitCameraRef = useRef(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const toastTimerRef = useRef<number>(0);
  const handRef = useRef(hand);
  const deckRef = useRef(deck);
  const ringOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const lastPalmRef = useRef<{ x: number; y: number } | null>(null);
  const movingRef = useRef(false);

  useEffect(() => {
    handRef.current = hand;
  }, [hand]);

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  const normalizeIndex = useCallback((value: number, length = handRef.current.length) => {
    if (length <= 0) return 0;
    return ((value % length) + length) % length;
  }, []);

  const setActiveIndexValue = useCallback((index: number) => {
    const normalized = normalizeIndex(index);
    ringOffsetRef.current = normalized;
    setRingOffset(normalized);
    velocityRef.current = 0;
  }, [normalizeIndex]);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 900);
  }, []);

  const goNext = useCallback(() => {
    if (handRef.current.length === 0) return;
    setActiveIndexValue(ringOffsetRef.current + 1);
    showToast('左划 · 下一张');
  }, [setActiveIndexValue, showToast]);

  const goPrev = useCallback(() => {
    if (handRef.current.length === 0) return;
    setActiveIndexValue(ringOffsetRef.current - 1);
    showToast('右划 · 上一张');
  }, [setActiveIndexValue, showToast]);

  const drawCard = useCallback(() => {
    if ((phase !== 'playing' && phase !== 'result') || handRef.current.length === 0) return;
    const activeIndex = Math.round(ringOffsetRef.current);
    const quote = handRef.current[activeIndex];
    setDrawnQuote(quote);
    setPhase('drawing');
    window.setTimeout(() => {
      const nextHand = handRef.current.filter((item) => item.id !== quote.id);
      let nextDeck = deckRef.current;
      if (nextDeck.length > 0) {
        nextHand.push(nextDeck[0]);
        nextDeck = nextDeck.slice(1);
      }
      setHand(nextHand);
      setDeck(nextDeck);
      setHistory((prev) => [...prev, quote]);
      ringOffsetRef.current = normalizeIndex(Math.round(ringOffsetRef.current), nextHand.length);
      setRingOffset(ringOffsetRef.current);
      setAiResult('');
      setAiError('');
      setPhase('result');
    }, 1350);
  }, [normalizeIndex, phase]);

  const closeResult = useCallback(() => {
    setPhase('playing');
    setDrawnQuote(null);
    setAiResult('');
    setAiError('');
  }, []);

  const resetGame = useCallback(() => {
    const reshuffled = shuffleQuotes(QUOTES);
    setHand(reshuffled.slice(0, 28));
    setDeck(reshuffled.slice(28));
    ringOffsetRef.current = 0;
    setRingOffset(0);
    velocityRef.current = 0;
    lastPalmRef.current = null;
    movingRef.current = false;
    setHistory([]);
    setDrawnQuote(null);
    setAiResult('');
    setAiError('');
    setPhase('playing');
    setToast(null);
  }, []);

  const handlePalm = useCallback(
    (palm: { x: number; y: number } | null) => {
      if (inputMode !== 'gesture' || phase !== 'playing') {
        lastPalmRef.current = null;
        movingRef.current = false;
        return;
      }
      if (!palm) {
        lastPalmRef.current = null;
        movingRef.current = false;
        return;
      }
      if (lastPalmRef.current) {
        const dx = palm.x - lastPalmRef.current.x;
        const moving = Math.abs(dx) > 0.002;
        movingRef.current = moving;
        if (moving) {
          const length = handRef.current.length || 1;
          const next = normalizeIndex(ringOffsetRef.current - dx * 16, length);
          ringOffsetRef.current = next;
          setRingOffset(next);
          velocityRef.current = -dx * 16;
        }
      }
      lastPalmRef.current = palm;
    },
    [inputMode, normalizeIndex, phase],
  );

  const handleGesture = useCallback(
    (event: GestureEvent) => {
      if (phase !== 'playing' || inputMode !== 'gesture') return;
      if (event === 'pinch') drawCard();
    },
    [drawCard, inputMode, phase],
  );

  const interpretQuote = useCallback(async () => {
    if (!drawnQuote || aiLoading) return;
    setAiLoading(true);
    setAiError('');
    setAiResult('');
    try {
      const content = await askDeepSeek(buildAiMessages(drawnQuote));
      setAiResult(content);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 解读失败');
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, drawnQuote]);

  const camera = useHandsCamera(handleGesture, handlePalm);

  useEffect(() => {
    if (didInitCameraRef.current || inputMode !== 'gesture') return;
    didInitCameraRef.current = true;
    void camera.start();
  }, [camera, inputMode]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (!movingRef.current && Math.abs(velocityRef.current) > 0.006) {
        const length = handRef.current.length || 1;
        const next = normalizeIndex(ringOffsetRef.current + velocityRef.current, length);
        ringOffsetRef.current = next;
        setRingOffset(next);
        velocityRef.current *= 0.92;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [normalizeIndex]);

  const switchInputMode = useCallback(
    (mode: 'gesture' | 'mouse') => {
      setInputMode(mode);
      if (mode === 'mouse') {
        camera.stop();
      } else if (camera.status === 'idle' || camera.status === 'error') {
        void camera.start();
      }
    },
    [camera],
  );

  useEffect(() => {
    if (camera.status === 'error' && inputMode === 'gesture') {
      setInputMode('mouse');
    }
  }, [camera.status, inputMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
      else if (event.key === 'Home') setActiveIndexValue(0);
      else if (event.key === 'End') setActiveIndexValue(handRef.current.length - 1);
      else if (event.key >= '1' && event.key <= '9') {
        setActiveIndexValue(Number(event.key) - 1);
      }
      else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        drawCard();
      } else if (event.key === 'Escape' && phase === 'result') {
        closeResult();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeResult, drawCard, goNext, goPrev, phase, setActiveIndexValue]);

  const activeIndex = Math.round(ringOffset);
  const activeQuote = hand[activeIndex] ?? null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="masthead">
          <span className="masthead-seal">问</span>
          <div>
            <p className="title-kicker">THE ORACLE OF MAO</p>
            <h1>遇事不决问毛选</h1>
            <p className="sub">掌心一张牌，答案自己来</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="mode-switch" role="group" aria-label="输入模式">
            <button
              className={inputMode === 'gesture' ? 'is-active' : ''}
              onClick={() => switchInputMode('gesture')}
              type="button"
            >
              <Hand size={15} />
              手势
            </button>
            <button
              className={inputMode === 'mouse' ? 'is-active' : ''}
              onClick={() => switchInputMode('mouse')}
              type="button"
            >
              <MousePointerClick size={15} />
              鼠标
            </button>
          </div>
          <button className="icon-btn" onClick={resetGame} type="button" aria-label="重置牌库">
            <RotateCcw size={17} />
          </button>
        </div>
      </header>

      <main className="ring-stage">
        <div className="ring-heading">
          <p className="deck-eyebrow">牌库余 {deck.length + hand.length} 张</p>
          <h2>转动命运之轮，收拢抽牌</h2>
        </div>
        <CardFan
          quotes={hand}
          rotation={-ringOffset * (360 / (hand.length || 1))}
          disabled={phase !== 'playing'}
          onSelect={(index) => {
            setActiveIndexValue(index);
            showToast(`已选第 ${index + 1} 张`);
          }}
        />
        <div className="ring-controls">
          <button
            className="icon-btn"
            onClick={goPrev}
            type="button"
            aria-label="上一张"
            disabled={phase !== 'playing'}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="primary-btn draw-btn"
            onClick={drawCard}
            type="button"
            disabled={phase !== 'playing' || !activeQuote}
          >
            <Hand size={17} />
            抽牌
          </button>
          <button
            className="icon-btn"
            onClick={goNext}
            type="button"
            aria-label="下一张"
            disabled={phase !== 'playing'}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="fallback-note">
          <MousePointerClick size={15} />
          <span>点击牌面、方向键或数字键选牌，回车抽牌</span>
        </div>
      </main>

      {inputMode === 'gesture' && (
        <CameraStage
          compact
          status={camera.status}
          errorMessage={camera.errorMessage}
          phase={camera.phase}
          handPresent={camera.handPresent}
          pinchActive={camera.pinchActive}
          mode={inputMode}
          videoRef={camera.videoRef}
          canvasRef={camera.canvasRef}
          onStart={camera.start}
          onStop={camera.stop}
        />
      )}

      <HistoryRail history={history} />

      {toast && <div className="gesture-toast" aria-live="polite">{toast}</div>}

      {(phase === 'drawing' || phase === 'result') && (
        <ResultOverlay
          phase={phase}
          quote={drawnQuote}
          onAgain={closeResult}
          onClose={closeResult}
          aiResult={aiResult}
          aiLoading={aiLoading}
          aiError={aiError}
          onInterpret={interpretQuote}
        />
      )}
    </div>
  );
}

export default App;
