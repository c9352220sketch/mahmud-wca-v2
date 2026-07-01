"use strict";

const { idToJID } = require("../utils");

/**
 * sendMessage(threadID, message, callback?)
 *
 * `message` can be:
 *   - string  → plain text
 *   - { body, attachment, mentions, quote, ... } → rich message
 *
 * Compatible with FCA-style: api.sendMessage(msg, threadID, cb)
 * AND GoatBot style:         api.sendMessage(threadID, msg, cb)
 *
 * Returns Promise<{ messageID }>
 */
module.exports = (sock) =>
  async function sendMessage(threadID, message, callback) {
    // FCA arg-swap compat: if first arg is a string that looks like a message and second is an ID
    if (typeof threadID === "object" && typeof message === "string") {
      [threadID, message] = [message, threadID];
    }

    const jid = idToJID(threadID);
    let sent;

    try {
      if (typeof message === "string") {
        sent = await sock.sendMessage(jid, { text: message });
      } else {
        const content = {};

        if (message.body) content.text = message.body;
        if (message.text) content.text = message.text;
        if (message.mentions) content.mentions = message.mentions.map(idToJID);

        // Quoted message support
        const quoted = message.quote || message.quoted || null;

        if (Object.keys(content).length > 0) {
          sent = await sock.sendMessage(jid, content, quoted ? { quoted } : undefined);
        } else {
          // Fallback: send as text if nothing structured
          sent = await sock.sendMessage(jid, { text: JSON.stringify(message) });
        }
      }

      const result = { messageID: sent?.key?.id || null, key: sent?.key };
      if (typeof callback === "function") callback(null, result);
      return result;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
