import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'system-ui', 'sans-serif'],
        brand: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      colors: {
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-alt": "hsl(var(--background-alt))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          pressed: "hsl(var(--primary-pressed))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
          hover: "hsl(var(--sidebar-hover))",
          active: "hsl(var(--sidebar-active))",
          "active-text": "hsl(var(--sidebar-active-text))",
        },
        navy: {
          900: "hsl(var(--navy-900))",
          700: "hsl(var(--navy-700))",
          500: "hsl(var(--navy-500))",
        },
        brand: {
          navy: "hsl(var(--brand-navy))",
          "navy-soft": "hsl(var(--brand-navy-soft))",
          blue: "hsl(var(--brand-blue))",
          "blue-light": "hsl(var(--brand-blue-light))",
          red: "hsl(var(--brand-red))",
          "gray-dark": "hsl(var(--brand-gray-dark))",
          offwhite: "hsl(var(--brand-offwhite))",
          mist: "hsl(var(--brand-mist))",
        },
        risk: {
          low: "hsl(var(--risk-low))",
          moderate: "hsl(var(--risk-moderate))",
          substantial: "hsl(var(--risk-substantial))",
          high: "hsl(var(--risk-high))",
        },
        graphite: {
          800: "hsl(var(--graphite-800))",
          600: "hsl(var(--graphite-600))",
          400: "hsl(var(--graphite-400))",
        },

        executive: {
          success: "hsl(var(--executive-success))",
          warning: "hsl(var(--executive-warning))",
          danger: "hsl(var(--executive-danger))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-sm)",
        sm: "calc(var(--radius-sm) - 2px)",
        xl: "var(--radius-lg)",
        "2xl": "calc(var(--radius-lg) + 4px)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        executive: "var(--shadow-executive)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(187 65% 35% / 0.2)" },
          "50%": { boxShadow: "0 0 30px hsl(187 65% 35% / 0.4)" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-20%) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { transform: "translateY(120vh) rotate(720deg)", opacity: "0.9" },
        },
        "balloon-float": {
          "0%": { transform: "translateY(110%) translateX(0)", opacity: "0" },
          "10%": { opacity: "1" },
          "50%": { transform: "translateY(20%) translateX(10px)" },
          "100%": { transform: "translateY(-120%) translateX(-10px)", opacity: "0" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-12deg) scale(1)" },
          "50%": { transform: "rotate(12deg) scale(1.15)" },
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-12px) scale(1.05)" },
        },
        "sparkle": {
          "0%, 100%": { transform: "scale(0.8)", opacity: "0.6" },
          "50%": { transform: "scale(1.3)", opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--brand-red) / 0.45)" },
          "70%": { boxShadow: "0 0 0 14px hsl(var(--brand-red) / 0)" },
        },
        "pulse-dot": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.35)", opacity: "0.7" },
        },
        "elegant-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-in": "slide-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
        "confetti": "confetti-fall linear infinite",
        "balloon": "balloon-float ease-in-out infinite",
        "wiggle": "wiggle 1.2s ease-in-out infinite",
        "bounce-slow": "bounce-slow 1.6s ease-in-out infinite",
        "sparkle": "sparkle 1.5s ease-in-out infinite",
        "elegant-float": "elegant-float 5s ease-in-out infinite",
      },

    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
