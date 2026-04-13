"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Camera, Image as ImageIcon } from "lucide-react";

interface UploadZoneProps {
  onImageSelected: (file: File, previewUrl: string) => void;
}

export function UploadZone({ onImageSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onImageSelected(file, url);
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300
          flex flex-col items-center justify-center p-10 min-h-[280px] overflow-hidden
          ${isDragging
            ? "border-cyan-400 bg-cyan-400/10 scale-[1.02]"
            : "border-cyan-500/40 bg-white/5 hover:border-cyan-400/70 hover:bg-cyan-400/5"
          }
        `}
      >
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: isDragging
              ? "inset 0 0 40px rgba(34,211,238,0.15), 0 0 40px rgba(34,211,238,0.1)"
              : "inset 0 0 20px rgba(34,211,238,0.05)",
          }}
        />

        {preview ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 max-w-full rounded-xl object-cover ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            />
            <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-xs text-cyan-300 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                点击更换照片
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-cyan-400/10 flex items-center justify-center border border-cyan-400/30">
                <ImageIcon size={36} className="text-cyan-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-cyan-400/20 flex items-center justify-center">
                <Upload size={12} className="text-cyan-400" />
              </div>
            </div>
            <p className="text-white text-lg font-semibold mb-1">上传您的照片</p>
            <p className="text-slate-400 text-sm text-center">
              拖拽图片至此处，或点击选择
            </p>
            <p className="text-slate-500 text-xs mt-2">支持 JPG、PNG 格式</p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      <button
        onClick={() => cameraInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-cyan-500/30 bg-white/5 text-cyan-300 text-sm font-medium hover:bg-cyan-400/10 hover:border-cyan-400/60 transition-all duration-200 active:scale-[0.98]"
      >
        <Camera size={18} />
        拍照上传
      </button>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
