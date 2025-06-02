/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [`./src/**/*.{js,jsx,ts,tsx}`],
  darkMode: `class`,
  presets: [
    // @ts-expect-error this is correct as per the docs, but the TS config seems
    // wrong I guess.
    require(`nativewind/preset`),
  ],
  theme: {
    screens: {
      sm: `640px`,
      // => @media (min-width: 640px) { ... }

      md: `768px`,
      // => @media (min-width: 768px) { ... }

      lg: `1024px`,
      // => @media (min-width: 1024px) { ... }

      xl: `1280px`,
      // => @media (min-width: 1280px) { ... }

      "2xl": `1536px`,
      // => @media (min-width: 1536px) { ... }
    },
    colors: {
      /* EXPERIMENTAL: named semantic colors */
      background: {
        DEFAULT: `rgb(from var(--color-background) r g b / calc(alpha * <alpha-value>))`,
        1: `rgb(from var(--color-slate-3) r g b / calc(alpha * <alpha-value>))`,
      },
      foreground: {
        DEFAULT: `rgb(from var(--color-foreground) r g b / calc(alpha * <alpha-value>))`,
        bold: `rgb(from var(--color-foreground-bold) r g b / calc(alpha * <alpha-value>))`,
        ref: `rgb(from var(--color-foreground-ref) r g b / calc(alpha * <alpha-value>))`,
        bg5: `rgb(from color-mix(in oklab, var(--color-foreground) 5%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg10: `rgb(from color-mix(in oklab, var(--color-foreground) 10%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg15: `rgb(from color-mix(in oklab, var(--color-foreground) 15%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg20: `rgb(from color-mix(in oklab, var(--color-foreground) 20%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg25: `rgb(from color-mix(in oklab, var(--color-foreground) 25%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg30: `rgb(from color-mix(in oklab, var(--color-foreground) 30%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg35: `rgb(from color-mix(in oklab, var(--color-foreground) 35%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg40: `rgb(from color-mix(in oklab, var(--color-foreground) 40%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg45: `rgb(from color-mix(in oklab, var(--color-foreground) 45%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg50: `rgb(from color-mix(in oklab, var(--color-foreground) 50%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg55: `rgb(from color-mix(in oklab, var(--color-foreground) 55%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg60: `rgb(from color-mix(in oklab, var(--color-foreground) 60%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg65: `rgb(from color-mix(in oklab, var(--color-foreground) 65%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg70: `rgb(from color-mix(in oklab, var(--color-foreground) 70%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg75: `rgb(from color-mix(in oklab, var(--color-foreground) 75%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg80: `rgb(from color-mix(in oklab, var(--color-foreground) 80%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg85: `rgb(from color-mix(in oklab, var(--color-foreground) 85%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg90: `rgb(from color-mix(in oklab, var(--color-foreground) 90%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg95: `rgb(from color-mix(in oklab, var(--color-foreground) 95%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
        bg100: `rgb(from color-mix(in oklab, var(--color-foreground) 100%, var(--color-background)) r g b / calc(alpha * <alpha-value>))`,
      },
      caption: {
        DEFAULT: `rgb(from var(--color-caption) r g b / calc(alpha * <alpha-value>))`,
        bold: `rgb(from var(--color-caption-bold) r g b / calc(alpha * <alpha-value>))`,
        ref: `rgb(from var(--color-caption-ref) r g b / calc(alpha * <alpha-value>))`,
      },

      primary: {
        1: `rgb(from var(--color-primary-1) r g b / calc(alpha * <alpha-value>))`,
        2: `rgb(from var(--color-primary-2) r g b / calc(alpha * <alpha-value>))`,
        3: `rgb(from var(--color-primary-3) r g b / calc(alpha * <alpha-value>))`,
        4: `rgb(from var(--color-primary-4) r g b / calc(alpha * <alpha-value>))`,
        5: `rgb(from var(--color-primary-5) r g b / calc(alpha * <alpha-value>))`,
        6: `rgb(from var(--color-primary-6) r g b / calc(alpha * <alpha-value>))`,
        7: `rgb(from var(--color-primary-7) r g b / calc(alpha * <alpha-value>))`,
        8: `rgb(from var(--color-primary-8) r g b / calc(alpha * <alpha-value>))`,
        9: `rgb(from var(--color-primary-9) r g b / calc(alpha * <alpha-value>))`,
        10: `rgb(from var(--color-primary-10) r g b / calc(alpha * <alpha-value>))`,
        11: `rgb(from var(--color-primary-11) r g b / calc(alpha * <alpha-value>))`,
        12: `rgb(from var(--color-primary-12) r g b / calc(alpha * <alpha-value>))`,
      },

      accent: {
        1: `rgb(from var(--color-accent-1) r g b / calc(alpha * <alpha-value>))`,
        2: `rgb(from var(--color-accent-2) r g b / calc(alpha * <alpha-value>))`,
        3: `rgb(from var(--color-accent-3) r g b / calc(alpha * <alpha-value>))`,
        4: `rgb(from var(--color-accent-4) r g b / calc(alpha * <alpha-value>))`,
        5: `rgb(from var(--color-accent-5) r g b / calc(alpha * <alpha-value>))`,
        6: `rgb(from var(--color-accent-6) r g b / calc(alpha * <alpha-value>))`,
        7: `rgb(from var(--color-accent-7) r g b / calc(alpha * <alpha-value>))`,
        8: `rgb(from var(--color-accent-8) r g b / calc(alpha * <alpha-value>))`,
        9: `rgb(from var(--color-accent-9) r g b / calc(alpha * <alpha-value>))`,
        10: `rgb(from var(--color-accent-10) r g b / calc(alpha * <alpha-value>))`,
        11: `rgb(from var(--color-accent-11) r g b / calc(alpha * <alpha-value>))`,
        12: `rgb(from var(--color-accent-12) r g b / calc(alpha * <alpha-value>))`,
      },

      sky: {
        DEFAULT: `rgb(from var(--color-sky) r g b / calc(alpha * <alpha-value>))`,
      },

      cyan: {
        1: `rgb(from var(--color-cyan-1) r g b / calc(alpha * <alpha-value>))`,
        2: `rgb(from var(--color-cyan-2) r g b / calc(alpha * <alpha-value>))`,
        3: `rgb(from var(--color-cyan-3) r g b / calc(alpha * <alpha-value>))`,
        4: `rgb(from var(--color-cyan-4) r g b / calc(alpha * <alpha-value>))`,
        5: `rgb(from var(--color-cyan-5) r g b / calc(alpha * <alpha-value>))`,
        6: `rgb(from var(--color-cyan-6) r g b / calc(alpha * <alpha-value>))`,
        7: `rgb(from var(--color-cyan-7) r g b / calc(alpha * <alpha-value>))`,
        8: `rgb(from var(--color-cyan-8) r g b / calc(alpha * <alpha-value>))`,
        9: `rgb(from var(--color-cyan-9) r g b / calc(alpha * <alpha-value>))`,
        10: `rgb(from var(--color-cyan-10) r g b / calc(alpha * <alpha-value>))`,
        11: `rgb(from var(--color-cyan-11) r g b / calc(alpha * <alpha-value>))`,
        12: `rgb(from var(--color-cyan-12) r g b / calc(alpha * <alpha-value>))`,
      },

      slate: {
        1: `rgb(from var(--color-slate-1) r g b / calc(alpha * <alpha-value>))`,
        2: `rgb(from var(--color-slate-2) r g b / calc(alpha * <alpha-value>))`,
        3: `rgb(from var(--color-slate-3) r g b / calc(alpha * <alpha-value>))`,
        4: `rgb(from var(--color-slate-4) r g b / calc(alpha * <alpha-value>))`,
        5: `rgb(from var(--color-slate-5) r g b / calc(alpha * <alpha-value>))`,
        6: `rgb(from var(--color-slate-6) r g b / calc(alpha * <alpha-value>))`,
        7: `rgb(from var(--color-slate-7) r g b / calc(alpha * <alpha-value>))`,
        8: `rgb(from var(--color-slate-8) r g b / calc(alpha * <alpha-value>))`,
        9: `rgb(from var(--color-slate-9) r g b / calc(alpha * <alpha-value>))`,
        10: `rgb(from var(--color-slate-10) r g b / calc(alpha * <alpha-value>))`,
        11: `rgb(from var(--color-slate-11) r g b / calc(alpha * <alpha-value>))`,
        12: `rgb(from var(--color-slate-12) r g b / calc(alpha * <alpha-value>))`,
      },

      red: {
        1: `rgb(from var(--color-red-1) r g b / calc(alpha * <alpha-value>))`,
        2: `rgb(from var(--color-red-2) r g b / calc(alpha * <alpha-value>))`,
        3: `rgb(from var(--color-red-3) r g b / calc(alpha * <alpha-value>))`,
        4: `rgb(from var(--color-red-4) r g b / calc(alpha * <alpha-value>))`,
        5: `rgb(from var(--color-red-5) r g b / calc(alpha * <alpha-value>))`,
        6: `rgb(from var(--color-red-6) r g b / calc(alpha * <alpha-value>))`,
        7: `rgb(from var(--color-red-7) r g b / calc(alpha * <alpha-value>))`,
        8: `rgb(from var(--color-red-8) r g b / calc(alpha * <alpha-value>))`,
        9: `rgb(from var(--color-red-9) r g b / calc(alpha * <alpha-value>))`,
        10: `rgb(from var(--color-red-10) r g b / calc(alpha * <alpha-value>))`,
        11: `rgb(from var(--color-red-11) r g b / calc(alpha * <alpha-value>))`,
        12: `rgb(from var(--color-red-12) r g b / calc(alpha * <alpha-value>))`,
      },

      amber: {
        1: `rgb(from var(--color-amber-1) r g b / calc(alpha * <alpha-value>))`,
        2: `rgb(from var(--color-amber-2) r g b / calc(alpha * <alpha-value>))`,
        3: `rgb(from var(--color-amber-3) r g b / calc(alpha * <alpha-value>))`,
        4: `rgb(from var(--color-amber-4) r g b / calc(alpha * <alpha-value>))`,
        5: `rgb(from var(--color-amber-5) r g b / calc(alpha * <alpha-value>))`,
        6: `rgb(from var(--color-amber-6) r g b / calc(alpha * <alpha-value>))`,
        7: `rgb(from var(--color-amber-7) r g b / calc(alpha * <alpha-value>))`,
        8: `rgb(from var(--color-amber-8) r g b / calc(alpha * <alpha-value>))`,
        9: `rgb(from var(--color-amber-9) r g b / calc(alpha * <alpha-value>))`,
        10: `rgb(from var(--color-amber-10) r g b / calc(alpha * <alpha-value>))`,
        11: `rgb(from var(--color-amber-11) r g b / calc(alpha * <alpha-value>))`,
        12: `rgb(from var(--color-amber-12) r g b / calc(alpha * <alpha-value>))`,
      },

      lime: {
        1: `rgb(from var(--color-lime-1) r g b / calc(alpha * <alpha-value>))`,
        2: `rgb(from var(--color-lime-2) r g b / calc(alpha * <alpha-value>))`,
        3: `rgb(from var(--color-lime-3) r g b / calc(alpha * <alpha-value>))`,
        4: `rgb(from var(--color-lime-4) r g b / calc(alpha * <alpha-value>))`,
        5: `rgb(from var(--color-lime-5) r g b / calc(alpha * <alpha-value>))`,
        6: `rgb(from var(--color-lime-6) r g b / calc(alpha * <alpha-value>))`,
        7: `rgb(from var(--color-lime-7) r g b / calc(alpha * <alpha-value>))`,
        8: `rgb(from var(--color-lime-8) r g b / calc(alpha * <alpha-value>))`,
        9: `rgb(from var(--color-lime-9) r g b / calc(alpha * <alpha-value>))`,
        10: `rgb(from var(--color-lime-10) r g b / calc(alpha * <alpha-value>))`,
        11: `rgb(from var(--color-lime-11) r g b / calc(alpha * <alpha-value>))`,
        12: `rgb(from var(--color-lime-12) r g b / calc(alpha * <alpha-value>))`,
      },

      transparent: `transparent`,
    },
    extend: {
      fontFamily: {
        chinese: `MaShanZheng-Regular`,
        cursive: `ui-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
        sans: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
        karla: `Karla`,
      },

      spacing: {
        "quiz-px": `16px`,
        "www-col": `988px`,
      },
    },
  },
  corePlugins: {
    // Required until https://github.com/nativewind/nativewind/pull/1144 is merged
    backgroundOpacity: true,

    // Keep native and web consistent so that testing on web is closer to native
    // (this list is taken from https://github.com/nativewind/nativewind/blob/main/packages/nativewind/src/tailwind/native.ts)
    preflight: false,
    borderOpacity: false,
    boxShadow: false,
    caretColor: false,
    divideOpacity: false,
    fill: false,
    placeholderColor: false,
    placeholderOpacity: false,
    lineClamp: false,
    ringOpacity: false,
    stroke: false,
    strokeWidth: false,
    textOpacity: false,
    translate: false,
    visibility: false,
  },
};
