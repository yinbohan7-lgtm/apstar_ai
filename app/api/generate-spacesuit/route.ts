import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

let templateBufferCache: Buffer | null = null;

function getTemplateBuffer(): Buffer {
  if (templateBufferCache) return templateBufferCache;
  const filePath = join(process.cwd(), "public", "unnamed.jpg");
  templateBufferCache = readFileSync(filePath);
  return templateBufferCache;
}

function generateCircleMaskPNG(
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number
): Buffer {
  const pixels = Buffer.alloc(width * height * 4, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * width + x) * 4;

      if (dist <= radius) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      }
    }
  }

  return encodePNG(width, height, pixels);
}

function encodePNG(width: number, height: number, rgba: Buffer): Buffer {
  const crc32Table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc32Table[n] = c;
  }

  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function adler32(buf: Buffer): number {
    let a = 1,
      b = 0;
    for (let i = 0; i < buf.length; i++) {
      a = (a + buf[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }

  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0;
    rgba.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const MAX_BLOCK = 65535;
  const numBlocks = Math.ceil(rawData.length / MAX_BLOCK);
  const deflateSize = 2 + rawData.length + numBlocks * 5 + 4;
  const deflated = Buffer.alloc(deflateSize);
  let pos = 0;
  deflated[pos++] = 0x78;
  deflated[pos++] = 0x01;

  for (let i = 0; i < numBlocks; i++) {
    const start = i * MAX_BLOCK;
    const end = Math.min(start + MAX_BLOCK, rawData.length);
    const len = end - start;
    const isLast = i === numBlocks - 1;
    deflated[pos++] = isLast ? 1 : 0;
    deflated[pos++] = len & 0xff;
    deflated[pos++] = (len >> 8) & 0xff;
    deflated[pos++] = ~len & 0xff;
    deflated[pos++] = (~len >> 8) & 0xff;
    rawData.copy(deflated, pos, start, end);
    pos += len;
  }

  const adl = adler32(rawData);
  deflated[pos++] = (adl >> 24) & 0xff;
  deflated[pos++] = (adl >> 16) & 0xff;
  deflated[pos++] = (adl >> 8) & 0xff;
  deflated[pos++] = adl & 0xff;

  const idatData = deflated.subarray(0, pos);

  function makeChunk(type: string, data: Buffer): Buffer {
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, "ascii");
    data.copy(chunk, 8);
    const crcBuf = Buffer.alloc(4 + data.length);
    crcBuf.write(type, 0, 4, "ascii");
    data.copy(crcBuf, 4);
    chunk.writeUInt32BE(crc32(crcBuf), 8 + data.length);
    return chunk;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", idatData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, userName } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
    }

    if (!userName || typeof userName !== "string") {
      return NextResponse.json({ error: "Missing userName" }, { status: 400 });
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Stability AI API not configured" },
        { status: 503 }
      );
    }

    const templateBuffer = getTemplateBuffer();

    const maskWidth = 1024;
    const maskHeight = 1024;
    const maskPNG = generateCircleMaskPNG(maskWidth, maskHeight, 512, 380, 180);

    const formData = new FormData();

    const imageBlob = new Blob([templateBuffer], { type: "image/jpeg" });
    formData.append("image", imageBlob, "image.jpg");

    const maskBlob = new Blob([maskPNG], { type: "image/png" });
    formData.append("mask", maskBlob, "mask.png");

    formData.append(
      "prompt",
      "Original facial features and identity of the person in the source image, high fidelity face preservation, same face looking through a clear glass helmet visor, natural even lighting, space mission portrait"
    );
    formData.append("strength", "0.2");
    formData.append("output_format", "png");

    const stabilityResponse = await fetch(
      "https://api.stability.ai/v2beta/stable-image/edit/inpaint",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/*",
        },
        body: formData,
      }
    );

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text();
      console.error("Stability API error:", stabilityResponse.status, errorText);

      let friendlyError = `Inpainting failed (${stabilityResponse.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) friendlyError = errorJson.message;
        if (errorJson.errors) friendlyError = JSON.stringify(errorJson.errors);
      } catch {}

      return NextResponse.json({ error: friendlyError }, { status: 500 });
    }

    const arrayBuffer = await stabilityResponse.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString("base64");

    const contentType = stabilityResponse.headers.get("content-type") || "image/png";
    const mimeType = contentType.includes("image/") ? contentType.split(";")[0] : "image/png";

    return NextResponse.json({
      imageBase64: `data:${mimeType};base64,${resultBase64}`,
      userName,
    });
  } catch (err) {
    console.error("API route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
