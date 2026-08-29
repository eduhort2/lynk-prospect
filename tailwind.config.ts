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
        card: "#0D0F10",
        surface: "#15191B",
        line: "#252B2E",
        muted: "#7C8485",
        primary: {
          DEFAULT: "#C3DFEA",
          light: "#EAF7FB",
          dark: "#24343B",
        },
        accent: {
          DEFAULT: "#F27E2D",
          light: "#FF9B55",
          dark: "#A94B12",
        },
        deep: "#173E63",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(195, 223, 234, 0.14), 0 18px 48px rgba(0, 0, 0, 0.34)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.36)",
        accent: "0 18px 46px rgba(242, 126, 45, 0.16)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(195,223,234,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(195,223,234,.035) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
