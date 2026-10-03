import React from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  customLogoUrl?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = 'w-12 h-12',
  size,
  showText = false,
  customLogoUrl,
}) => {
  if (customLogoUrl && customLogoUrl.trim() !== '') {
    return (
      <img
        src={customLogoUrl}
        alt="Company Logo"
        className={`${className} object-contain`}
        style={size ? { width: size, height: size } : undefined}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full drop-shadow-xs"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#005ea6" />
            <stop offset="100%" stopColor="#008ce3" />
          </linearGradient>
          <linearGradient id="logoNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#071d3a" />
            <stop offset="100%" stopColor="#0e3768" />
          </linearGradient>
        </defs>

        {/* Outer Navy Arc */}
        <path
          d="M 230 40 A 210 210 0 1 0 460 250 A 225 225 0 0 1 200 465 A 215 215 0 1 1 230 40 Z"
          fill="url(#logoNavyGrad)"
        />

        {/* Outer Blue Arc */}
        <path
          d="M 200 35 A 215 215 0 0 1 475 230 A 230 230 0 0 1 250 472 A 215 215 0 0 0 455 240 A 200 200 0 0 0 200 35 Z"
          fill="url(#logoBlueGrad)"
        />

        {/* Accent Swooshes */}
        <path
          d="M 120 180 A 185 185 0 0 1 360 85 A 190 190 0 0 0 145 155 Z"
          fill="#0077c8"
          opacity="0.9"
        />
        <path
          d="M 115 330 A 195 195 0 0 0 340 435 A 205 205 0 0 1 140 375 Z"
          fill="#0077c8"
          opacity="0.9"
        />

        {/* Central RSR Typography */}
        <g transform="translate(250, 275)" textAnchor="middle">
          <text
            fontFamily="'Times New Roman', 'Playfair Display', Georgia, serif"
            fontWeight="900"
            fontSize="142"
            letterSpacing="-3"
          >
            <tspan fill="#0a0f1d" x="-105">
              R
            </tspan>
            <tspan fill="#0073c6" x="2">
              S
            </tspan>
            <tspan fill="#0a0f1d" x="110">
              R
            </tspan>
          </text>
        </g>

        {/* Dividing Line */}
        <line x1="105" y1="298" x2="395" y2="298" stroke="#0a0f1d" strokeWidth="2.5" />

        {/* VAI VAI ENTERPRISE */}
        <text
          x="250"
          y="325"
          textAnchor="middle"
          fontFamily="'Times New Roman', 'Playfair Display', Georgia, serif"
          fontWeight="900"
          fontSize="25"
          letterSpacing="3.5"
          fill="#0a0f1d"
        >
          VAI VAI ENTERPRISE
        </text>

        {/* Underline */}
        <line x1="108" y1="334" x2="392" y2="334" stroke="#0a0f1d" strokeWidth="1.8" />
      </svg>
    </div>
  );
};
