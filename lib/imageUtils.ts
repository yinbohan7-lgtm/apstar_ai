"use client";

export async function fileToResizedBase64(file: File, targetSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;

      const squareSize = Math.min(w, h);
      const sx = (w - squareSize) / 2;
      const sy = (h - squareSize) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, squareSize, squareSize, 0, 0, targetSize, targetSize);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = url;
  });
}
