"use client";

import { useState, useCallback, useRef } from "react";
import { Rocket, ChevronRight, CircleAlert as AlertCircle, RefreshCw } from "lucide-react";
import { StarField } from "@/components/StarField";
import { APStarLogo } from "@/components/APStarLogo";
import { UploadZone } from "@/components/UploadZone";
import { GenerationProgress } from "@/components/GenerationProgress";
import { ResultDisplay } from "@/components/ResultDisplay";
import { supabase } from "@/lib/supabase";
import { fileToResizedBase64 } from "@/lib/imageUtils";
import type { AppState } from "@/lib/types";


export default function Home() {
  const [appState, setAppState] = useState<AppState>({ phase: "landing" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [nameError, setNameError] = useState("");
  const composingRef = useRef(false);

  const isReadyToGenerate = !!selectedFile && userName.length >= 2 && userName.length <= 3 && !nameError;

  const handleImageSelected = useCallback((file: File, preview: string) => {
    setSelectedFile(file);
    setPreviewUrl(preview);
  }, []);

  const commitNameValue = (value: string) => {
    const chineseOnly = value.replace(/[^\u4e00-\u9fff]/g, "");
    const trimmed = chineseOnly.slice(0, 3);
    setUserName(trimmed);
    setRawInput(trimmed);
    if (trimmed.length > 0 && trimmed.length < 2) {
      setNameError("请输入2-3个中文字");
    } else {
      setNameError("");
    }
  };

  const handleNameInput = (value: string) => {
    setRawInput(value);
    if (!composingRef.current) {
      commitNameValue(value);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile || !userName) return;

    setAppState({ phase: "generating", sessionId: "" });

    try {
      const { data: session, error: sessionError } = await supabase
        .from("photo_sessions")
        .insert({ status: "generating", user_name: userName })
        .select()
        .single();

      if (sessionError) throw new Error("Failed to create session");

      const base64 = await fileToResizedBase64(selectedFile, 1024);

      const response = await fetch("/api/generate-spacesuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, userName }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Generation failed");
      }

      await supabase
        .from("photo_sessions")
        .update({
          status: "completed",
          generated_image_url: result.imageBase64,
        })
        .eq("id", session.id);

      setAppState({
        phase: "result",
        sessionId: session.id,
        generatedImageUrl: result.imageBase64,
        originalImageUrl: previewUrl || "",
        userName,
      });
    } catch (err) {
      setAppState({
        phase: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    }
  };

  const handleReset = () => {
    setAppState({ phase: "upload" });
    setSelectedFile(null);
    setPreviewUrl(null);
    setUserName("");
    setRawInput("");
    setNameError("");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden grid-bg">
      <StarField />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-6 py-5 flex items-center justify-between">
          <APStarLogo size="md" />
          <div className="text-right">
            <p className="text-cyan-400 text-xs font-medium tracking-widest uppercase">
              Aerospace Science Day
            </p>
            <p className="text-slate-400 text-xs mt-0.5">航天科普日</p>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-start px-4 pb-10">
          {appState.phase === "landing" && (
            <LandingSection onStart={() => setAppState({ phase: "upload" })} />
          )}

          {appState.phase === "upload" && (
            <div className="w-full max-w-lg mx-auto pt-6 animate-fade-up space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-white text-2xl font-bold">上传您的照片</h2>
                <p className="text-slate-400 text-sm">
                  AI 将为您生成一张身穿宇航服的专属照片
                </p>
              </div>

              <UploadZone onImageSelected={handleImageSelected} />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  您的中文姓名
                </label>
                <input
                  type="text"
                  value={rawInput}
                  onChange={(e) => handleNameInput(e.target.value)}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={(e) => {
                    composingRef.current = false;
                    commitNameValue(e.currentTarget.value);
                  }}
                  placeholder="例如：张三"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-cyan-500/30 text-white placeholder-slate-500 text-base font-medium tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                />
                {nameError && (
                  <p className="text-red-400 text-xs">{nameError}</p>
                )}
                <p className="text-slate-500 text-xs">仅限中文，2-3个字</p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!isReadyToGenerate}
                className={`
                  w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2
                  transition-all duration-300
                  ${isReadyToGenerate
                    ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-white hover:from-cyan-400 hover:to-sky-400 animate-pulse-glow active:scale-[0.98] cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }
                `}
              >
                <Rocket size={20} />
                开始 AI 生成
                <ChevronRight size={20} />
              </button>

              <StepIndicator currentStep={1} />
            </div>
          )}

          {appState.phase === "generating" && (
            <div className="w-full max-w-lg mx-auto pt-6 animate-fade-up">
              <div className="glass-card rounded-2xl cyber-border">
                <GenerationProgress />
              </div>
              <StepIndicator currentStep={2} />
            </div>
          )}

          {appState.phase === "result" && (
            <div className="w-full max-w-lg mx-auto pt-6 animate-scale-in">
              <ResultDisplay
                generatedImageUrl={appState.generatedImageUrl}
                userName={appState.userName}
                onReset={handleReset}
              />
              <StepIndicator currentStep={3} />
            </div>
          )}

          {appState.phase === "error" && (
            <div className="w-full max-w-lg mx-auto pt-10 animate-fade-up">
              <div className="glass-card rounded-2xl p-8 text-center space-y-5 cyber-border">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
                  <AlertCircle size={32} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white text-xl font-semibold mb-2">生成失败</h3>
                  <p className="text-slate-400 text-sm">
                    {appState.message.includes("not configured")
                      ? "AI 服务暂未配置，请联系工作人员。"
                      : "生成过程中出现错误，请重试。"}
                  </p>
                  <p className="text-red-400 text-xs mt-2 font-mono break-words">{appState.message}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 mx-auto px-8 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-medium hover:bg-cyan-500/30 transition-colors"
                >
                  <RefreshCw size={18} />
                  重新尝试
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className="relative z-10 py-5 text-center border-t border-white/5">
          <p className="text-slate-600 text-xs">
            © 2024 APSTAR 亚太卫星控股有限公司 · 航天科普日
          </p>
        </footer>
      </div>
    </div>
  );
}

function LandingSection({ onStart }: { onStart: () => void }) {
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center pt-8 pb-6 space-y-10 animate-fade-up">
      <div className="space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-sky-500/10 border border-cyan-400/30 flex items-center justify-center animate-float shadow-[0_0_60px_rgba(34,211,238,0.2)]">
            <Rocket size={56} className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
          </div>

          <div
            className="absolute w-4 h-4 rounded-full bg-cyan-400/60 animate-orbit"
            style={{ animationDuration: "5s" }}
          />
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-sky-300/50 animate-orbit"
            style={{ animationDuration: "8s", animationDirection: "reverse" }}
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="shimmer-text">航天科普日</span>
          </h1>
          <p className="text-xl font-bold text-white tracking-widest">
            AEROSPACE SCIENCE DAY
          </p>
        </div>

        <div className="w-px h-8 bg-gradient-to-b from-cyan-400/60 to-transparent mx-auto" />

        <p className="text-slate-300 text-lg font-medium">
          AI 宇航员变身体验
        </p>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
          上传一张您的照片，亚太卫星 AI 将为您生成一张<br />
          身穿专业宇航服的太空大片！
        </p>
      </div>

      <div className="w-full space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "01", icon: "📸", label: "上传照片" },
            { step: "02", icon: "🤖", label: "AI 生成" },
            { step: "03", icon: "🚀", label: "保存分享" },
          ].map(({ step, icon, label }) => (
            <div
              key={step}
              className="glass-card rounded-xl p-3 flex flex-col items-center gap-2"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-cyan-400 text-xs font-bold tracking-widest">{step}</span>
              <span className="text-white text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-sky-500 text-white hover:from-cyan-400 hover:to-sky-400 transition-all duration-300 animate-pulse-glow active:scale-[0.98]"
        >
          <Rocket size={20} />
          立即开始体验
          <ChevronRight size={20} />
        </button>

        <p className="text-slate-500 text-xs">
          Powered by APSTAR AI · 亚太卫星人工智能
        </p>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ["上传照片", "AI 生成", "保存分享"];
  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      {steps.map((label, i) => {
        const step = i + 1;
        const active = step === currentStep;
        const done = step < currentStep;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  done
                    ? "bg-cyan-500 text-white"
                    : active
                    ? "bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400"
                    : "bg-slate-800 border border-slate-700 text-slate-500"
                }`}
              >
                {done ? "✓" : step}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? "text-cyan-400" : done ? "text-cyan-600" : "text-slate-600"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-10 h-px mb-4 transition-all duration-300 ${
                  done ? "bg-cyan-500" : "bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
