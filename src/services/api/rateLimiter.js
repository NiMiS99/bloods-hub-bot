// src/services/api/rateLimiter.js
// Simple per-provider rate limiter using a token bucket.
// Prevents 429s from external APIs (especially Riot, which has strict limits).
const logger = require('../../utils/logger');

class RateLimiter {
  /**
   * @param {object} opts
   * @param {number} opts.maxRequests - Max requests in the window.
   * @param {number} opts.windowMs - Window size in milliseconds.
   */
  constructor({ maxRequests, windowMs }) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
  }

  async acquire() {
    this._refill();
    if (this.tokens <= 0) {
      const waitMs = this.windowMs - (Date.now() - this.lastRefill);
      if (waitMs > 0) {
        logger.debug(`[rateLimiter] Waiting ${waitMs}ms for token...`);
        await new Promise((r) => setTimeout(r, waitMs));
        this._refill();
      }
    }
    this.tokens--;
  }

  _refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.windowMs) {
      this.tokens = this.maxRequests;
      this.lastRefill = now;
    }
  }
}

// Per-provider limiters.
// Riot: 20 req/s, 100 req/2min — we use conservative 15/s.
// Steam: 10 req/s — conservative 8/s.
// Battle.net: no documented hard limit — conservative 10/s.
const limiters = {
  riot: new RateLimiter({ maxRequests: 15, windowMs: 1000 }),
  steam: new RateLimiter({ maxRequests: 8, windowMs: 1000 }),
  battlenet: new RateLimiter({ maxRequests: 10, windowMs: 1000 }),
};

/**
 * Wait for rate limit clearance before making an API call.
 * @param {string} provider - 'riot', 'steam', 'battlenet'
 */
async function acquire(provider) {
  const limiter = limiters[provider];
  if (limiter) await limiter.acquire();
}

module.exports = { acquire, RateLimiter };
