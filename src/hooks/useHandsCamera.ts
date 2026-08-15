import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Hands, HAND_CONNECTIONS, Results } from '@mediapipe/hands';
import { GestureEngine, GestureEvent, GesturePhase } from '../engine/gestures';

export type CameraStatus = 'idle' | 'starting' | 'active' | 'error';

export interface HandsCameraController {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  status: CameraStatus;
  errorMessage: string;
  phase: GesturePhase;
  handPresent: boolean;
  pinchActive: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

export function useHandsCamera(
  onGesture: (event: GestureEvent) => void,
  onPalm?: (palm: { x: number; y: number } | null) => void,
): HandsCameraController {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [phase, setPhase] = useState<GesturePhase>('idle');
  const [handPresent, setHandPresent] = useState(false);
  const [pinchActive, setPinchActive] = useState(false);

  const handsRef = useRef<Hands | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<GestureEngine>(new GestureEngine());
  const rafRef = useRef<number>(0);
  const processingRef = useRef(false);
  const disposedRef = useRef(false);
  const onGestureRef = useRef(onGesture);
  const onPalmRef = useRef(onPalm);

  useEffect(() => {
    onGestureRef.current = onGesture;
  }, [onGesture]);

  useEffect(() => {
    onPalmRef.current = onPalm;
  }, [onPalm]);

  const drawLandmarks = useCallback((results: Results) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const landmarks = results.multiHandLandmarks[0];
    if (!landmarks) return;

    ctx.strokeStyle = 'rgba(180, 35, 24, 0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x * canvas.width, landmarks[a].y * canvas.height);
      ctx.lineTo(landmarks[b].x * canvas.width, landmarks[b].y * canvas.height);
      ctx.stroke();
    }

    ctx.fillStyle = '#f3ead5';
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const processResults = useCallback(
    (results: Results) => {
      const landmarks = results.multiHandLandmarks[0] ?? null;
      const result = engineRef.current.push(landmarks);
      setPhase(result.phase);
      setHandPresent(result.handPresent);
      setPinchActive(result.pinchActive);
      onPalmRef.current?.(result.handPresent ? result.palm : null);
      if (result.event) {
        onGestureRef.current(result.event);
      }
      drawLandmarks(results);
    },
    [drawLandmarks],
  );

  const startLoop = useCallback(() => {
    const tick = async () => {
      if (disposedRef.current) return;
      const video = videoRef.current;
      const hands = handsRef.current;
      if (video && hands && !processingRef.current && video.readyState >= 2) {
        processingRef.current = true;
        try {
          await hands.send({ image: video });
        } catch {
          // A frame can fail while the video is resizing; keep the loop alive.
        } finally {
          processingRef.current = false;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    disposedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    if (handsRef.current) {
      void handsRef.current.close().catch(() => undefined);
      handsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    engineRef.current.reset();
    setStatus('idle');
    setPhase('idle');
    setHandPresent(false);
    setPinchActive(false);
    setErrorMessage('');
  }, []);

  const start = useCallback(async () => {
    setStatus('starting');
    setErrorMessage('');
    disposedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('video element missing');
      video.srcObject = stream;
      await video.play();

      const hands = new Hands({
        locateFile: (file) => `/mediapipe-hands/${file}`,
      });
      hands.setOptions({
        selfieMode: true,
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });
      hands.onResults(processResults);
      await hands.initialize();
      handsRef.current = hands;
      disposedRef.current = false;
      setStatus('active');
      startLoop();
    } catch (error) {
      disposedRef.current = true;
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      setStatus('error');
    }
  }, [processResults, startLoop]);

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      if (handsRef.current) {
        void handsRef.current.close().catch(() => undefined);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    status,
    errorMessage,
    phase,
    handPresent,
    pinchActive,
    start,
    stop,
  };
}
