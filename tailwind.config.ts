import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        field: "#2f6f4e",
        lime: "#b7e06c",
        coral: "#ef6a5b",
        sky: "#4aa3df",
        mist: "#eef3f0"
      },
      boxShadow: {
        panel: "0 10px 30px rgba(23, 33, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
