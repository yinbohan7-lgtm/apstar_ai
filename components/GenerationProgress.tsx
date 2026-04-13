"use client";

import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";

const STEPS = [
  "正在分析您的照片...",
  "AI 正在处理面部特征...",
  "生成宇航服造型...",
  "添加太空背景...",
  "最终渲染中...",
];

export function GenerationProgress() {
  const [stepIndex, setStepIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(dotTimer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 space-y-10">
      <div className="relative flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border-2 border-cyan-400/20 flex items-center justify-center">
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-t-cyan-400 border-r-cyan-400/50 border-b-transparent border-l-transparent animate-spin"
            style={{ animationDuration: "1.5s" }}
          />
          <div
            className="absolute w-24 h-24 rounded-full border-2 border-b-sky-400 border-l-sky-400/50 border-t-transparent border-r-transparent animate-spin"
            style={{ animationDuration: "2.5s", animationDirection: "reverse" }}
          />
          <div className="w-16 h-16 rounded-full bg-cyan-400/10 flex items-center justify-center border border-cyan-400/30">
            <Rocket
              size={28}
              className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            />
          </div>
        </div>

        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cyan-400 animate-ping opacity-75" />
        <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-sky-400 animate-ping opacity-60" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="text-center space-y-3">
        <h3 className="text-white text-xl font-semibold">AI 正在生成您的宇航员照片</h3>
        <p className="text-cyan-300 text-sm font-medium min-h-[24px]">
          {STEPS[stepIndex]}{dots}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>处理进度</span>
          <span>{Math.round(((stepIndex + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-[1500ms] ease-out"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <p className="text-slate-500 text-xs text-center max-w-xs">
        AI 正在为您量身定制宇航服造型，大约需要 30-60 秒，请稍候...
      </p>
    </div>
  );
}
