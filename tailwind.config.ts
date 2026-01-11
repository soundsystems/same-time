import type { Config } from "tailwindcss";

// Tailwind CSS v4 uses CSS-based configuration
// - @theme block in globals.css defines theme values
// - @plugin directive in globals.css loads plugins
// - Content paths are auto-detected
export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
} satisfies Config;
