"use strict";

const { resolveMessageJID } = require("./utils");

/**
 * setMessageReaction(reaction, messageID, callback?, forceCustomReaction?)
 * FCA-compatible signature — no threadID; resolved from the message cache.
 * Pass an empty string ("") to remove a reaction (matches FCA behavior).
 */
module.exports = (sock) =>
  async function setMessageReaction(reaction, messageID, callback, forceCustomReaction) {
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
          `setMessageReaction: unknown messageID "${messageID}" (not in cache — only messages seen or sent during this session can be reacted to)`
        );
      }

      await sock.sendMessage(jid, {
        react: { text: reaction || "", key: { remoteJid: jid, id: messageID, fromMe: false } },
      });

      callback(null);
    } catch (err) {
      callback(err);
    }

    return returnPromise;
  };
