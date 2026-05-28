import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        terracotta: {
          DEFAULT: "#c36241",
          light: "#d5886d",
          dark: "#a14828",
          opaque: "rgba(195, 98, 65, 0.15)",
        },
        saffron: {
          DEFAULT: "#e08e45",
          light: "#e9a96e",
          dark: "#b86e29",
          opaque: "rgba(224, 142, 69, 0.15)",
        },
        sage: {
          DEFAULT: "#7fa08c",
          light: "#a1bbae",
          dark: "#5f7e6c",
          opaque: "rgba(127, 160, 140, 0.15)",
        },
        sand: {
          DEFAULT: "#f9f6f0",
          dark: "#e8e2d2",
        },
        charcoal: {
          DEFAULT: "#2d2a26",
          light: "#413e3a",
        }
      },
      fontFamily: {
        serif: ["var(--font-crimson-pro)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
