/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        "noto-reg": ["NotoSansMono_400Regular"],
        "noto-bold": ["NotoSansMono_700Bold"],
      },
      colors: {
        accent: "#e1e1e1",
        "accent-highlight": "#e1e1e1",
        "accent-subtext": "#6e6e6e",
        "accent-hover": "#1e1e1e",
        "accent-hover-elevated": "#303030",
        "accent-hover-transparent": "rgba(48, 48, 48, .5)",
        "accent-button": "#191919",
        "accent-button-elevated": "#2a2a2a",
        glass: "rgba(25, 25, 25, .85)",
        "glass-lite": "rgba(25, 25, 25, .98)",
        subbackground: "#0a0a0a",
        background: "#000",
        "background-backdrop": "rgba(0, 0, 0, .5)",
      },
      borderRadius: {
        base: "9px",
      },
      fontSize: {
        // base: ".9rem",
        // logo: "1rem",
        // "logo-sub": ".8rem",
        // dl: "1.8rem",
        // subtitle: "1.3rem",
        // "subtitle-sub": "1rem",
        base: 13,
        logo: 14,
        "logo-sub": 12,
        dl: 25,
        subtitle: 18,
        "subtitle-sub": 14,
      },
    },
  },
  plugins: [],
};
