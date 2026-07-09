"use strict";

const executeWithRetry = async (fn, opts = {}) => {
  const { retries = 3, delay = 200, factor = 2 } = opts;
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      if (++attempt >= retries) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(factor, attempt)));
    }
  }
};

module.exports = { executeWithRetry };
