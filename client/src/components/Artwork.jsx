import { getShirtTheme } from "../lib/shirts.js";

export function PackArtwork({ progress = 0, className = "" }) {
  const scale = 1 + progress * 0.18;

  return (
    <img
      alt=""
      className={className}
      src="/images/collectible-shirts-pack.png"
      style={{ transform: `scale(${scale})` }}
    />
  );
}

export function ShirtArtwork({ shirtKey, className = "" }) {
  const theme = getShirtTheme(shirtKey);

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 240 220">
      <defs>
        <linearGradient id={`shirt-${shirtKey}`} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={theme.jersey} />
          <stop offset="100%" stopColor={theme.accent} />
        </linearGradient>
      </defs>

      <g filter={`drop-shadow(0 18px 32px ${theme.shadow})`}>
        <path
          d="M71 42c10 0 18-9 22-18h54c4 9 12 18 22 18l28 23-17 34-18-10v93H78V89L60 99 43 65z"
          fill={`url(#shirt-${shirtKey})`}
          stroke={theme.trim}
          strokeWidth="3"
        />
        <path
          d="M102 24c2 14 14 25 18 25s16-11 18-25"
          fill="none"
          stroke={theme.trim}
          strokeWidth="3"
        />
        <text
          fill={theme.textColor}
          fontFamily="Space Grotesk, sans-serif"
          fontSize="38"
          fontWeight="700"
          textAnchor="middle"
          x="120"
          y="127"
        >
          R
        </text>
        <text
          fill={theme.textColor}
          fontFamily="Manrope, sans-serif"
          fontSize="12"
          fontWeight="700"
          letterSpacing="1.4"
          textAnchor="middle"
          x="120"
          y="82"
        >
          {theme.limitedLabel}
        </text>
      </g>
    </svg>
  );
}
