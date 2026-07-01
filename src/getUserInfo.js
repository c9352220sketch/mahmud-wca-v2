"use strict";

const { idToJID, jidToID, normaliseJID } = require("./utils");

/**
 * getUserInfo(userID | [userID, ...], callback?)
 * Returns a map of userID → { name, uid, profilePicture, vanity, type }
 */
module.exports = (sock) =>
  async function getUserInfo(userIDs, callback) {
    const ids = Array.isArray(userIDs) ? userIDs : [userIDs];
    const result = {};

    try {
      for (const id of ids) {
        const jid = idToJID(id);
        const uid = jidToID(jid);
        let pp = null;

        try {
          pp = await sock.profilePictureUrl(jid, "image");
        } catch (_) {}

        const contact = sock.store?.contacts?.[jid] || {};
        result[uid] = {
          name: contact.name || contact.notify || contact.verifiedName || uid,
          uid,
          profilePicture: pp,
          vanity: null,
          type: "user",
        };
      }

      if (typeof callback === "function") callback(null, result);
      return result;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
