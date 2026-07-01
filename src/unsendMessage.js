"use strict";

const { resolveMessageJID } = require("./utils");

/**
 * unsendMessage(messageID, callback?)
 * FCA-compatible signature — no threadID; resolved from the message cache.
 * Only works for messages the bot itself sent (WhatsApp restriction).
 */
module.exports = (sock) =>
  async function unsendMessage(messageID, callback) {
    let resolveFunc = () => {};
    let rejectFunc = () => {};
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = (err, result) => (err ? rejectFunc(err) : resolveFunc(result));
    }

    try {
      const jid = resolveMessageJID(messageID);
      if (!jid) {
        throw new Error(
          `unsendMessage: unknown messageID "${messageID}" (not in cache — only messages sent during this session can be unsent)`
        );
      }

      await sock.sendMessage(jid, {
        delete: { remoteJid: jid, id: messageID, fromMe: true },
      });

      callback(null);
    } catch (err) {
      callback(err);
    }

    return returnPromise;
  };
