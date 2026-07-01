"use strict";

const { idToJID } = require("./utils");

/**
 * editMessage(newText, messageID, threadID?, callback?)
 * WhatsApp doesn't support message editing natively.
 * Fallback: delete old message + send new one.
 */
module.exports = (sock) =>
  async function editMessage(newText, messageID, threadID, callback) {
    if (typeof threadID === "function") { callback = threadID; threadID = null; }

    try {
      // Try native WA edit (supported in newer Baileys versions)
      if (threadID) {
        const jid = idToJID(threadID);
        try {
          await sock.sendMessage(jid, {
            text: newText,
            edit: { remoteJid: jid, id: messageID, fromMe: true }
          });
          const result = { messageID };
          if (typeof callback === "function") callback(null, result);
          return result;
        } catch (_) {
          // Fall through to delete + resend
          if (jid) {
            await sock.sendMessage(jid, {
              delete: { remoteJid: jid, id: messageID, fromMe: true }
            }).catch(() => {});
            const sent = await sock.sendMessage(jid, { text: newText });
            const result = { messageID: sent?.key?.id || null };
            if (typeof callback === "function") callback(null, result);
            return result;
          }
        }
      }
      const result = { messageID: null };
      if (typeof callback === "function") callback(null, result);
      return result;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
