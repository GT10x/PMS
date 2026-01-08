const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for speech recognition after featuresList state
const oldFeaturesState = `  // Features as array for numbered inputs
  const [featuresList, setFeaturesList] = useState<string[]>(['']);`;

const newFeaturesState = `  // Features as array for numbered inputs
  const [featuresList, setFeaturesList] = useState<string[]>(['']);

  // Speech-to-text state
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

content = content.replace(oldFeaturesState, newFeaturesState);
console.log('✓ Added speech recognition state and functions');

// 2. Update the feature input in Add Modal to include mic button
const oldAddInput = `                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const updated = [...featuresList];
                          updated[idx] = e.target.value;
                          setFeaturesList(updated);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFeaturesList([...featuresList, '']);
                            // Focus on new input after React re-renders
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('input[placeholder*="feature"], input[placeholder*="Feature"]');
                              const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                              if (lastInput) lastInput.focus();
                            }, 50);
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={idx === 0 ? "e.g., Login with email/password" : "Add another feature..."}
                      />
                      {featuresList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}`;

const newAddInput = `                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const updated = [...featuresList];
                          updated[idx] = e.target.value;
                          setFeaturesList(updated);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFeaturesList([...featuresList, '']);
                            // Focus on new input after React re-renders
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('input[placeholder*="feature"], input[placeholder*="Feature"]');
                              const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                              if (lastInput) lastInput.focus();
                            }, 50);
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={idx === 0 ? "e.g., Login with email/password" : "Add another feature..."}
                      />
                      <button
                        type="button"
                        onClick={() => listeningIndex === idx ? stopListening() : startListening(idx)}
                        className={\`p-2 rounded transition-colors \${
                          listeningIndex === idx
                            ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                            : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                        }\`}
                        title={listeningIndex === idx ? 'Stop listening' : 'Voice input'}
                      >
                        <i className={\`fas fa-microphone \${listeningIndex === idx ? 'text-red-500' : ''}\`}></i>
                      </button>
                      {featuresList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}`;

// Replace all occurrences (both Add and Edit modals have the same structure)
content = content.split(oldAddInput).join(newAddInput);
console.log('✓ Added mic button to feature inputs (both modals)');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\\n✓ Done! Speech-to-text added to module feature inputs.');
