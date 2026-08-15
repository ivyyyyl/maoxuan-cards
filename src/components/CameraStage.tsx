import { Camera, CameraOff, Hand, MoveLeft, MoveRight, RefreshCcw, ScanFace } from 'lucide-react';
import type { RefObject } from 'react';
import type { CameraStatus } from '../hooks/useHandsCamera';
import type { GesturePhase } from '../engine/gestures';

interface CameraStageProps {
  status: CameraStatus;
  errorMessage: string;
  phase: GesturePhase;
  handPresent: boolean;
  pinchActive: boolean;
  mode: 'gesture' | 'mouse';
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  onStart: () => void;
  onStop: () => void;
  compact?: boolean;
}

export function CameraStage({
  status,
  errorMessage,
  phase,
  handPresent,
  pinchActive,
  mode,
  videoRef,
  canvasRef,
  onStart,
  onStop,
  compact = false,
}: CameraStageProps) {
  const statusText =
    status === 'idle'
      ? '摄像头未开启'
      : status === 'starting'
      ? '正在启动摄像头与手势模型'
      : status === 'active'
          ? phase === 'pinching'
            ? '收拢确认，正在抽牌'
            : phase === 'ready'
              ? '手掌就绪，收拢抽牌'
              : handPresent
                ? '正在跟踪手掌'
                : '等待手掌入镜'
          : '摄像头不可用';

  return (
    <section className={`camera-stage ${compact ? 'compact' : ''}`} aria-label="摄像头手势区">
      <div className="stage-frame">
        <video ref={videoRef} className="stage-video" playsInline muted />
        <canvas ref={canvasRef} className="stage-canvas" />

        {status === 'idle' && (
          <div className="stage-empty">
            <ScanFace size={34} strokeWidth={1.6} />
            <p>{mode === 'mouse' ? '当前为鼠标模式，可随时切回手势' : '开启摄像头，用手势抽取你的答案'}</p>
            {mode === 'gesture' && (
              <button className="primary-btn" onClick={onStart} type="button">
                <Camera size={18} />
                开启摄像头
              </button>
            )}
          </div>
        )}

        {status === 'starting' && (
          <div className="stage-empty">
            <span className="loading-seal">问</span>
            <p>{statusText}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="stage-empty">
            <CameraOff size={30} strokeWidth={1.6} />
            <p>{errorMessage || '摄像头被拒绝或不可用'}</p>
            <button className="primary-btn" onClick={onStart} type="button">
              <RefreshCcw size={18} />
              重试
            </button>
          </div>
        )}

        {status === 'active' && (
          <div className="camera-actions">
            <span className={`status-chip ${pinchActive ? 'is-pinch' : ''}`}>
              <Hand size={14} />
              {statusText}
            </span>
            <button className="icon-btn" onClick={onStop} type="button" aria-label="关闭摄像头">
              <CameraOff size={17} />
            </button>
          </div>
        )}
      </div>

      {!compact && (
        <div className="gesture-legend" aria-label="手势说明">
          <div className="legend-item">
            <MoveLeft size={18} />
            <span>
              <b>左划</b>
              下一张
            </span>
          </div>
          <div className="legend-item">
            <MoveRight size={18} />
            <span>
              <b>右划</b>
              上一张
            </span>
          </div>
          <div className="legend-item">
            <Hand size={18} />
            <span>
              <b>收拢</b>
              抽牌
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
