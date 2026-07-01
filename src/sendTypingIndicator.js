"use strict";

const { idToJID } = require("./utils");

/**
 * sendTypingIndicator(threadID, isTyping, callback?)
 * FCA-compatible typing indicator.
 */
module.exports = (sock) =>
  async function sendTypingIndicator(threadID, isTyping = true, callback) {
    const jid = idToJID(threadID);
    try {
      await sock.sendPresenceUpdate(isTyping ? "composing" : "paused", jid);
      if (typeof callback === "function") callback(null);
    } catch (err) {
      if (typeof callback === "function") callback(err);
    }
  };
