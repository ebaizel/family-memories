// Generates the PWA icons (amber rounded square with a white heart) as PNGs
// without any image library — raw RGBA scanlines + zlib + hand-rolled chunks.
// Run: node scripts/gen-icons.mjs   (outputs to public/icons/)
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Heart shape test in unit coords: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
const inHeart = (x, y) => {
  const f = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
  return f <= 0;
};

function drawIcon(size) {
  const bg = [0xb4, 0x53, 0x09]; // warm amber
  const fg = [0xff, 0xff, 0xff];
  const radius = size * 0.22; // rounded-corner radius
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3; // 3x3 supersampling for smooth edges
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let inRect = 0, heart = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          // rounded-rect coverage
          const cx = Math.max(radius - x, x - (size - radius), 0);
          const cy = Math.max(radius - y, y - (size - radius), 0);
          if (cx * cx + cy * cy <= radius * radius) inRect++;
          // heart coverage (centered, scaled; heart eq is y-up)
          const hx = ((x - size / 2) / (size * 0.30));
          const hy = -((y - size / 2.15) / (size * 0.30));
          if (inHeart(hx, hy)) heart++;
        }
      }
      const i = (py * size + px) * 4;
      const rectA = inRect / (SS * SS);
      const heartA = heart / (SS * SS);
      const r = bg[0] + (fg[0] - bg[0]) * heartA;
      const g = bg[1] + (fg[1] - bg[1]) * heartA;
      const b = bg[2] + (fg[2] - bg[2]) * heartA;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = Math.round(rectA * 255);
    }
  }
  return png(size, size, rgba);
}

const outDir = path.resolve("public/icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [512, 192, 180]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), drawIcon(size));
  console.log(`icon-${size}.png`);
}
