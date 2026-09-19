import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Instagram アカウント・URL ユーティリティ & アイコンコンポーネント
 */

export const getInstagramUrl = (input?: string): string | null => {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanHandle = trimmed.replace(/^@/, '');
  return `https://www.instagram.com/${cleanHandle}/`;
};

export const getInstagramHandle = (input?: string): string => {
  if (!input || !input.trim()) return '';
  const trimmed = input.trim();
  if (trimmed.includes('instagram.com/')) {
    const parts = trimmed.split('instagram.com/');
    const handle = parts[1]?.split(/[\/?#]/)[0];
    return handle ? `@${handle}` : trimmed;
  }
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
};

export interface InstagramIconProps {
  className?: string;
  gradient?: boolean;
}

export const InstagramIcon: React.FC<InstagramIconProps> = ({ 
  className = 'w-4 h-4',
  gradient = false 
}) => {
  if (gradient) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="25%" stopColor="#e6683c" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="75%" stopColor="#cc2366" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" stroke="url(#ig-grad)" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="url(#ig-grad)" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-grad)" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" strokeWidth="2.5" />
    </svg>
  );
};

export { InstagramIcon as Instagram };

/**
 * 一覧画面・テーブル・カードから直接ワンクリックでInstagramを開けるバッジコンポーネント
 */
export interface InstagramBadgeProps {
  instagram?: string;
  vendorName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const InstagramBadge: React.FC<InstagramBadgeProps> = ({
  instagram,
  vendorName,
  className = '',
  size = 'sm'
}) => {
  if (!instagram || !instagram.trim()) return null;
  const url = getInstagramUrl(instagram);
  const handle = getInstagramHandle(instagram);
  if (!url) return null;

  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-2 py-0.5 gap-1'
    : size === 'md'
    ? 'text-xs px-3 py-1 gap-1.5'
    : 'text-[11px] px-2.5 py-0.5 gap-1.5';

  const iconSizes = size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 hover:from-purple-500/35 hover:via-pink-500/35 hover:to-amber-500/35 border border-pink-500/40 hover:border-pink-300 text-pink-300 hover:text-white font-bold transition-all shadow-sm hover:shadow-md hover:shadow-pink-500/10 group shrink-0 ${sizeClasses} ${className}`}
      title={vendorName ? `${vendorName} の公式Instagram（${handle}）を直接開く` : `公式Instagram（${handle}）を直接開く`}
    >
      <InstagramIcon className={`${iconSizes} text-pink-400 group-hover:scale-110 transition-transform shrink-0`} gradient={false} />
      <span className="font-mono tracking-tight font-bold">{handle}</span>
      <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
    </a>
  );
};
