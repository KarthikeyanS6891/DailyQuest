import type { Config } from "tailwindcss";

// Each color resolves to `rgb(var(--color-X) / <alpha-value>)`. The actual
// values live in src/app/globals.css under :root (dark default) and .light
// — switching themes is one className change on <html>.
function v(name: string) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        surface2: v("surface2"),
        border: v("border"),
        text: v("text"),
        muted: v("muted"),
        // `tint` is white in dark mode, near-black in light mode. Use it
        // anywhere you want a subtle alpha highlight that adapts.
        tint: v("tint"),
        brand: {
          DEFAULT: v("brand"),
          dim: v("brand-dim"),
        },
        accent: v("accent"),
        success: v("success"),
        danger: v("danger"),
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
  plugins: [
    // `standalone:` variant lets us style only when the app is launched
    // from the home screen as a PWA. e.g. standalone:px-4
    function ({ addVariant }: { addVariant: (name: string, value: string) => void }) {
      addVariant("standalone", "@media (display-mode: standalone)");
    },
  ],
} satisfies Config;
