import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type GestureCommand =
  | "POINT"
  | "SELECT"
  | "GRAB"
  | "RELEASE"
  | "SWIPE_LEFT"
  | "SWIPE_RIGHT"
  | "SWIPE_UP"
  | "SWIPE_DOWN"
  | "ZOOM_IN"
  | "ZOOM_OUT"
  | "BACK"
  | "PAUSE";

export type GestureEvent = {
  command: GestureCommand;
  confidence?: number;
  x?: number;
  y?: number;
  timestamp: number;
};

type GestureContextValue = {
  isActive: boolean;
  isCameraEnabled: boolean;
  stream: MediaStream | null;
  recognitionStatus: "idle" | "loading" | "active" | "error";
  recognitionError: string | null;
  setRecognitionStatus: (status: "idle" | "loading" | "active" | "error", error?: string | null) => void;
  lastEvent: GestureEvent | null;
  pointer: { x: number; y: number } | null;
  updatePointer: (pointer: { x: number; y: number }) => void;
  startGestureMode: () => Promise<boolean>;
  stopGestureMode: () => void;
  emitCommand: (event: Omit<GestureEvent, "timestamp">) => void;
  subscribe: (listener: (event: GestureEvent) => void) => () => void;
};

const GestureContext = createContext<GestureContextValue | null>(null);

export function GestureProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef(new Set<(event: GestureEvent) => void>());
  const [isActive, setIsActive] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState<GestureContextValue["recognitionStatus"]>("idle");
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<GestureEvent | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const updatePointer = useCallback((nextPointer: { x: number; y: number }) => setPointer(nextPointer), []);

  const startGestureMode = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(stream);
      setIsCameraEnabled(true);
      setIsActive(true);
      return true;
    } catch {
      setIsCameraEnabled(false);
      setIsActive(false);
      setRecognitionStatus("idle");
      setRecognitionError(null);
      return false;
    }
  }, []);

  const stopGestureMode = useCallback(() => {
    setStream((currentStream) => {
      currentStream?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setIsActive(false);
    setIsCameraEnabled(false);
  }, []);

  const updateRecognitionStatus = useCallback((status: GestureContextValue["recognitionStatus"], error: string | null = null) => {
    setRecognitionStatus(status);
    setRecognitionError(error);
  }, []);

  const emitCommand = useCallback((event: Omit<GestureEvent, "timestamp">) => {
    const nextEvent: GestureEvent = { ...event, timestamp: Date.now() };
    if (typeof event.x === "number" && typeof event.y === "number") setPointer({ x: 1 - event.x, y: event.y });
    setLastEvent(nextEvent);
    listenersRef.current.forEach((listener) => listener(nextEvent));
  }, []);

  const subscribe = useCallback((listener: (event: GestureEvent) => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const value = useMemo(() => ({
    isActive,
    isCameraEnabled,
    stream,
    recognitionStatus,
    recognitionError,
    setRecognitionStatus: updateRecognitionStatus,
    lastEvent,
    pointer,
    updatePointer,
    startGestureMode,
    stopGestureMode,
    emitCommand,
    subscribe,
  }), [emitCommand, isActive, isCameraEnabled, lastEvent, pointer, recognitionError, recognitionStatus, startGestureMode, stopGestureMode, stream, subscribe, updatePointer, updateRecognitionStatus]);

  return <GestureContext.Provider value={value}>{children}</GestureContext.Provider>;
}

export function useGesture() {
  const context = useContext(GestureContext);
  if (!context) throw new Error("useGesture must be used inside GestureProvider");
  return context;
}
