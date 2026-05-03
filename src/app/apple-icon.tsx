import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ignores manifest icons and uses apple-touch-icon — must be PNG, not SVG.
// Rendered from the same sparkle design as icon.svg via Satori at build time.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d1d28 0%, #0b0b10 100%)",
          borderRadius: 38,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c5cff" />
              <stop offset="100%" stopColor="#f5b400" />
            </linearGradient>
          </defs>
          <path
            d="M32 12 L36 28 L52 32 L36 36 L32 52 L28 36 L12 32 L28 28 Z"
            fill="url(#spark)"
          />
          <circle cx="48" cy="18" r="3" fill="#f5b400" opacity="0.85" />
          <circle cx="16" cy="48" r="2" fill="#7c5cff" opacity="0.85" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
