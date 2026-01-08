const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the entire speech recognition implementation
const oldSpeech = `  // Speech-to-text state
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = 'en-US';
        setRecognition(recog);
      }
    }
  }, []);

  const startListening = (index: number) => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setListeningIndex(index);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const updated = [...featuresList];
      // Append to existing text or set new text
      updated[index] = updated[index] ? updated[index] + ' ' + transcript : transcript;
      setFeaturesList(updated);
      setListeningIndex(null);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setListeningIndex(null);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access and try again.');
      }
    };

    recognition.onend = () => {
      setListeningIndex(null);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      setListeningIndex(null);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setListeningIndex(null);
  };`;

const newSpeech = `  // Speech-to-text state
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);
  const recognitionRef = React.useRef<any>(null);
  const shouldRestartRef = React.useRef<boolean>(false);
  const currentIndexRef = React.useRef<number | null>(null);

  const startListening = (index: number) => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      recognitionRef.current.stop();
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = 'en-US';

    currentIndexRef.current = index;
    shouldRestartRef.current = true;
    setListeningIndex(index);

    recog.onresult = (event: any) => {
      // Get only the latest result
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;

      setFeaturesList(prev => {
        const updated = [...prev];
        const idx = currentIndexRef.current;
        if (idx !== null) {
          updated[idx] = updated[idx] ? updated[idx] + ' ' + transcript : transcript;
        }
        return updated;
      });
    };

    recog.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access and try again.');
        shouldRestartRef.current = false;
        setListeningIndex(null);
      }
      // Don't stop on no-speech error, just continue
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        shouldRestartRef.current = false;
        setListeningIndex(null);
      }
    };

    recog.onend = () => {
      // Auto-restart if we should still be listening
      if (shouldRestartRef.current && currentIndexRef.current !== null) {
        try {
          recog.start();
        } catch (e) {
          // Ignore errors on restart
        }
      } else {
        setListeningIndex(null);
      }
    };

    recognitionRef.current = recog;

    try {
      recog.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      setListeningIndex(null);
    }
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    currentIndexRef.current = null;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListeningIndex(null);
  };`;

content = content.replace(oldSpeech, newSpeech);
console.log('✓ Updated to continuous speech recognition');

// Also need to add React import for useRef if not present
if (!content.includes('useRef')) {
  content = content.replace(
    "import { useEffect, useState } from 'react';",
    "import { useEffect, useState, useRef } from 'react';"
  );
  // Also handle if it's a different import format
  content = content.replace(
    "import React, { useEffect, useState } from 'react';",
    "import React, { useEffect, useState, useRef } from 'react';"
  );
  console.log('✓ Added useRef import');
}

// Make sure React is available for React.useRef
if (!content.includes('import React')) {
  content = content.replace(
    "import { useEffect, useState, useRef } from 'react';",
    "import React, { useEffect, useState, useRef } from 'react';"
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\\n✓ Done! Speech recognition now listens continuously until stopped.');
