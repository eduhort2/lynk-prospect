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
        background: "#090A09",
        card: "#111210",
        surface: "#161715",
        line: "#292B27",
        muted: "#999D94",
        primary: {
          DEFAULT: "#8CE739",
          light: "#B2F476",
          dark: "#5FAE19",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(140, 231, 57, 0.08)",
        panel: "0 18px 50px rgba(0, 0, 0, 0.24)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
