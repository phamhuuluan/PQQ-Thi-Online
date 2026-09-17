#!/usr/bin/env node
/**
 * Generate PWA icon PNGs (192x192, 512x512) — no external deps.
 * Run: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'icons');
const PRIMARY = { r: 26, g: 86, b: 219 }; // #1a56db

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createSolidPng(size, color) {
  const { r, g, b } = color;
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(rowSize * size);
  let offset = 0;
  const margin = Math.floor(size * 0.12);
  const inner = size - margin * 2;
  const corner = Math.floor(size * 0.08);

  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const inCard =
        x >= margin && x < size - margin &&
        y >= margin && y < size - margin;
      const dx = x < margin + corner ? margin + corner - x : x >= size - margin - corner ? x - (size - margin - corner - 1) : 0;
      const dy = y < margin + corner ? margin + corner - y : y >= size - margin - corner ? y - (size - margin - corner - 1) : 0;
      const inRounded = inCard && (dx === 0 || dy === 0 || dx * dx + dy * dy <= corner * corner);

      const cx = size / 2;
      const cy = size / 2;
      const letterZone = inRounded && y > margin + inner * 0.28 && y < margin + inner * 0.78;
      const isLetter =
        letterZone &&
        ((x > cx - inner * 0.22 && x < cx - inner * 0.12) ||
         (x > cx - inner * 0.1 && x < cx + inner * 0.1) ||
         (x > cx + inner * 0.12 && x < cx + inner * 0.22));

      let pr = r;
      let pg = g;
      let pb = b;

      if (inRounded && isLetter) {
        pr = 255;
        pg = 255;
        pb = 255;
      } else if (inRounded) {
        pr = Math.min(255, r + 8);
        pg = Math.min(255, g + 8);
        pb = Math.min(255, b + 8);
      } else {
        pr = 248;
        pg = 250;
        pb = 252;
      }

      raw[offset++] = pr;
      raw[offset++] = pg;
      raw[offset++] = pb;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeSvg() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="PQQ Thi Online">
  <rect width="512" height="512" rx="64" fill="#1a56db"/>
  <text x="256" y="300" text-anchor="middle" font-family="system-ui,sans-serif" font-size="140" font-weight="700" fill="#ffffff">PQQ</text>
</svg>`;
  fs.writeFileSync(path.join(OUT_DIR, 'icon.svg'), svg);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

writeSvg();
fs.writeFileSync(path.join(OUT_DIR, 'icon-192.png'), createSolidPng(192, PRIMARY));
fs.writeFileSync(path.join(OUT_DIR, 'icon-512.png'), createSolidPng(512, PRIMARY));
console.log('Generated assets/icons/icon.svg, icon-192.png, icon-512.png');
