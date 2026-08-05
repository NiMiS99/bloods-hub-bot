// src/utils/textFormatter.js
// ============================================================================
//  Maps standard alphanumeric text to the Mathematical Sans-Serif Unicode style
//  used natively by the Bloods community Discord (e.g. "Comunicazioni" ->
//  "������𝖼𝖺𝗓𝗂𝗈𝗇𝗂", "News" -> "����").
//
//  This preserves the guild's historical styling across all bot-created
//  channels, categories and embed titles.
//
//  Rules:
//   • A-Z and a-z  -> Mathematical Sans-Serif equivalents.
//   • Digits, symbols, spaces, emoji, Discord mentions (<@&id>, <#id>) and
//     punctuation are kept as standard ASCII/Unicode — Sans-Serif has no
//     digit/symbol equivalents and Discord renders them fine alongside the
//     styled letters.
// ============================================================================

// Mathematical Sans-Serif Uppercase A-Z -> U+1D5A0 .. U+1D5B9
// This range is contiguous with no holes, so it can be computed directly.
const SANS_UPPER = {};
for (let i = 0; i < 26; i++) {
  SANS_UPPER[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1d5a0 + i);
}

// Mathematical Sans-Serif Lowercase a-z -> U+1D5BA .. U+1D5D3
// This range is contiguous with no holes, so it can be computed directly.
const SANS_LOWER = {};
for (let i = 0; i < 26; i++) {
  SANS_LOWER[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1d5ba + i);
}

/**
 * Convert a string to Sans-Serif styling.
 * A-Z and a-z are mapped to their Mathematical Sans-Serif equivalents; every
 * other character (digits, symbols, spaces, emoji, mentions) is left untouched.
 *
 * @param {string} text - The input string.
 * @returns {string} The Sans-Serif-styled string (same length as input).
 */
function toFraktur(text) {
  if (text == null) return text;
  return String(text).replace(/[A-Za-z]/g, (ch) =>
    SANS_UPPER[ch] || SANS_LOWER[ch]
  );
}

// Reverse lookup maps (Sans-Serif -> ASCII)
const SANS_UPPER_REV = {};
for (const [ascii, sans] of Object.entries(SANS_UPPER)) {
  SANS_UPPER_REV[sans] = ascii;
}
const SANS_LOWER_REV = {};
for (const [ascii, sans] of Object.entries(SANS_LOWER)) {
  SANS_LOWER_REV[sans] = ascii;
}

/**
 * Convert a Sans-Serif-styled string back to standard ASCII.
 * Useful for matching channel/category names that use Fraktur styling.
 *
 * @param {string} text - The Sans-Serif-styled string.
 * @returns {string} The ASCII-decoded string.
 */
function fromFraktur(text) {
  if (text == null) return text;
  return String(text).replace(/[\u{1D5A0}-\u{1D5B9}\u{1D5BA}-\u{1D5D3}]/gu, (ch) =>
    SANS_UPPER_REV[ch] || SANS_LOWER_REV[ch] || ch
  );
}

module.exports = { toFraktur, fromFraktur, SANS_UPPER, SANS_LOWER };
