"use strict";

/**
 * changeNickname(nickname, threadID, userID, callback?)
 * WhatsApp doesn't support nicknames via API.
 * Stub that silently succeeds (GoatBot compat).
 */
module.exports = (sock) =>
  async function changeNickname(nickname, threadID, userID, callback) {
    // WA API does not expose nickname changes programmatically
    if (typeof callback === "function") callback(null);
    return null;
  };
