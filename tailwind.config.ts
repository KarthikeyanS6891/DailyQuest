import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b10",
        surface: "#15151d",
        surface2: "#1d1d28",
        border: "#2a2a36",
        text: "#ececf1",
        muted: "#8b8ba0",
        brand: {
          DEFAULT: "#7c5cff",
          dim: "#5b3fd9",
        },
        accent: "#f5b400",
        success: "#22c55e",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.2rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,255,0.4), 0 8px 30px -8px rgba(124,92,255,0.5)",
      },
    },
  },
  plugins: [],
} satisfies Config;
