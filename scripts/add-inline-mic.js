const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/dashboard/project/[id]/modules/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for inline speech recognition
const oldSpeechState = `  // Speech-to-text state
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);`;

const newSpeechState = `  // Speech-to-text state
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);
  const [inlineListening, setInlineListening] = useState<'edit' | 'add' | null>(null);
  const inlineRecognitionRef = useRef<any>(null);`;

content = content.replace(oldSpeechState, newSpeechState);
console.log('✓ Added inline speech state');

// 2. Add inline speech functions after stopListening
const oldStopListening = `  const stopListening = () => {
    shouldRestartRef.current = false;
    currentIndexRef.current = null;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListeningIndex(null);
  };`;

const newStopListening = `  const stopListening = () => {
    shouldRestartRef.current = false;
    currentIndexRef.current = null;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListeningIndex(null);
  };

  // Inline speech recognition for edit/add feature in expanded cards
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

content = content.replace(oldStopListening, newStopListening);
console.log('✓ Added inline speech functions');

// 3. Add mic button to inline edit feature input
const oldEditInput = `                                  <input
                                    type="text"
                                    value={editingFeatureText}
                                    onChange={(e) => setEditingFeatureText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditFeature(module.id);
                                      if (e.key === 'Escape') { setEditingFeature(null); setEditingFeatureText(''); }
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveEditFeature(module.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>`;

const newEditInput = `                                  <input
                                    type="text"
                                    value={editingFeatureText}
                                    onChange={(e) => setEditingFeatureText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditFeature(module.id);
                                      if (e.key === 'Escape') { setEditingFeature(null); setEditingFeatureText(''); stopInlineListening(); }
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => inlineListening === 'edit' ? stopInlineListening() : startInlineListening('edit')}
                                    className={\`p-1 rounded transition-colors \${
                                      inlineListening === 'edit'
                                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                                        : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                    }\`}
                                    title={inlineListening === 'edit' ? 'Stop' : 'Voice input'}
                                  >
                                    <i className="fas fa-microphone"></i>
                                  </button>
                                  <button
                                    onClick={() => { saveEditFeature(module.id); stopInlineListening(); }}
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>`;

content = content.replace(oldEditInput, newEditInput);
console.log('✓ Added mic to inline edit feature');

// 4. Add mic button to inline add feature input
const oldAddInput = `                              <input
                                type="text"
                                value={newFeatureText}
                                onChange={(e) => setNewFeatureText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') addFeature(module.id);
                                  if (e.key === 'Escape') { setAddingFeature(null); setNewFeatureText(''); }
                                }}
                                placeholder="Type feature and press Enter..."
                                className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => addFeature(module.id)}
                                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              >
                                <i className="fas fa-check"></i>
                              </button>`;

const newAddInput = `                              <input
                                type="text"
                                value={newFeatureText}
                                onChange={(e) => setNewFeatureText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { addFeature(module.id); stopInlineListening(); }
                                  if (e.key === 'Escape') { setAddingFeature(null); setNewFeatureText(''); stopInlineListening(); }
                                }}
                                placeholder="Type feature and press Enter..."
                                className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => inlineListening === 'add' ? stopInlineListening() : startInlineListening('add')}
                                className={\`p-1 rounded transition-colors \${
                                  inlineListening === 'add'
                                    ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                                    : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                }\`}
                                title={inlineListening === 'add' ? 'Stop' : 'Voice input'}
                              >
                                <i className="fas fa-microphone"></i>
                              </button>
                              <button
                                onClick={() => { addFeature(module.id); stopInlineListening(); }}
                                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              >
                                <i className="fas fa-check"></i>
                              </button>`;

content = content.replace(oldAddInput, newAddInput);
console.log('✓ Added mic to inline add feature');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\\n✓ Done! Mic icon added to all feature inputs.');
