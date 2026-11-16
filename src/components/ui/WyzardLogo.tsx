import React from 'react';

interface WyzardLogoProps {
  /** Pixel size of the square mark */
  size?: number;
  className?: string;
  title?: string;
}

/**
 * The Wyzard mark: a hat-peaked "W" with a magic spark on a neo-brutalist tile.
 * Uses the same palette as the design system (yellow, ink, vermilion).
 */
export const WyzardLogo: React.FC<WyzardLogoProps> = ({ size = 32, className = '', title = 'Wyzard' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    width={size}
    height={size}
    role="img"
    aria-label={title}
    className={className}
  >
    <title>{title}</title>
    <rect x="7" y="7" width="54" height="54" rx="11" fill="#141414" />
    <rect x="3" y="3" width="54" height="54" rx="11" fill="#FFD23F" stroke="#141414" strokeWidth="3" />
    <path
      d="M13 21 L21.5 47 L30 27 L38.5 47 L47 21"
      fill="none"
      stroke="#141414"
      strokeWidth="7"
      strokeLinejoin="miter"
      strokeMiterlimit="6"
    />
    <path
      d="M30 6.5 L32.4 12.1 L38 14.5 L32.4 16.9 L30 22.5 L27.6 16.9 L22 14.5 L27.6 12.1 Z"
      fill="#FF5E3A"
      stroke="#141414"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);
