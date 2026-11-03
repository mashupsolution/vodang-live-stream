import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../apps/web/public/assets/", import.meta.url);
const docsQa = new URL("../docs/qa/", import.meta.url);
const docsRef = new URL("../docs/reference/", import.meta.url);

/**
 * Chroma-key unmixing and despill for #FF00FF magenta backdrops.
 * Eliminates fringe and unmixes edge transparency cleanly.
 */
function unmixChroma(rawBuffer, width, height, channels) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;
    const r = rawBuffer[srcIdx];
    const g = rawBuffer[srcIdx + 1];
    const b = rawBuffer[srcIdx + 2];

    // Magenta excess: m is high when R and B are high and G is low
    const m = (Math.min(r, b) - g) / 255;

    if (m >= 0.86) {
      // Pure #FF00FF backdrop within JPEG tolerance
      out[dstIdx] = 0;
      out[dstIdx + 1] = 0;
      out[dstIdx + 2] = 0;
      out[dstIdx + 3] = 0;
    } else if (m <= 0.04) {
      // Pure foreground
      out[dstIdx] = r;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = b;
      out[dstIdx + 3] = 255;
    } else {
      // Anti-aliased silhouette edge or semi-transparent mist
      const t = (m - 0.04) / (0.86 - 0.04);
      const a = 1 - t;
      const alpha = Math.round(a * 255);
      const aSafe = Math.max(a, 0.08);

      // Unmix #FF00FF contribution ((1 - a) * 255) from R and B
      let rClean = Math.min(
        255,
        Math.max(0, Math.round((r - (1 - a) * 255) / aSafe)),
      );
      let gClean = Math.min(255, Math.max(0, Math.round(g / aSafe)));
      let bClean = Math.min(
        255,
        Math.max(0, Math.round((b - (1 - a) * 255) / aSafe)),
      );

      // Clamp residual magenta fringe
      if (rClean > gClean && bClean > gClean) {
        bClean = gClean;
        rClean = Math.min(rClean, Math.round(gClean * 1.15));
      }

      out[dstIdx] = rClean;
      out[dstIdx + 1] = gClean;
      out[dstIdx + 2] = bClean;
      out[dstIdx + 3] = alpha;
    }
  }
  return out;
}

// 1. Prepare linh-son-hall.png
const rawHallJpg = existsSync(new URL("vo-dang-hall-raw.jpg", root))
  ? new URL("vo-dang-hall-raw.jpg", root)
  : new URL("linh_son_hall_1793506602631.jpg", root);
const hallPng = new URL("linh-son-hall.png", root);
if (existsSync(rawHallJpg)) {
  await sharp(rawHallJpg.pathname).png().toFile(hallPng.pathname);
  await sharp(rawHallJpg.pathname)
    .jpeg({ quality: 95 })
    .toFile(new URL("vo-dang-concept.jpg", docsRef).pathname);
}

// 2. Prepare tu-linh-dinh.png with chroma unmixing
const rawDinhJpg = existsSync(new URL("chan-vu-dinh-raw.jpg", root))
  ? new URL("chan-vu-dinh-raw.jpg", root)
  : new URL("tu_linh_dinh_1793506705952.jpg", root);
const dinhPng = new URL("tu-linh-dinh.png", root);
if (existsSync(rawDinhJpg)) {
  const dinhImg = sharp(rawDinhJpg.pathname);
  const { data, info } = await dinhImg
    .raw()
    .toBuffer({ resolveWithObject: true });
  const unmixedDinh = unmixChroma(data, info.width, info.height, info.channels);
  await sharp(unmixedDinh, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(dinhPng.pathname);
}

// 3. Prepare cultivators-source.png with chroma unmixing
const rawCultivatorsJpg = existsSync(new URL("cultivators-vudang-raw.jpg", root))
  ? new URL("cultivators-vudang-raw.jpg", root)
  : new URL("cultivators_source_atlas_1793506710561.jpg", root);
const cultivatorsSourcePng = new URL("cultivators-source.png", root);
if (existsSync(rawCultivatorsJpg)) {
  const cultImg = sharp(rawCultivatorsJpg.pathname);
  const { data, info } = await cultImg
    .raw()
    .toBuffer({ resolveWithObject: true });
  const unmixedCult = unmixChroma(data, info.width, info.height, info.channels);
  await sharp(unmixedCult, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(cultivatorsSourcePng.pathname);
}

// 4. Build runtime linh-son-hall.webp (1080x1920, opaque)
await sharp(hallPng.pathname)
  .resize(1080, 1920, { fit: "fill" })
  .webp({ quality: 90 })
  .toFile(new URL("linh-son-hall.webp", root).pathname);

// 5. Build runtime tu-linh-dinh.webp (cropped tight + padded, width 880)
const dinhSource = await sharp(dinhPng.pathname)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: dW, height: dH, channels: dC } = dinhSource.info;
let dMinX = dW,
  dMinY = dH,
  dMaxX = 0,
  dMaxY = 0;
for (let y = 0; y < dH; y++) {
  for (let x = 0; x < dW; x++) {
    const alpha = dinhSource.data[(y * dW + x) * dC + 3];
    if (alpha > 16) {
      dMinX = Math.min(dMinX, x);
      dMinY = Math.min(dMinY, y);
      dMaxX = Math.max(dMaxX, x);
      dMaxY = Math.max(dMaxY, y);
    }
  }
}
const cropLeft = Math.max(0, dMinX - 16);
const cropTop = Math.max(0, dMinY - 16);
const cropRight = Math.min(dW - 1, dMaxX + 16);
const cropBottom = Math.min(dH - 1, dMaxY + 4);
const cropW = cropRight - cropLeft + 1;
const cropH = cropBottom - cropTop + 1;
const dinhTargetW = 880;
const dinhTargetH = Math.round(cropH * (dinhTargetW / cropW));

await sharp(dinhSource.data, { raw: dinhSource.info })
  .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
  .resize(dinhTargetW, dinhTargetH)
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(new URL("tu-linh-dinh.webp", root).pathname);

// 6. Build runtime cultivators.png (4 cols x 2 rows, scaled per row, baseline at y=490)
const cultSource = await sharp(cultivatorsSourcePng.pathname)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: cW, height: cH, channels: cC } = cultSource.info;
const cellW = Math.floor(cW / 4);
const cellH = Math.floor(cH / 2);
const frames = [];

for (let row = 0; row < 2; row++) {
  const bounds = [];
  for (let col = 0; col < 4; col++) {
    let minX = cellW,
      minY = cellH,
      maxX = 0,
      maxY = 0;
    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        const a =
          cultSource.data[((row * cellH + y) * cW + col * cellW + x) * cC + 3];
        if (a > 32) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxY <= minY) throw new Error(`Missing cultivator frame ${row}:${col}`);
    bounds.push({
      left: col * cellW + minX,
      top: row * cellH + minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    });
  }

  const maxH = Math.max(...bounds.map((b) => b.height));
  const scale = 448 / maxH;

  for (let col = 0; col < 4; col++) {
    const b = bounds[col];
    const w = Math.round(b.width * scale);
    const h = Math.round(b.height * scale);

    const croppedPose = await sharp(cultSource.data, { raw: cultSource.info })
      .extract(b)
      .resize(w, h)
      .png()
      .toBuffer();

    const tile = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: croppedPose, left: Math.round((512 - w) / 2), top: 490 - h },
      ])
      .png()
      .toBuffer();

    frames.push({ input: tile, left: col * 512, top: row * 512 });
  }
}

await sharp({
  create: {
    width: 2048,
    height: 1024,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(frames)
  .png()
  .toFile(new URL("cultivators.png", root).pathname);

// 7. Generate checkerboard QA preview sheet (docs/qa/cultivators-preview.png)
const checkW = 2048,
  checkH = 1024,
  squareSize = 32;
const checkBuf = Buffer.alloc(checkW * checkH * 4);
for (let y = 0; y < checkH; y++) {
  const isBaseline = y === 490 || y === 1002;
  for (let x = 0; x < checkW; x++) {
    const idx = (y * checkW + x) * 4;
    if (isBaseline) {
      // Subtle golden baseline guide line
      checkBuf[idx] = 212;
      checkBuf[idx + 1] = 175;
      checkBuf[idx + 2] = 55;
      checkBuf[idx + 3] = 255;
    } else {
      const isDark =
        (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
      const c = isDark ? 42 : 72;
      checkBuf[idx] = c;
      checkBuf[idx + 1] = c + 4;
      checkBuf[idx + 2] = c + 12;
      checkBuf[idx + 3] = 255;
    }
  }
}

const checkBase = await sharp(checkBuf, {
  raw: { width: checkW, height: checkH, channels: 4 },
})
  .png()
  .toBuffer();

await sharp(checkBase)
  .composite([
    { input: new URL("cultivators.png", root).pathname, left: 0, top: 0 },
  ])
  .png()
  .toFile(new URL("cultivators-preview.png", docsQa).pathname);

// 8. Quality gates & assets.json report
const reports = [];
let totalDecodedBytes = 0;
for (const [file, requireAlpha] of [
  ["linh-son-hall.webp", false],
  ["tu-linh-dinh.webp", true],
  ["cultivators.png", true],
]) {
  const img = sharp(new URL(file, root).pathname);
  const meta = await img.metadata();
  const stats = await img.stats();
  const alpha = meta.hasAlpha ? stats.channels.at(-1) : null;
  if (requireAlpha && (!alpha || alpha.min !== 0 || alpha.max !== 255)) {
    throw new Error(
      `${file}: missing useful alpha (min=${alpha?.min}, max=${alpha?.max})`,
    );
  }
  const decodedBytes = meta.width * meta.height * (meta.hasAlpha ? 4 : 3);
  totalDecodedBytes += decodedBytes;
  reports.push({
    file,
    width: meta.width,
    height: meta.height,
    hasAlpha: meta.hasAlpha,
    alphaRange: alpha ? [alpha.min, alpha.max] : null,
    decodedBytes,
  });
}

if (totalDecodedBytes >= 32 * 1024 * 1024) {
  throw new Error(
    `Total decoded texture memory exceeds budget: ${totalDecodedBytes} >= 32MB`,
  );
}

await mkdir(docsQa.pathname, { recursive: true });
await writeFile(
  new URL("assets.json", docsQa).pathname,
  JSON.stringify(reports, null, 2) + "\n",
);

console.log("Assets report:", JSON.stringify(reports, null, 2));
console.log(
  `Total decoded bytes: ${(totalDecodedBytes / (1024 * 1024)).toFixed(2)} MB (< 32 MB budget)`,
);
