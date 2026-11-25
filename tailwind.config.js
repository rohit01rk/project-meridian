/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080B14",
        panel: "#0E1526",
        accent: "#E8B33D",
        teal2: "#2DD4BF",
        violet2: "#8B7CFF",
        danger: "#FF4D6D",
      },
    },
  },
  plugins: [],
};
