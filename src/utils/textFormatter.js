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

// ============================================================================
// Comprehensive reverse map for ALL Mathematical Alphanumeric characters.
// Discord channel names may use a mix of Sans-Serif, Fraktur, Bold Fraktur,
// Bold, Italic, etc. — we need to decode them all back to ASCII for matching.
// ============================================================================
// Each block is 26 chars (A-Z) + 26 chars (a-z) = 52 chars, but some blocks
// have holes in uppercase (reserved code points). We handle the common ones.

// Mathematical Alphanumeric blocks (lowercase a-z ranges are always contiguous)
const MATH_BLOCKS = [
  // [upperStart, lowerStart, hasUpperHoles]
  [0x1d400, 0x1d41a, false], // Bold
  [0x1d434, 0x1d44e, false], // Italic
  [0x1d468, 0x1d482, false], // Bold Italic
  [0x1d504, 0x1d51e, true],  // Fraktur (uppercase has holes)
  [0x1d56c, 0x1d586, false], // Bold Fraktur
  [0x1d5a0, 0x1d5ba, false], // Sans-Serif (already handled, but include for completeness)
  [0x1d5d4, 0x1d5ee, false], // Sans-Serif Bold
  [0x1d608, 0x1d622, false], // Sans-Serif Italic
  [0x1d63c, 0x1d656, false], // Sans-Serif Bold Italic
  [0x1d670, 0x1d68a, false], // Monospace
];

// Fraktur uppercase holes: these code points are reserved (not letters)
const FRAKTUR_UPPER_HOLES = new Set([0x1d50a, 0x1d50c, 0x1d50d, 0x1d50e, 0x1d50f, 0x1d510, 0x1d511, 0x1d512, 0x1d513, 0x1d514, 0x1d515, 0x1d516, 0x1d517, 0x1d518, 0x1d519, 0x1d51a, 0x1d51b, 0x1d51c, 0x1d51d]);

// Build comprehensive reverse map
const MATH_REV = {};
for (const [upperStart, lowerStart, hasHoles] of MATH_BLOCKS) {
  // Lowercase (always contiguous)
  for (let i = 0; i < 26; i++) {
    MATH_REV[String.fromCodePoint(lowerStart + i)] = String.fromCharCode(97 + i);
  }
  // Uppercase
  for (let i = 0; i < 26; i++) {
    const cp = upperStart + i;
    if (hasHoles && FRAKTUR_UPPER_HOLES.has(cp)) continue;
    MATH_REV[String.fromCodePoint(cp)] = String.fromCharCode(65 + i);
  }
}

// Also handle Mathematical Bold digits 0-9 (U+1D7CE-U+1D7D7)
for (let i = 0; i < 10; i++) {
  MATH_REV[String.fromCodePoint(0x1d7ce + i)] = String.fromCharCode(48 + i);
}

/**
 * Convert any Mathematical Alphanumeric-styled string back to standard ASCII.
 * Handles Sans-Serif, Fraktur, Bold Fraktur, Bold, Italic, Monospace, etc.
 * Useful for matching channel/category names that use Unicode styling.
 *
 * @param {string} text - The styled string.
 * @returns {string} The ASCII-decoded string.
 */
function fromFraktur(text) {
  if (text == null) return text;
  return String(text).replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) =>
    MATH_REV[ch] || ch
  );
}

module.exports = { toFraktur, fromFraktur, SANS_UPPER, SANS_LOWER };
