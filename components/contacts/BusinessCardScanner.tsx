'use client';

import { useState, useRef } from 'react';

interface ScanResult {
  full_name: string;
  company: string;
  title: string;
  phones: { type: string; number: string }[];
  emails: { type: string; email: string }[];
  website: string;
}

interface BusinessCardScannerProps {
  onResult: (data: ScanResult) => void;
  onClose: () => void;
}

export default function BusinessCardScanner({ onResult, onClose }: BusinessCardScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setScanning(true);
    setProgress(0);

    try {
      // Dynamic import to avoid SSR issues
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const text = result.data.text;
      const parsed = parseBusinessCard(text);
      onResult(parsed);
    } catch (err) {
      console.error('OCR error:', err);
      alert('Failed to scan card. Please try a clearer image.');
    } finally {
      setScanning(false);
    }
  };

  const parseBusinessCard = (text: string): ScanResult => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract phones
    const phoneRegex = /[\+]?[\d\s\-\(\)]{10,}/g;
    const phones: { type: string; number: string }[] = [];
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails: { type: string; email: string }[] = [];
    const websiteRegex = /(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/g;
    let website = '';
    const companyKeywords = /(?:pvt|ltd|inc|corp|group|llp|llc|limited|private|enterprise|solution|tech|global|international)/i;

    let company = '';
    let title = '';
    const usedLines = new Set<number>();

    // Extract structured data
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Phones
      const phoneMatches = line.match(phoneRegex);
      if (phoneMatches) {
        for (const p of phoneMatches) {
          const clean = p.replace(/[\s\-\(\)]/g, '');
          if (clean.length >= 10) {
            phones.push({ type: 'mobile', number: p.trim() });
            usedLines.add(i);
          }
        }
      }

      // Emails
      const emailMatches = line.match(emailRegex);
      if (emailMatches) {
        for (const em of emailMatches) {
          emails.push({ type: 'work', email: em });
          usedLines.add(i);
        }
      }

      // Website
      if (!website) {
        const webMatches = line.match(websiteRegex);
        if (webMatches && !line.includes('@')) {
          website = webMatches[0];
          if (!website.startsWith('http')) website = 'https://' + website;
          usedLines.add(i);
        }
      }

      // Company
      if (!company && companyKeywords.test(line)) {
        company = line;
        usedLines.add(i);
      }
    }

    // Title keywords
    const titleKeywords = /(?:director|manager|ceo|cto|cfo|founder|president|engineer|developer|designer|consultant|partner|head|lead|officer|vp|chief|sr\.|senior|junior)/i;
    for (let i = 0; i < lines.length; i++) {
      if (!usedLines.has(i) && titleKeywords.test(lines[i])) {
        title = lines[i];
        usedLines.add(i);
        break;
      }
    }

    // Name = first unused line (likely the person's name)
    let full_name = '';
    for (let i = 0; i < lines.length; i++) {
      if (!usedLines.has(i) && lines[i].length > 2) {
        full_name = lines[i];
        break;
      }
    }

    return { full_name, company, title, phones, emails, website };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            <i className="fas fa-id-card mr-2 text-indigo-500"></i>Scan Visiting Card
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-lg"></i></button>
        </div>

        {!imageUrl && !scanning && (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          >
            <i className="fas fa-camera text-4xl text-gray-400 mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">Click to upload or take a photo</p>
            <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </div>
        )}

        {imageUrl && (
          <div className="space-y-4">
            <img src={imageUrl} alt="Card" className="w-full rounded-lg max-h-64 object-contain bg-gray-100 dark:bg-gray-700" />
            {scanning && (
              <div>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Scanning text...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
