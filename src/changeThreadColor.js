"use strict";

/**
 * changeThreadColor(color, threadID, callback?)
 * WhatsApp has no per-chat theme color (Messenger-only feature).
 * No-op stub so anti-change / theme scripts ported from the FB bot don't crash.
 */
module.exports = () =>
  async function changeThreadColor(color, threadID, callback) {
    if (typeof callback === "function") callback(null);
    return null;
  };
