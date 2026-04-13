"use client";

import { useState, useEffect, useRef } from "react";
import { Download, RefreshCw, Share2, Check } from "lucide-react";

interface ResultDisplayProps {
  generatedImageUrl: string;
  userName: string;
  onReset: () => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawApstarLogoOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const padding = size * 0.15;
  const boxW = size * 2.8;
  const boxH = size * 1.1;

  ctx.save();
  ctx.fillStyle = "rgba(0, 8, 30, 0.72)";
  ctx.beginPath();
  const r = size * 0.18;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + boxW - r, y);
  ctx.quadraticCurveTo(x + boxW, y, x + boxW, y + r);
  ctx.lineTo(x + boxW, y + boxH - r);
  ctx.quadraticCurveTo(x + boxW, y + boxH, x + boxW - r, y + boxH);
  ctx.lineTo(x + r, y + boxH);
  ctx.quadraticCurveTo(x, y + boxH, x, y + boxH - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  const iconSize = size * 0.55;
  const iconX = x + padding;
  const iconY = y + (boxH - iconSize) / 2;
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = iconSize * 0.1;
  ctx.lineCap = "round";

  const cx = iconX + iconSize / 2;
  const cy = iconY + iconSize / 2;
  const orbitR = iconSize * 0.42;
  ctx.beginPath();
  ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy, orbitR, orbitR * 0.35, Math.PI / 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.arc(cx + orbitR * 0.55, cy - orbitR * 0.55, iconSize * 0.1, 0, Math.PI * 2);
  ctx.fill();

  const textX = x + padding + iconSize + padding * 0.8;
  ctx.font = `900 ${size * 0.44}px Arial, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(34,211,238,0.6)";
  ctx.shadowBlur = size * 0.3;
  ctx.fillText("APSTAR", textX, y + boxH * 0.52);
  ctx.shadowBlur = 0;

  ctx.font = `500 ${size * 0.27}px Arial, sans-serif`;
  ctx.fillStyle = "#22d3ee";
  ctx.fillText("亚太卫星  航天科普日", textX, y + boxH * 0.82);

  ctx.restore();
}

const REF_W = 1024;
const REF_H = 1024;
const BADGE_X = 425;
const BADGE_Y = 745;
const BADGE_W = 160;
const BADGE_H = 55;

function drawNameBadge(
  ctx: CanvasRenderingContext2D,
  userName: string,
  imgW: number,
  imgH: number
) {
  const scaleX = imgW / REF_W;
  const scaleY = imgH / REF_H;

  const bx = BADGE_X * scaleX;
  const by = BADGE_Y * scaleY;
  const bw = BADGE_W * scaleX;
  const bh = BADGE_H * scaleY;

  ctx.save();

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(bx, by, bw, bh);

  const baseFontSize = 36;
  const fontSize = Math.floor(baseFontSize * Math.min(scaleX, scaleY));

  ctx.font = `bold ${fontSize}px "SimSun", "SimHei", "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(userName, bx + bw / 2, by + bh / 2);

  ctx.restore();
}

async function compositeImage(imageUrl: string, userName: string): Promise<string> {
  try {
    const img = await loadImage(imageUrl);

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(img, 0, 0);

    drawNameBadge(ctx, userName, img.width, img.height);

    const barHeight = Math.floor(img.height * 0.12);
    const gradient = ctx.createLinearGradient(0, img.height - barHeight, 0, img.height);
    gradient.addColorStop(0, "rgba(0, 8, 30, 0)");
    gradient.addColorStop(1, "rgba(0, 8, 30, 0.88)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, img.height - barHeight, img.width, barHeight);

    const logoSize = Math.floor(img.width * 0.07);
    const margin = Math.floor(img.width * 0.025);
    drawApstarLogoOnCanvas(ctx, margin, margin, logoSize);

    const tagFontSize = Math.floor(img.width * 0.02);
    const padding = Math.floor(img.width * 0.025);
    const bottomPad = Math.floor(barHeight * 0.32);
    ctx.font = `600 ${tagFontSize}px Arial, sans-serif`;
    ctx.fillStyle = "rgba(34, 211, 238, 0.85)";
    const tag = "AEROSPACE SCIENCE DAY";
    const tagWidth = ctx.measureText(tag).width;
    ctx.fillText(tag, img.width - padding - tagWidth, img.height - bottomPad);

    return canvas.toDataURL("image/jpeg", 0.95);
  } catch {
    return imageUrl;
  }
}

export function ResultDisplay({ generatedImageUrl, userName, onReset }: ResultDisplayProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    compositeImage(generatedImageUrl, userName).then(setCompositeUrl);
  }, [generatedImageUrl, userName]);

  const getFinalImage = () => compositeUrl || generatedImageUrl;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const finalUrl = getFinalImage();
      const link = document.createElement("a");
      link.href = finalUrl;
      link.download = `apstar-astronaut-${Date.now()}.jpg`;
      link.click();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    setSharing(true);
    try {
      const finalUrl = getFinalImage();
      const res = await fetch(finalUrl);
      const blob = await res.blob();
      const file = new File([blob], "apstar-astronaut.jpg", { type: "image/jpeg" });
      await navigator.share({
        title: "亚太卫星 APSTAR 航天科普日",
        text: "我在亚太卫星航天科普日变身宇航员啦！",
        files: [file],
      });
    } catch {
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-white text-xl font-semibold">您的宇航员照片已生成！</h3>
        <p className="text-slate-400 text-sm">Your astronaut photo is ready</p>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
        <img
          src={compositeUrl || generatedImageUrl}
          alt="Generated astronaut photo"
          className="w-full object-cover"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.97] bg-gradient-to-r from-cyan-500 to-sky-500 text-white hover:from-cyan-400 hover:to-sky-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-70"
        >
          {downloaded ? (
            <>
              <Check size={18} />
              已保存
            </>
          ) : downloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Download size={18} />
              保存照片
            </>
          )}
        </button>

        {typeof navigator !== "undefined" && "share" in navigator ? (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.97] bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:border-white/30 disabled:opacity-70"
          >
            {sharing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Share2 size={18} />
            )}
            分享
          </button>
        ) : (
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.97] bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:border-white/30"
          >
            <RefreshCw size={18} />
            重新生成
          </button>
        )}
      </div>

      <button
        onClick={onReset}
        className="w-full text-slate-500 text-sm hover:text-slate-300 transition-colors py-2"
      >
        重新上传照片
      </button>
    </div>
  );
}
