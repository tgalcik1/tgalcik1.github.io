export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,ts,jsx,tsx,md,mdx}"],
  theme: {
    extend: {
      keyframes: {
        aurora: {
          "0%": { backgroundPosition: "50% 50%, 50% 50%" },
          "50%": { backgroundPosition: "30% 70%, 60% 40%" },
          "100%": { backgroundPosition: "70% 30%, 50% 50%" },
        },
      },
      animation: {
        aurora: "aurora 60s linear infinite",
      },
    },
  },
  plugins: [],
};
