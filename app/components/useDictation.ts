"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognition() {
  const scope = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition || scope.webkitSpeechRecognition;
}

/**
 * Voice input. Uses the browser's Web Speech API when it exists (Chrome, Edge),
 * otherwise records with MediaRecorder and transcribes on the server with Whisper.
 * Call `toggle` to start; call it again to stop a server-side recording.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  const transcribe = useCallback(async (blob: Blob) => {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "speech");
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Transcription failed");
        return;
      }
      if (data.text) onTextRef.current(data.text);
    } catch {
      setError("Transcription failed");
    } finally {
      setTranscribing(false);
    }
  }, []);

  const startRecorder = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record audio.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked.");
      return;
    }

    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      stopRef.current = null;
      setListening(false);
      if (chunks.length) {
        void transcribe(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      }
    };
    stopRef.current = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };
    recorder.start();
    setListening(true);
  }, [transcribe]);

  const toggle = useCallback(() => {
    setError("");
    if (stopRef.current) {
      stopRef.current();
      return;
    }

    const Ctor = speechRecognition();
    if (!Ctor) {
      void startRecorder();
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onTextRef.current(transcript);
    };
    recognition.onerror = () => {
      stopRef.current = null;
      setListening(false);
    };
    recognition.onend = () => {
      stopRef.current = null;
      setListening(false);
    };
    stopRef.current = () => recognition.stop();
    setListening(true);
    recognition.start();
  }, [startRecorder]);

  return { listening, transcribing, error, toggle };
}
