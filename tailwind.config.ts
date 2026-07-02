import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#11142D",
        field: "#2F46FF",
        lime: "#F0E834",
        coral: "#DC2626",
        sky: "#2563EB",
        mist: "#EEF1F5",
        brand: {
          electric: "#2F46FF",
          institutional: "#444A94",
          navy: "#171B4F",
          panel: "#252A73",
          yellow: "#F0E834",
          yellowHover: "#FFF45A",
          tower: "#6F7175",
          towerMid: "#A7A9AC",
          wash: "#EEF1F5",
          cold: "#F8FAFF",
          text: "#11142D",
          muted: "#5F6475"
        }
      },
      boxShadow: {
        panel: "0 18px 45px rgba(23, 27, 79, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.55)",
        lift: "0 12px 26px rgba(47, 70, 255, 0.16)",
        insetLine: "inset 0 1px 0 rgba(255, 255, 255, 0.55)"
      }
    }
  },
  plugins: []
};

export default config;
