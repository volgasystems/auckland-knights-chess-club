import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        akcc: {
          navy: "#061322",
          blue: "#0B3D91",
          royal: "#123F9C",
          accent: "#2563EB",
          pale: "#F3F6FA",
          gold: "#C89B2C"
        }
      },
      boxShadow: { soft: "0 14px 45px rgba(6,19,34,0.12)" }
    }
  },
  plugins: []
};
export default config;
