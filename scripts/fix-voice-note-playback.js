const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'dashboard', 'project', '[id]', 'reports', 'page.tsx');

let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `              {/* Attachments */}
              {selectedReport.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Attachments ({selectedReport.attachments.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedReport.attachments.map((url, index) => {
                      const isAudio = url.includes('.webm') || url.includes('audio') || url.includes('voice');
                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center gap-2"
                        >
                          <i className={\`fas \${isAudio ? 'fa-microphone' : 'fa-paperclip'} text-indigo-600\`}></i>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {isAudio ? 'Voice Note' : \`Attachment \${index + 1}\`}
                          </span>
                          <i className="fas fa-external-link-alt text-xs text-gray-400 ml-auto"></i>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}`;

const newCode = `              {/* Attachments */}
              {selectedReport.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Attachments ({selectedReport.attachments.length})</h4>
                  <div className="space-y-3">
                    {selectedReport.attachments.map((url, index) => {
                      const isAudio = url.includes('.webm') || url.includes('audio') || url.includes('voice') || url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg');
                      const isImage = url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.gif') || url.includes('.webp');

                      if (isAudio) {
                        return (
                          <div key={index} className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                                <i className="fas fa-microphone text-white"></i>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Voice Note</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Audio recording</p>
                              </div>
                            </div>
                            <audio controls className="w-full h-10" src={url}>
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        );
                      }

                      if (isImage) {
                        return (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={\`Attachment \${index + 1}\`} className="w-full max-h-64 object-contain bg-gray-100 dark:bg-gray-800" />
                            </a>
                          </div>
                        );
                      }

                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center gap-2"
                        >
                          <i className="fas fa-paperclip text-indigo-600"></i>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            Attachment {index + 1}
                          </span>
                          <i className="fas fa-external-link-alt text-xs text-gray-400 ml-auto"></i>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Voice note playback fix applied successfully!');
} else {
  console.log('Could not find the exact code to replace. The file may have been modified.');
  console.log('Searching for attachments section...');

  // Try a simpler search
  if (content.includes('selectedReport.attachments.map((url, index)')) {
    console.log('Found attachments map. Manual fix may be needed.');
  }
}
