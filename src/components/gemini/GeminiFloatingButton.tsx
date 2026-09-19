import React from 'react';
import { Sparkles } from 'lucide-react';
import { getStoredGeminiApiKey } from '../../utils/gemini';

interface GeminiFloatingButtonProps {
  onClick: () => void;
}

export const GeminiFloatingButton: React.FC<GeminiFloatingButtonProps> = ({ onClick }) => {
  const hasApiKey = !!getStoredGeminiApiKey();

  return (
    <div className="no-print fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center group">
      {/* PCホバー時に現れる吹き出し（モバイルでは非表示） */}
      <div className="mr-2.5 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700/80 text-white text-xs font-bold shadow-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-x-2 group-hover:translate-x-0 hidden md:flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Gemini AIに夜市運営を相談</span>
      </div>

      {/* メインのフローティングボタン */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Gemini AIアシスタントを開く"
        className="relative p-0.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-600 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-amber-400/40 cursor-pointer"
      >
        <div className="flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-slate-950/95 backdrop-blur-sm text-white font-black text-xs tracking-wider">
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            </span>
          </div>
          <span className="bg-gradient-to-r from-amber-300 via-white to-indigo-200 bg-clip-text text-transparent text-xs sm:text-xs">
            Gemini AI
          </span>
        </div>
      </button>
    </div>
  );
};
