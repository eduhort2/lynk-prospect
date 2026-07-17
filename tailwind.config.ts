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
        background: "#050505",
        card: "#0C0C0C",
        surface: "#111111",
        line: "#202020",
        muted: "#8A8A8A",
        primary: {
          DEFAULT: "#2F7DFF",
          light: "#73A7FF",
          dark: "#1455C8",
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(47, 125, 255, 0.16)",
        panel: "0 16px 50px rgba(0, 0, 0, 0.28)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
