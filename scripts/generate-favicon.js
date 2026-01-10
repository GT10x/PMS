const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a simple 32x32 PNG with "P" letter suggestion (indigo colored square)
function createPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = createIHDR(width, height);
  const idat = createIDAT(width, height, r, g, b);
  const iend = createIEND();
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data.writeUInt8(8, 8);
  data.writeUInt8(2, 9);
  data.writeUInt8(0, 10);
  data.writeUInt8(0, 11);
  data.writeUInt8(0, 12);
  return createChunk('IHDR', data);
}

function createIDAT(width, height, r, g, b) {
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  return createChunk('IDAT', compressed);
}

function createIEND() {
  return createChunk('IEND', Buffer.alloc(0));
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  const table = getCRC32Table();
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

let crcTable = null;
function getCRC32Table() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}

// Create ICO file from PNG
function createICO(pngData) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type: 1 = ICO
  header.writeUInt16LE(1, 4);     // Number of images

  // ICO directory entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);        // Width (32 = 32px, 0 would mean 256)
  entry.writeUInt8(32, 1);        // Height
  entry.writeUInt8(0, 2);         // Color palette
  entry.writeUInt8(0, 3);         // Reserved
  entry.writeUInt16LE(1, 4);      // Color planes
  entry.writeUInt16LE(24, 6);     // Bits per pixel
  entry.writeUInt32LE(pngData.length, 8);  // Image size
  entry.writeUInt32LE(22, 12);    // Offset to image data (6 + 16 = 22)

  return Buffer.concat([header, entry, pngData]);
}

// Theme color: #4f46e5 (indigo)
const r = 79, g = 70, b = 229;

// Create 32x32 PNG
const png32 = createPNG(32, 32, r, g, b);

// Create ICO
const ico = createICO(png32);

// Write favicon.ico to app folder
const faviconPath = path.join(__dirname, '..', 'app', 'favicon.ico');
fs.writeFileSync(faviconPath, ico);
console.log(`Created ${faviconPath}`);

// Also create a 16x16 version for public folder as fallback
const png16 = createPNG(16, 16, r, g, b);
const ico16 = createICO(png16);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), ico16);
console.log('Created public/favicon.ico');

console.log('Favicon generated!');
