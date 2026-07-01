"use strict";

const { idToJID } = require("../utils");

/**
 * react(threadID, messageID, emoji, callback?)
 * Send an emoji reaction to a message.
 */
module.exports = (sock) =>
  async function react(threadID, messageID, emoji, callback) {
    const jid = idToJID(threadID);
    try {
      await sock.sendMessage(jid, {
        react: { text: emoji, key: { remoteJid: jid, id: messageID } },
      });
      if (typeof callback === "function") callback(null);
    } catch (err) {
      if (typeof callback === "function") callback(err);
      throw err;
    }
  };
