import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export function AppLogo({ className = '', size = 96 }: AppLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shadow-lg rounded-[24%] ${className}`}
      id="custom-app-logo"
    >
      {/* Background Gradient */}
      <defs>
        <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Main Base Card with Icon Shape */}
      <rect width="512" height="512" rx="120" fill="url(#logoBgGrad)" />
      
      {/* Subtle inner border */}
      <rect x="8" y="8" width="496" height="496" rx="112" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="6" />

      {/* White Document Container */}
      <g filter="url(#logoShadow)">
        {/* Main white sheet */}
        <path 
          d="M155 128C155 119.163 162.163 112 171 112H283.485C287.729 112 291.8 113.686 294.799 116.685L353.314 175.2C356.314 178.2 358 182.271 358 186.515V372C358 380.837 350.837 388 342 388H171C162.163 388 155 380.837 155 372V128Z" 
          fill="#FFFFFF" 
        />
        {/* Document Folded Corner */}
        <path 
          d="M284 112V164C284 172.837 291.163 180 300 180H358L284 112Z" 
          fill="#E2E8F0" 
        />
      </g>

      {/* Dark Slate Checkmark on the Document */}
      <path 
        d="M202 245L245 288L318 195" 
        stroke="#0f172a" 
        strokeWidth="24" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Bright Cyan Badge with "PDF" */}
      <rect x="268" y="302" width="96" height="52" rx="12" fill="url(#badgeGrad)" />
      
      {/* PDF text on Badge */}
      <text 
        x="316" 
        y="336" 
        fill="#FFFFFF" 
        fontSize="24" 
        fontWeight="900" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        textAnchor="middle"
        letterSpacing="0.5"
      >
        PDF
      </text>
    </svg>
  );
}
