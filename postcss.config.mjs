/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind CSS v4 uses @tailwindcss/postcss (includes autoprefixer)
    "@tailwindcss/postcss": {},
  },
};

export default config;
