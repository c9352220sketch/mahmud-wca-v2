"use strict";

const { jidToID } = require("../utils");

/**
 * getThreadList(count, timestamp, tags, callback?)
 * Returns a list of recent threads (chats).
 */
module.exports = (sock) =>
  async function getThreadList(count = 20, timestamp = null, tags = [], callback) {
    if (typeof count === "function") { callback = count; count = 20; }
    if (typeof timestamp === "function") { callback = timestamp; timestamp = null; }

    try {
      const chats = Object.values(sock.store?.chats || {})
        .slice(0, count)
        .map((chat) => ({
          threadID: jidToID(chat.id),
          name: chat.name || chat.id,
          unreadCount: chat.unreadCount || 0,
          isGroup: chat.id.endsWith("@g.us"),
          isSubscribed: true,
          folder: "INBOX",
          lastReadTimestamp: null,
        }));

      if (typeof callback === "function") callback(null, chats);
      return chats;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
