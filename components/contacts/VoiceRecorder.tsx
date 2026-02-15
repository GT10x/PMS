'use client';

import { useState, useRef } from 'react';

interface VoiceRecorderProps {
  onRecorded: (url: string) => void;
}

export default function VoiceRecorder({ onRecorded }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [permError, setPermError] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const getSupportedMimeType = () => {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', ''];
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) return type || undefined;
    }
    return undefined;
  };

  const checkAndRequestPermission = async (): Promise<boolean> => {
    // Check if permissions API is available
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (result.state === 'denied') {
          setPermError(true);
          return false;
        }
      } catch {
        // permissions.query may not support 'microphone' on all browsers — proceed anyway
      }
    }
    return true;
  };

  const startRecording = async () => {
    setPermError(false);

    const hasPermission = await checkAndRequestPermission();
    if (!hasPermission) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: mimeType || 'audio/webm' });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreview(url);
      };

      recorder.start();
      setRecording(true);
      setDuration(0);
      setPreview(null);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err: any) {
      console.error('Mic error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setPermError(true);
      } else {
        setPermError(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const uploadAndSave = async () => {
    if (!blobRef.current) return;
    setUploading(true);
    try {
      const ext = blobRef.current.type.includes('mp4') ? 'mp4' : blobRef.current.type.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('file', blobRef.current, `voice-${Date.now()}.${ext}`);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onRecorded(data.url);
      cancelPreview();
    } catch (err) {
      alert('Failed to upload voice note');
    } finally {
      setUploading(false);
    }
  };

  const cancelPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    blobRef.current = null;
    setDuration(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
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
        ) : preview ? (
          <>
            <audio controls src={preview} className="h-8 max-w-[180px]" />
            <button onClick={uploadAndSave} disabled={uploading}
              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm disabled:opacity-50">
              {uploading ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1" /> Saving...</> : <><i className="fas fa-check mr-1"></i> Save</>}
            </button>
            <button onClick={cancelPreview} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm">
              <i className="fas fa-times"></i>
            </button>
          </>
        ) : (
          <button onClick={startRecording} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm">
            <i className="fas fa-microphone mr-1"></i> Voice Note
          </button>
        )}
      </div>

      {/* Permission denied guidance */}
      {permError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            <i className="fas fa-microphone-slash mr-1"></i> Microphone Permission Required
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Voice recording needs microphone access. Please enable it:
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1 ml-3 list-disc">
            <li><strong>Android App:</strong> Settings &rarr; Apps &rarr; PMS &rarr; Permissions &rarr; Microphone &rarr; Allow</li>
            <li><strong>Chrome:</strong> Tap the lock icon in address bar &rarr; Site settings &rarr; Microphone &rarr; Allow</li>
            <li><strong>Safari:</strong> Settings &rarr; Safari &rarr; Microphone &rarr; Allow</li>
          </ul>
          <button onClick={() => { setPermError(false); startRecording(); }}
            className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 underline font-medium">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
