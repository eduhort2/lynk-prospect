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
        background: "#05070A",
        card: "#0B0E13",
        surface: "#11161D",
        line: "#202833",
        muted: "#999D94",
        primary: {
          DEFAULT: "#00B8F5",
          light: "#54D4FF",
          dark: "#007EB8",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0, 184, 245, 0.12), 0 12px 38px rgba(0, 104, 160, 0.12)",
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
