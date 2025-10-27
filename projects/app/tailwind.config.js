/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [`./src/**/*.{js,jsx,ts,tsx,mdx}`],
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

      /** "menu" is the name for the non-game pages like settings/profile/etc */
      [`menu-lg`]: `872px`,
      // => @media (min-width: 1024px) { ... }

      lg: `1024px`,
      // => @media (min-width: 1024px) { ... }

      xl: `1280px`,
      // => @media (min-width: 1280px) { ... }

      "2xl": `1536px`,
      // => @media (min-width: 1536px) { ... }
    },
    colors: {
      /* EXPERIMENTAL: named semantic colors */
      bg: {
        DEFAULT: `rgb(from var(--color-bg) r g b / calc(alpha * <alpha-value>))`,
        loud: `rgb(from var(--color-bg-loud) r g b / calc(alpha * <alpha-value>))`,
      },
      fg: {
        DEFAULT: `rgb(from var(--color-fg) r g b / calc(alpha * <alpha-value>))`,
        loud: `rgb(from var(--color-fg-loud) r g b / calc(alpha * <alpha-value>))`,
        bg5: `rgb(from color-mix(in oklab, var(--color-fg) 5%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg10: `rgb(from color-mix(in oklab, var(--color-fg) 10%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg15: `rgb(from color-mix(in oklab, var(--color-fg) 15%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg20: `rgb(from color-mix(in oklab, var(--color-fg) 20%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg25: `rgb(from color-mix(in oklab, var(--color-fg) 25%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg30: `rgb(from color-mix(in oklab, var(--color-fg) 30%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg35: `rgb(from color-mix(in oklab, var(--color-fg) 35%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg40: `rgb(from color-mix(in oklab, var(--color-fg) 40%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg45: `rgb(from color-mix(in oklab, var(--color-fg) 45%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg50: `rgb(from color-mix(in oklab, var(--color-fg) 50%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg55: `rgb(from color-mix(in oklab, var(--color-fg) 55%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg60: `rgb(from color-mix(in oklab, var(--color-fg) 60%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg65: `rgb(from color-mix(in oklab, var(--color-fg) 65%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg70: `rgb(from color-mix(in oklab, var(--color-fg) 70%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg75: `rgb(from color-mix(in oklab, var(--color-fg) 75%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg80: `rgb(from color-mix(in oklab, var(--color-fg) 80%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg85: `rgb(from color-mix(in oklab, var(--color-fg) 85%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg90: `rgb(from color-mix(in oklab, var(--color-fg) 90%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg95: `rgb(from color-mix(in oklab, var(--color-fg) 95%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
        bg100: `rgb(from color-mix(in oklab, var(--color-fg) 100%, var(--color-bg)) r g b / calc(alpha * <alpha-value>))`,
      },
      caption: {
        DEFAULT: `rgb(from var(--color-caption) r g b / calc(alpha * <alpha-value>))`,
        loud: `rgb(from var(--color-caption-loud) r g b / calc(alpha * <alpha-value>))`,
      },
      cloud: `rgb(from var(--color-cloud) r g b / calc(alpha * <alpha-value>))`,
      ink: {
        DEFAULT: `rgb(from var(--color-ink) r g b / calc(alpha * <alpha-value>))`,
        loud: `rgb(from var(--color-ink-loud) r g b / calc(alpha * <alpha-value>))`,
      },
      red: `rgb(from var(--color-red) r g b / calc(alpha * <alpha-value>))`,
      orange: `rgb(from var(--color-orange) r g b / calc(alpha * <alpha-value>))`,
      amber: `rgb(from var(--color-amber) r g b / calc(alpha * <alpha-value>))`,
      yellow: `rgb(from var(--color-yellow) r g b / calc(alpha * <alpha-value>))`,
      lime: `rgb(from var(--color-lime) r g b / calc(alpha * <alpha-value>))`,
      wasabi: `rgb(from var(--color-wasabi) r g b / calc(alpha * <alpha-value>))`,
      green: `rgb(from var(--color-green) r g b / calc(alpha * <alpha-value>))`,
      emerald: `rgb(from var(--color-emerald) r g b / calc(alpha * <alpha-value>))`,
      teal: `rgb(from var(--color-teal) r g b / calc(alpha * <alpha-value>))`,
      cyan: `rgb(from var(--color-cyan) r g b / calc(alpha * <alpha-value>))`,
      cyanold: `rgb(from var(--color-cyanold) r g b / calc(alpha * <alpha-value>))`,
      sky: `rgb(from var(--color-sky) r g b / calc(alpha * <alpha-value>))`,
      blue: `rgb(from var(--color-blue) r g b / calc(alpha * <alpha-value>))`,
      indigo: `rgb(from var(--color-indigo) r g b / calc(alpha * <alpha-value>))`,
      violet: `rgb(from var(--color-violet) r g b / calc(alpha * <alpha-value>))`,
      purple: `rgb(from var(--color-purple) r g b / calc(alpha * <alpha-value>))`,
      fuchsia: `rgb(from var(--color-fuchsia) r g b / calc(alpha * <alpha-value>))`,
      pink: `rgb(from var(--color-pink) r g b / calc(alpha * <alpha-value>))`,
      rose: `rgb(from var(--color-rose) r g b / calc(alpha * <alpha-value>))`,
      brick: {
        DEFAULT: `rgb(from var(--color-brick) r g b / calc(alpha * <alpha-value>))`,
        loud: `rgb(from var(--color-brick-loud) r g b / calc(alpha * <alpha-value>))`,
      },
      slate: `rgb(from var(--color-slate) r g b / calc(alpha * <alpha-value>))`,
      gray: `rgb(from var(--color-gray) r g b / calc(alpha * <alpha-value>))`,
      zinc: `rgb(from var(--color-zinc) r g b / calc(alpha * <alpha-value>))`,
      neutral: `rgb(from var(--color-neutral) r g b / calc(alpha * <alpha-value>))`,
      stone: `rgb(from var(--color-stone) r g b / calc(alpha * <alpha-value>))`,

      transparent: `transparent`,
      // Can be used like `current` but supports alpha values, e.g.:
      // `deecoration-currentColor/50` will be `color-mix(in srgb, currentColor 50%, transparent)`
      currentColor: `color-mix(in srgb, currentColor calc(<alpha-value> * 100%), transparent)`,
    },
    extend: {
      fontFamily: {
        chinese: `MaShanZheng-Regular`,
        cursive: `ui-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
        sans: `NationalPark`,
        mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
        karla: `Karla`,
      },

      spacing: {
        [`vvh`]: `var(--vvh)`, // VisualViewport height
        [`vvw`]: `var(--vvw)`, // VisualViewport width
        [`www-col`]: `988px`,
      },

      keyframes: {
        hoscillate: {
          "0%,100%": {
            transform: `translateX(-1px)`,
            "animation-timing-function": `ease-in-out`,
          },
          "50%": {
            transform: `translateX(1px)`,
            "animation-timing-function": `ease-in-out`,
          },
        },

        fadein: {
          "0%": { opacity: `0` },
          "100%": { opacity: `1` },
        },
      },

      animation: {
        hoscillate: `hoscillate 1s ease-in-out infinite`,
        fadein: `fadein 0.25s ease-in forwards`,
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
    fill: true,
    placeholderColor: false,
    placeholderOpacity: false,
    lineClamp: false,
    ringOpacity: false,
    stroke: true,
    strokeWidth: false,
    textOpacity: false,
    translate: false,
    visibility: true,
  },
};
