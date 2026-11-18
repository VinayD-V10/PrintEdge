import React from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { ShopStatusInfo } from '../types/printease';

interface HeroHeaderProps {
  onStartUpload: () => void;
  onTrackOrder?: () => void;
  onOpenStoredFiles?: () => void;
  onOpenOrders?: (tab?: 'orders' | 'files') => void;
  shopStatus?: ShopStatusInfo | null;
}

export const HeroHeader: React.FC<HeroHeaderProps> = ({
  onStartUpload,
}) => {
  return (
    <div className="bg-gradient-to-br from-[#422C09] via-[#5A3C0B] to-[#422C09] text-[#FFF5E1] rounded-3xl p-6 sm:p-10 shadow-2xl border-2 border-[#C48B28]/40 relative overflow-hidden mb-6">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#C48B28]/20 rounded-full blur-3xl pointer-events-none animate-float-smooth" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-[#C48B28]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/30 border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-bold tracking-wide shadow-xs mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C48B28] animate-pulse-subtle" />
            <span>Fastest Campus Xerox &amp; Printing Station</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#FFF5E1] mb-2">
            Print<span className="text-[#C48B28] underline decoration-[#C48B28]/40">Ease</span>
          </h1>

          <p className="text-xl sm:text-2xl font-bold text-[#FFF5E1] mb-1">
            &ldquo;Your Documents. Our Priority.&rdquo;
          </p>

          <p className="text-sm sm:text-base text-[#FFF5E1]/80 font-semibold tracking-wide">
            Upload • Pay • Print • Done!
          </p>
        </div>

        {/* Single Primary CTA */}
        <div className="flex items-stretch sm:items-center shrink-0">
          <button
            type="button"
            onClick={onStartUpload}
            className="btn-smooth btn-dual-shimmer w-full sm:w-auto px-7 py-4 text-[#FFF5E1] font-black text-sm sm:text-base rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer animate-dual-glow border border-[#C48B28]"
          >
            <Upload className="w-5 h-5 text-[#FFF5E1]" />
            <span>Upload Document &amp; Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
