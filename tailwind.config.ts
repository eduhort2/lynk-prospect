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
        card: "#101212",
        surface: "#171A1A",
        line: "#2B3030",
        muted: "#9DA4A5",
        primary: {
          DEFAULT: "#C3DFEA",
          light: "#E8F6FB",
          dark: "#253036",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(195, 223, 234, 0.14), 0 12px 38px rgba(0, 0, 0, 0.28)",
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
