"use strict";

const axios = require("axios");

/**
 * httpPost(url, form, callback?)
 * Generic HTTP POST wrapper kept for FCA-compat call sites. This does NOT
 * talk to Facebook internals (there is nothing to reproduce on WhatsApp) —
 * it simply performs a real POST request so calling code that expects a
 * `{ data }`-shaped response doesn't throw.
 */
module.exports = () =>
  async function httpPost(url, form, callback) {
    try {
      const response = await axios.post(url, form);
      if (typeof callback === "function") callback(null, response);
      return response;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
