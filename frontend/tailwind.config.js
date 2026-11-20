/**
 * CuraBook — Tailwind CSS Configuration v23
 * Aligned with tokens.js v19 — Single Source of Truth
 * ────────────────────────────────────────────────────
 * Primary  : #0E7490 (Navy Medical Trust)
 * Accent   : #E5701F (Warm Orange CTA only)
 * BG       : #F2F7FC (لا أبيض خالص)
 */

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    container: { center: true },
    extend: {
      colors: {
        // ─── Primary — أزرق طبي هادئ ──────────────────────────
        main:   "#0E7490",   // backward compat alias
        primary: {
          DEFAULT: "#0E7490",
          light:   "#0891B2",
          pale:    "#E0F7FA",
          dark:    "#0C6478",
          darker:  "#083344",
          50:      "#ECFEFF",
          100:     "#E0F7FA",
          200:     "#A5F3FC",
          500:     "#0E7490",
          700:     "#0C6478",
          900:     "#083344",
        },

        // ─── Accent — CTA فقط ─────────────────────────────────
        accent: {
          DEFAULT: "#E5701F",
          light:   "#FEF0E6",
          dark:    "#C45A10",
          darker:  "#A04510",
        },

        // ─── Semantic ─────────────────────────────────────────
        success: {
          DEFAULT: "#1A8A5A",
          dark:    "#156B46",
          light:   "#E8F5EE",
          bg:      "#E8F5EE",
          text:    "#0D4A30",
        },
        danger: {
          DEFAULT: "#D93025",
          dark:    "#B52820",
          light:   "#FEECEC",
          bg:      "#FEECEC",
          text:    "#8C1A14",
        },
        warning: {
          DEFAULT: "#E97A2F",
          dark:    "#C96020",
          light:   "#FEF6EC",
          bg:      "#FEF6EC",
          text:    "#7A3A10",
        },
        info: {
          DEFAULT: "#0891B2",
          dark:    "#1B6FA8",
          light:   "#EAF4FB",
          bg:      "#EAF4FB",
          text:    "#0E4D7A",
        },
        gold: {
          DEFAULT: "#C9923A",
          light:   "#FDF4E7",
        },

        // ─── Surfaces & Backgrounds ───────────────────────────
        // القاعدة: لا #FFF — كل surface فيه hint أزرق
        second: "#EAF4FB",   // backward compat
      },

      // ─── Responsive Breakpoints ───────────────────────────
      screens: {
        sm:  "576px",
        md:  "768px",
        lg:  "992px",
        xl:  "1200px",
        xxl: "1400px",
      },

      // ─── Box Shadows ──────────────────────────────────────
      boxShadow: {
        card:  "0 2px 12px rgba(14,38,56,0.07), 0 1px 4px rgba(14,38,56,0.04)",
        hover: "0 4px 20px rgba(14,116,144,0.18)",
        focus: "0 0 0 3px rgba(14,116,144,0.22)",
        modal: "0 16px 48px rgba(14,38,56,0.14)",
      },

      // ─── Border Radius ────────────────────────────────────
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      // ─── Typography ───────────────────────────────────────
      // Cairo أول دائماً — يعمل مع العربي واللاتيني والأرقام
      fontFamily: {
        sans: ["'Cairo'", "'Plus Jakarta Sans'", "'Segoe UI'", "system-ui", "sans-serif"],
      },

      // ─── Animations ───────────────────────────────────────
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        float:   'float 3s ease-in-out infinite',
        slideUp: 'slideUp 0.25s ease',
        fadeIn:  'fadeIn 0.2s ease',
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
};

export default config;
