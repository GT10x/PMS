const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix: Add ref for tracking inline listening state
const oldState = `  // Speech-to-text state
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);
  const [inlineListening, setInlineListening] = useState<'edit' | 'add' | null>(null);
  const inlineRecognitionRef = useRef<any>(null);`;

const newState = `  // Speech-to-text state
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);
  const [inlineListening, setInlineListening] = useState<'edit' | 'add' | null>(null);
  const inlineRecognitionRef = useRef<any>(null);
  const inlineShouldRestartRef = useRef<boolean>(false);
  const inlineTypeRef = useRef<'edit' | 'add' | null>(null);`;

content = content.replace(oldState, newState);
console.log('✓ Added refs for inline speech tracking');

// Fix the startInlineListening function
const oldInlineStart = `  // Inline speech recognition for edit/add feature in expanded cards
  const startInlineListening = (type: 'edit' | 'add') => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (inlineRecognitionRef.current) {
      inlineRecognitionRef.current.stop();
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = 'en-US';

    setInlineListening(type);

    recog.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;

      if (type === 'edit') {
        setEditingFeatureText(prev => prev ? prev + ' ' + transcript : transcript);
      } else {
        setNewFeatureText(prev => prev ? prev + ' ' + transcript : transcript);
      }
    };

    recog.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        alert('Microphone access denied.');
      }
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setInlineListening(null);
      }
    };

    recog.onend = () => {
      if (inlineListening) {
        try { recog.start(); } catch (e) {}
      }
    };

    inlineRecognitionRef.current = recog;
    try { recog.start(); } catch (e) { setInlineListening(null); }
  };

  const stopInlineListening = () => {
    if (inlineRecognitionRef.current) {
      inlineRecognitionRef.current.stop();
      inlineRecognitionRef.current = null;
    }
    setInlineListening(null);
  };`;

const newInlineStart = `  // Inline speech recognition for edit/add feature in expanded cards
  const startInlineListening = (type: 'edit' | 'add') => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    // Stop any existing recognition
    if (inlineRecognitionRef.current) {
      inlineShouldRestartRef.current = false;
      inlineRecognitionRef.current.stop();
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = 'en-US';

    // Use refs to track state for callbacks
    inlineShouldRestartRef.current = true;
    inlineTypeRef.current = type;
    setInlineListening(type);

    recog.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;

      // Use ref to check current type
      if (inlineTypeRef.current === 'edit') {
        setEditingFeatureText(prev => prev ? prev + ' ' + transcript : transcript);
      } else if (inlineTypeRef.current === 'add') {
        setNewFeatureText(prev => prev ? prev + ' ' + transcript : transcript);
      }
    };

    recog.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        alert('Microphone access denied.');
        inlineShouldRestartRef.current = false;
        setInlineListening(null);
      }
      // Don't stop on no-speech, just continue
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        inlineShouldRestartRef.current = false;
        setInlineListening(null);
      }
    };

    recog.onend = () => {
      // Use ref to check if we should restart (not stale state)
      if (inlineShouldRestartRef.current) {
        try {
          recog.start();
        } catch (e) {
          // Ignore restart errors
        }
      } else {
        setInlineListening(null);
      }
    };

    inlineRecognitionRef.current = recog;
    try {
      recog.start();
    } catch (e) {
      inlineShouldRestartRef.current = false;
      setInlineListening(null);
    }
  };

  const stopInlineListening = () => {
    inlineShouldRestartRef.current = false;
    inlineTypeRef.current = null;
    if (inlineRecognitionRef.current) {
      inlineRecognitionRef.current.stop();
      inlineRecognitionRef.current = null;
    }
    setInlineListening(null);
  };`;

content = content.replace(oldInlineStart, newInlineStart);
console.log('✓ Fixed inline speech recognition to properly handle pauses');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\\n✓ Done! Speech recognition now continues after pauses.');
