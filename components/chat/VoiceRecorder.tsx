"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onRecorded: (file: File, durationMs: number) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Professional voice recorder for chat:
 *   - Tap mic to start recording
 *   - Live timer + animated waveform
 *   - Tap red square to stop & preview
 *   - Tap send to push the recording
 *   - Tap X to discard
 *
 * Uses MediaRecorder API; saves as audio/webm (broadly supported in modern
 * browsers, including Chrome/Edge on Windows). Falls back gracefully if the
 * mic isn't available.
 */
export function VoiceRecorder({ onRecorded, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [sending, setSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, []);

  async function start() {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const mimeType =
        (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        setRecordedBlob(blob);
        setDurationMs(Date.now() - startTimeRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start(250);
      startTimeRef.current = Date.now();
      setRecording(true);
      setPaused(false);
      setRecordedBlob(null);
      timerIdRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 200);
    } catch (e) {
      console.error("mic error:", e);
      toast.error("مفيش إذن للميكروفون. افتح الإعدادات وامنح الإذن.");
    }
  }

  function stop() {
    if (!recording) return;
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setPaused(false);
  }

  function discard() {
    if (recording) stop();
    setRecordedBlob(null);
    setDurationMs(0);
  }

  async function sendNow() {
    if (!recordedBlob) return;
    setSending(true);
    try {
      const file = new File([recordedBlob], `voice-${Date.now()}.webm`, {
        type: recordedBlob.type || "audio/webm",
      });
      await onRecorded(file, durationMs);
      setRecordedBlob(null);
      setDurationMs(0);
    } catch (e) {
      toast.error("مقدرش يبعت التسجيل");
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  // --- Idle state: just the mic button ---
  if (!recording && !recordedBlob) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={start}
        title="سجّل صوت"
      >
        <Mic className="h-5 w-5" />
      </Button>
    );
  }

  // --- Recording state: live timer + stop ---
  if (recording) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-destructive/10 border border-destructive/30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
        </span>
        <span className="text-xs tabular text-destructive font-semibold" dir="ltr">
          {formatDuration(durationMs)}
        </span>
        <WaveformBars />
        <button
          type="button"
          onClick={stop}
          className="h-7 w-7 grid place-items-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          title="وقف التسجيل"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      </div>
    );
  }

  // --- Preview state: discard / send ---
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-elevated border border-border">
      <span className="text-xs tabular font-semibold" dir="ltr">
        {formatDuration(durationMs)}
      </span>
      <audio
        controls
        src={recordedBlob ? URL.createObjectURL(recordedBlob) : undefined}
        className="h-7 max-w-[160px]"
      />
      <button
        type="button"
        onClick={discard}
        className="h-7 w-7 grid place-items-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="امسح"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={sendNow}
        disabled={sending}
        className={cn(
          "h-7 w-7 grid place-items-center rounded-full",
          "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
        )}
        title="ابعت"
      >
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Animated 4-bar fake-waveform indicator shown while recording. */
function WaveformBars() {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-0.5 bg-destructive rounded-full animate-pulse"
          style={{
            height: `${[40, 90, 60, 80][i]}%`,
            animationDelay: `${i * 120}ms`,
            animationDuration: "700ms",
          }}
        />
      ))}
    </div>
  );
}
