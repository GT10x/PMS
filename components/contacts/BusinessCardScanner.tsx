'use client';

import { useState, useRef } from 'react';

interface ScanResult {
  full_name: string;
  company: string;
  title: string;
  phones: { type: string; number: string }[];
  emails: { type: string; email: string }[];
  website: string;
  address: string;
  linkedin: string;
}

interface BusinessCardScannerProps {
  onResult: (data: ScanResult) => void;
  onClose: () => void;
}

export default function BusinessCardScanner({ onResult, onClose }: BusinessCardScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setScanning(true);
    setProgress(0);
    setRawText(null);

    try {
      const Tesseract = (await import('tesseract.js')).default;

      // Use multiple languages for better Indian card detection
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const text = result.data.text;
      setRawText(text);
      const parsed = parseBusinessCard(text);
      onResult(parsed);
    } catch (err) {
      console.error('OCR error:', err);
      alert('Failed to scan card. Please try with a clearer, well-lit image.');
      setScanning(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const parseBusinessCard = (text: string): ScanResult => {
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

    // Sometimes OCR merges lines or adds weird chars — clean up
    const lines: string[] = [];
    for (const line of rawLines) {
      // Split lines that have multiple items separated by | or /
      const subLines = line.split(/\s*[|]\s*/);
      for (const sub of subLines) {
        const cleaned = sub.replace(/[^\x20-\x7E@.+\-()\/,&':#]/g, '').trim();
        if (cleaned.length > 1) lines.push(cleaned);
      }
    }

    const phones: { type: string; number: string }[] = [];
    const emails: { type: string; email: string }[] = [];
    let website = '';
    let company = '';
    let title = '';
    let full_name = '';
    let address = '';
    let linkedin = '';
    const usedLines = new Set<number>();
    const addressParts: string[] = [];

    // ---- PASS 1: Extract phones, emails, websites (structured data) ----
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();

      // LinkedIn
      if (!linkedin && (lineLower.includes('linkedin.com') || lineLower.includes('linked in'))) {
        const match = line.match(/(?:linkedin\.com\/in\/|linkedin\.com\/company\/)([a-zA-Z0-9_-]+)/i);
        if (match) linkedin = `https://linkedin.com/in/${match[1]}`;
        usedLines.add(i);
        continue;
      }

      // Email — strong pattern, mark line as used
      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const emailMatches = line.match(emailRegex);
      if (emailMatches) {
        for (const em of emailMatches) {
          emails.push({ type: 'work', email: em.toLowerCase() });
        }
        usedLines.add(i);

        // Extract website from email domain if no website found yet
        if (!website && emailMatches[0]) {
          const domain = emailMatches[0].split('@')[1];
          if (domain && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('hotmail') && !domain.includes('outlook')) {
            website = `https://www.${domain}`;
          }
        }
        continue;
      }

      // Website
      const webRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9\-]+(?:\.[a-zA-Z]{2,})+)(?:\/\S*)?/g;
      const webMatches = line.match(webRegex);
      if (webMatches && !line.includes('@')) {
        for (const w of webMatches) {
          if (!website) {
            website = w.startsWith('http') ? w : `https://${w}`;
            usedLines.add(i);
          }
        }
        // If line is ONLY website, mark as used
        if (webMatches[0].length > line.length * 0.7) {
          usedLines.add(i);
          continue;
        }
      }

      // Phone numbers — multiple patterns for Indian cards
      // Match: +91 98765 43210, 098765-43210, (022) 2345 6789, M: 98765 43210, Tel: 022-23456789
      const phonePatterns = [
        /(?:mob(?:ile)?|cell|ph(?:one)?|tel(?:ephone)?|fax|m|t|o|off(?:ice)?|res(?:idence)?)?[.:)]*\s*(?:\+?91[\s\-]?)?(?:\(?0?\d{2,4}\)?[\s\-]?)?\d[\d\s\-]{8,}\d/gi,
      ];
      let phoneFound = false;
      for (const pattern of phonePatterns) {
        const matches = line.match(pattern);
        if (matches) {
          for (const m of matches) {
            const digits = m.replace(/[^\d]/g, '');
            // Valid Indian phone: 10 digits (without country code) or 11-12 with code
            if (digits.length >= 10 && digits.length <= 13) {
              // Determine type from prefix text
              const prefix = m.toLowerCase();
              let type = 'mobile';
              if (/(?:off|tel|land|o[.:]|office|fax)/.test(prefix)) type = 'work';
              if (/(?:res|home|r[.:])/.test(prefix)) type = 'home';
              if (/fax/.test(prefix)) type = 'work';

              // Format the number nicely
              let number = m.replace(/^[a-zA-Z.:)\s]+/, '').trim();
              // Avoid duplicate numbers
              const existingDigits = phones.map(p => p.number.replace(/[^\d]/g, ''));
              if (!existingDigits.includes(digits)) {
                phones.push({ type, number });
                phoneFound = true;
              }
            }
          }
        }
      }
      if (phoneFound) {
        usedLines.add(i);
        // If line has ONLY phone info, skip to next
        const nonPhoneText = line.replace(/(?:\+?91[\s\-]?)?(?:\(?0?\d{2,4}\)?[\s\-]?)?\d[\d\s\-]{8,}\d/g, '').replace(/(?:mob(?:ile)?|cell|ph(?:one)?|tel|fax|m|t|o)[.:)]*\s*/gi, '').trim();
        if (nonPhoneText.length < 5) continue;
      }
    }

    // ---- PASS 2: Identify company ----
    const companyKeywords = /(?:pvt\.?|ltd\.?|inc\.?|corp\.?|group|llp|llc|limited|private|enterprise|solution|technologies|tech|global|international|consultants?|associates?|industries|infra|builders|constructions?|pharmaceuticals?|chemicals?|exports?|imports?|trading|ventures|holdings|partners)/i;
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      if (companyKeywords.test(lines[i])) {
        company = lines[i]
          .replace(/[,.]$/, '') // trim trailing punctuation
          .trim();
        usedLines.add(i);
        break;
      }
    }

    // ---- PASS 3: Identify title/designation ----
    const titleKeywords = /(?:director|manager|ceo|cto|cfo|coo|cmo|founder|co-founder|president|engineer|developer|designer|consultant|partner|head|lead|officer|vp|chief|sr\.?|senior|junior|architect|analyst|executive|coordinator|proprietor|chairman|secretary|treasurer|advisor|advocate|dr\.?|prof\.?|accountant|auditor|sales|marketing|business\s+develop|admin|asst\.?|asstt\.?|assistant|general\s+manager|managing|deputy)/i;
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      if (titleKeywords.test(lines[i])) {
        title = lines[i].replace(/[,.]$/, '').trim();
        usedLines.add(i);
        break;
      }
    }

    // ---- PASS 4: Identify address ----
    // Indian address indicators: city names, state names, pincode, road/street keywords
    const addressKeywords = /(?:\d{6}|road|street|lane|nagar|colony|sector|plot|floor|building|tower|block|phase|opp\.|nr\.|near|behind|above|marg|chowk|circle|cross|main|market|bazaar|gandhinagar|ahmedabad|mumbai|delhi|bangalore|bengaluru|chennai|hyderabad|pune|kolkata|jaipur|surat|vadodara|rajkot|indore|bhopal|lucknow|kanpur|nagpur|gurgaon|noida|faridabad|thane|andheri|borivali|malad|goregaon|bandra|powai|worli|parel|dadar|india|gujarat|maharashtra|karnataka|tamil\s*nadu|telangana|rajasthan|madhya\s*pradesh|uttar\s*pradesh|west\s*bengal|kerala|goa|dist|taluka|state|pin)/i;
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      if (addressKeywords.test(lines[i])) {
        addressParts.push(lines[i]);
        usedLines.add(i);
        // Check next 1-2 lines for continuation
        for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
          if (!usedLines.has(j) && (addressKeywords.test(lines[j]) || /^\d/.test(lines[j]) || lines[j].includes(','))) {
            addressParts.push(lines[j]);
            usedLines.add(j);
          }
        }
        break;
      }
    }
    address = addressParts.join(', ').replace(/,\s*,/g, ',').trim();

    // ---- PASS 5: Name — first unused line that looks like a name ----
    // Names are typically: all letters, 2-4 words, no digits, not too long
    const nameRegex = /^[A-Za-z\s.']+$/;
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      const line = lines[i];
      // Skip very short or very long lines
      if (line.length < 3 || line.length > 50) continue;
      // Must be mostly letters
      if (nameRegex.test(line)) {
        const words = line.split(/\s+/);
        // Names typically have 2-5 words
        if (words.length >= 1 && words.length <= 5) {
          full_name = line;
          usedLines.add(i);
          break;
        }
      }
    }

    // If no name found, try first unused line
    if (!full_name) {
      for (let i = 0; i < lines.length; i++) {
        if (!usedLines.has(i) && lines[i].length > 2 && !/\d{5}/.test(lines[i])) {
          full_name = lines[i];
          break;
        }
      }
    }

    // If still no company, try second unused line after name
    if (!company) {
      let foundName = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === full_name) { foundName = true; continue; }
        if (foundName && !usedLines.has(i) && lines[i].length > 3) {
          // Might be company if it's not a phone/email line
          if (!/@/.test(lines[i]) && !/^\+?\d[\d\s\-]{8}/.test(lines[i])) {
            company = lines[i];
            break;
          }
        }
      }
    }

    return { full_name, company, title, phones, emails, website, address, linkedin };
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
          <div className="space-y-3">
            {/* Camera option */}
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full border-2 border-dashed border-green-300 dark:border-green-600 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
            >
              <i className="fas fa-camera text-4xl text-green-500 mb-2"></i>
              <p className="text-green-700 dark:text-green-400 font-medium">Take Photo</p>
              <p className="text-xs text-gray-400 mt-1">Open camera to capture card</p>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </button>

            {/* Gallery option */}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
            >
              <i className="fas fa-image text-4xl text-indigo-400 mb-2"></i>
              <p className="text-indigo-700 dark:text-indigo-400 font-medium">Choose from Gallery</p>
              <p className="text-xs text-gray-400 mt-1">Select an existing photo</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </button>
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
            {rawText && !scanning && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Raw OCR Text (for reference)</p>
                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-32 overflow-auto">{rawText}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
