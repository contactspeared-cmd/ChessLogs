import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sjsfi: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#146c36",
          850: "#105d2e",
          900: "#0B532E", // Official SJSFI Zamboanga Deep Forest Green
          950: "#063b20", // Deepest SJSFI Pine Green
          gold: "#D4AF37", // SJSFI Crest Gold Accent
          goldHover: "#C59B27",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(11, 83, 46, 0.08)",
        card: "0 2px 12px -2px rgba(11, 83, 46, 0.06), 0 4px 20px -4px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
