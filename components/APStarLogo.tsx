import { Satellite } from "lucide-react";

interface APStarLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function APStarLogo({ size = "md", className = "" }: APStarLogoProps) {
  const config = {
    sm: { icon: 18, title: "text-base", sub: "text-[10px]", gap: "gap-2" },
    md: { icon: 28, title: "text-2xl", sub: "text-xs", gap: "gap-3" },
    lg: { icon: 44, title: "text-4xl", sub: "text-sm", gap: "gap-4" },
  }[size];

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      <div className="relative">
        <Satellite
          size={config.icon}
          className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
        />
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={`${config.title} font-black tracking-[0.2em] text-white drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]`}
        >
          APSTAR
        </span>
        <span className={`${config.sub} tracking-[0.3em] text-cyan-400 font-medium`}>
          亚太卫星
        </span>
      </div>
    </div>
  );
}
