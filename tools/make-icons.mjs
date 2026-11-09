#!/usr/bin/env node
// Draws the app icons (same design as the Android icon) as PNG files, with no external tools.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const NAVY = [0x0f, 0x15, 0x30];
const WHITE = [0xf7, 0xf8, 0xff];
const ORANGE = [0xff, 0xb5, 0x47];
// Squares on a 108-unit canvas (as in android/app/src/main/res/drawable/ic_launcher_foreground.xml).
const SQUARES = [
  [30, 30, WHITE], [47, 30, WHITE], [64, 30, WHITE],
  [30, 47, WHITE], [64, 47, WHITE],
  [30, 64, ORANGE], [47, 64, WHITE], [64, 64, WHITE],
];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** scale enlarges the grid around the center (iPhone icons are not cropped to a circle). */
export function iconPng(size, scale = 1) {
  const unit = size / 108;
  const at = (v) => 54 + (v - 54) * scale;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let color = NAVY;
      for (const [sx, sy, c] of SQUARES) {
        if (x >= at(sx) * unit && x < at(sx + 14) * unit && y >= at(sy) * unit && y < at(sy + 14) * unit) color = c;
      }
      raw.set(color, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 180 (iPhone) and 192 fill most of the tile; 512 is also "maskable" (cropped to a circle), so it stays
// inside the safe zone (corners at 0.38 of the width from the center, limit 0.4).
for (const [size, scale] of [[180, 1.5], [192, 1.5], [512, 1.2]]) {
  writeFileSync(new URL(`../app/icons/icon-${size}.png`, import.meta.url), iconPng(size, scale));
}
console.log('icons written: 180, 192, 512');
