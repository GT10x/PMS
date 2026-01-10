const fs = require('fs');
const path = require('path');

// Generate a simple notification sound (WAV format)
// This creates a pleasant two-tone notification beep

function generateNotificationSound() {
  const sampleRate = 44100;
  const duration = 0.3; // 300ms
  const numSamples = Math.floor(sampleRate * duration);

  // Create audio data (two tones: 880Hz then 1100Hz)
  const audioData = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample;

    if (t < 0.15) {
      // First tone: 880Hz (A5)
      const envelope = Math.min(1, t / 0.01) * Math.min(1, (0.15 - t) / 0.05);
      sample = Math.sin(2 * Math.PI * 880 * t) * envelope;
    } else {
      // Second tone: 1100Hz
      const t2 = t - 0.15;
      const envelope = Math.min(1, t2 / 0.01) * Math.min(1, (0.15 - t2) / 0.05);
      sample = Math.sin(2 * Math.PI * 1100 * t2) * envelope;
    }

    audioData[i] = Math.floor(sample * 32767 * 0.5); // 50% volume
  }

  // Create WAV file
  const wavBuffer = createWavBuffer(audioData, sampleRate);

  const outputPath = path.join(__dirname, '..', 'public', 'sounds', 'notification.wav');
  const soundsDir = path.dirname(outputPath);

  if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, wavBuffer);
  console.log(`Created ${outputPath}`);
}

function createWavBuffer(audioData, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = audioData.length * (bitsPerSample / 8);
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM format
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Audio data
  for (let i = 0; i < audioData.length; i++) {
    buffer.writeInt16LE(audioData[i], offset);
    offset += 2;
  }

  return buffer;
}

generateNotificationSound();
console.log('Notification sound generated!');
