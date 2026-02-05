// oxlint-disable-next-line no-restricted-imports
import { customAlphabet } from "nanoid";

const alphabet = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`;
const length = 12;

export const nanoid = customAlphabet(alphabet, length);
