import { invariant } from "@haohaohow/lib/invariant";

export interface ColorRGBA {
  /** Red channel (0-255) */
  red: number;
  /** Green channel (0-255) */
  green: number;
  /** Blue channel (0-255) */
  blue: number;
  /** Alpha channel (0-1) */
  alpha: number;
}

// One or more of of:
// - <whitespace>
// - <comment>
const spacePattern = String.raw`(?:\s|/\*[\s\S]*?\*/)`;
// One of:
// - <number>
// - <number>.<fraction>
// - .<fraction>
// - <number>%
// - <number>.<fraction>%
// - .<fraction>%
// - none
const scalarPattern = String.raw`\d+(?:\.\d*)?%?|\.\d+%?|none`;
// One of:
// - #<hexbyte><hexbyte><hexbyte>
const hexPattern = String.raw`#[a-f0-9]{6}`;
// One of:
// - rgb(<scalar> <scalar> <scalar>)
// - rgb(<scalar> <scalar> <scalar> / <scalar>)
const rgbRegex = new RegExp(
  `rgb\\(${spacePattern}*(${scalarPattern})${spacePattern}+(${scalarPattern})${spacePattern}+(${scalarPattern})(?:${spacePattern}*\\/${spacePattern}*(${scalarPattern}))?${spacePattern}*\\)`,
);
// One of:
// - rgb(from <hex> r g b)
// - rgb(from <hex> r g b / <scalar>)
const rgbRelativeRegex = new RegExp(
  `rgb\\(${spacePattern}*from${spacePattern}+(${hexPattern})${spacePattern}+r${spacePattern}+g${spacePattern}+b(?:${spacePattern}*\\/${spacePattern}*(${scalarPattern}))?${spacePattern}*\\)`,
);
const rgbHexRegex = new RegExp(`^${hexPattern}$`);

export function parseCssColorOrThrow(color: string): ColorRGBA {
  // CSS colour keywords/functions are case-insensitive.
  color = color.trim().toLowerCase();

  let match;

  match = rgbHexRegex.exec(color);
  if (match) {
    const [hexColor] = match;
    const { red, green, blue, alpha } = parseHexColor(hexColor);

    return {
      red,
      green,
      blue,
      alpha,
    };
  }

  match = rgbRegex.exec(color);
  if (match) {
    const [_, r, g, b, a] = match;
    invariant(r != null, `red channel is required in CSS color: ${color}`);
    invariant(g != null, `green channel is required in CSS color: ${color}`);
    invariant(b != null, `blue channel is required in CSS color: ${color}`);

    return {
      red: parseScalar(r) ?? 0,
      green: parseScalar(g) ?? 0,
      blue: parseScalar(b) ?? 0,
      alpha: parseScalar(a ?? `none`, 1) ?? 1,
    };
  }

  match = rgbRelativeRegex.exec(color);
  invariant(match != null, `could not parse CSS color: ${color}`);

  const [, hexColor, a] = match;
  invariant(hexColor != null, `hex color is required in CSS color: ${color}`);
  const { red, green, blue, alpha } = parseHexColor(hexColor);

  return {
    red,
    green,
    blue,
    alpha: alpha * (parseScalar(a ?? `none`, 1) ?? 1),
  };
}

function parseHexColor(color: string): ColorRGBA {
  invariant(rgbHexRegex.test(color), `invalid hex color: ${color}`);
  // Convert hex color to RGB
  const bigint = Number.parseInt(color.slice(1), 16);
  const red = (bigint >> 16) & 255;
  const green = (bigint >> 8) & 255;
  const blue = bigint & 255;
  return {
    red,
    green,
    blue,
    alpha: 1,
  };
}

export function parseScalar(
  value: string,
  /**
   * Configurable maximum value for the channel.
   * Defaults to 255, which is the maximum for RGB channels.
   * This is useful for alpha channels, which can be between 0 and 1.
   */
  maxValue = 255,
): number | null {
  if (value === `none`) {
    return null;
  }

  if (value.endsWith(`%`)) {
    const percentage = Number(value.slice(0, -1));
    invariant(
      percentage >= 0 && percentage <= 100,
      `percentage must be between 0 and 100: ${value}`,
    );
    return (percentage / 100) * maxValue;
  }

  const number = Number(value);
  invariant(
    number >= 0 && number <= maxValue,
    `number must be between 0 and ${maxValue}: ${value}`,
  );
  return number;
}
