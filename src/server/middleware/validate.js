// src/server/middleware/validate.js
// Input validation middleware for Express routes.
const _logger = require('../../utils/logger');

/**
 * Validate pagination params (page, limit) with safe bounds.
 */
function validatePagination(req, res, next) {
  req.query.page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 1000);
  req.query.limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  next();
}

/**
 * Validate that required body fields are present.
 * @param {string[]} fields - Required field names
 */
function requireBodyFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => !req.body?.[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Campi obbligatori mancanti: ${missing.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * Validate string length and sanitize.
 * @param {string} field - Body field name
 * @param {object} opts - { min, max, required }
 */
function validateString(field, opts = {}) {
  return (req, res, next) => {
    const { min = 1, max = 1000, required = false } = opts;
    const val = req.body?.[field];
    if (val === undefined || val === null) {
      if (required) {
        return res.status(400).json({ error: `Campo "${field}" obbligatorio` });
      }
      return next();
    }
    if (typeof val !== 'string') {
      return res.status(400).json({ error: `Campo "${field}" deve essere una stringa` });
    }
    if (val.length < min || val.length > max) {
      return res.status(400).json({ error: `Campo "${field}" deve essere tra ${min} e ${max} caratteri` });
    }
    next();
  };
}

/**
 * Validate Discord snowflake ID format (17-20 digit number).
 */
function isValidDiscordId(id) {
  return /^\d{17,20}$/.test(String(id));
}

/**
 * Validate cron expression (basic check).
 */
function isValidCron(expr) {
  if (typeof expr !== 'string' || expr.length > 100) return false;
  // Basic cron pattern: 5 fields separated by spaces
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) return false;
  return true;
}

/**
 * Global body sanitizer — strips HTML tags from string fields and enforces max length.
 * Apply globally before routes to prevent XSS via stored input.
 */
function sanitizeBody(maxLen = 5000) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      for (const key of Object.keys(req.body)) {
        const val = req.body[key];
        if (typeof val === 'string') {
          req.body[key] = val.slice(0, maxLen).replace(/<[^>]*>/g, '');
        }
      }
    }
    next();
  };
}

module.exports = {
  validatePagination,
  requireBodyFields,
  validateString,
  sanitizeBody,
  isValidDiscordId,
  isValidCron,
};
