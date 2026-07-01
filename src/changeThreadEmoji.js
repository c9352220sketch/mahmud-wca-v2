"use strict";

/**
 * changeThreadEmoji(emoji, threadID, callback?)
 * WhatsApp has no per-chat "emoji" concept (that's a Messenger-only feature).
 * No-op stub so anti-change / theme scripts ported from the FB bot don't crash.
 */
module.exports = () =>
  async function changeThreadEmoji(emoji, threadID, callback) {
    if (typeof callback === "function") callback(null);
    return null;
  };
