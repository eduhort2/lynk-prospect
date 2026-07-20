import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        card: "#111827",
        surface: "#182033",
        line: "#28344D",
        muted: "#A8AEBB",
        primary: {
          DEFAULT: "#384A72",
          light: "#AABCE1",
          dark: "#111827",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(170, 188, 225, 0.14), 0 12px 38px rgba(17, 24, 39, 0.28)",
        panel: "0 22px 70px rgba(0, 0, 0, 0.32)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
