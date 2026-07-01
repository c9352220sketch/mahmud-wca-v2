"use strict";

const { idToJID } = require("./utils");

/**
 * deleteMessage(threadID, messageID, callback?)
 * Delete a message (for everyone).
 */
module.exports = (sock) =>
  async function deleteMessage(threadID, messageID, callback) {
    const jid = idToJID(threadID);
    try {
      await sock.sendMessage(jid, {
        delete: { remoteJid: jid, id: messageID, fromMe: true },
      });
      if (typeof callback === "function") callback(null);
    } catch (err) {
      if (typeof callback === "function") callback(err);
      throw err;
    }
  };
