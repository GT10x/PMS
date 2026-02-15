'use client';

import { useState, useRef } from 'react';

interface VoiceRecorderProps {
  onRecorded: (url: string) => void;
}

export default function VoiceRecorder({ onRecorded }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        await uploadVoice(blob);
      };

      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const uploadVoice = async (blob: Blob) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, `voice-${Date.now()}.webm`);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onRecorded(data.url);
    } catch (err) {
      alert('Failed to upload voice note');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-red-600 dark:text-red-400 font-mono">{formatTime(duration)}</span>
          </div>
          <button onClick={stopRecording} className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
            <i className="fas fa-stop mr-1"></i> Stop
          </button>
        </>
      ) : uploading ? (
        <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Uploading...
        </div>
      ) : (
        <button onClick={startRecording} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm">
          <i className="fas fa-microphone mr-1"></i> Record Voice Note
        </button>
      )}
    </div>
  );
}
