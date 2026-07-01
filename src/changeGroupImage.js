"use strict";

const { idToJID } = require("./utils");

/**
 * changeGroupImage(image, threadID, callback?)
 * `image` may be a Buffer, a readable stream, or a { url } object
 * (matches the `getStreamFromURL()` helper used across ported FB commands).
 */
module.exports = (sock) =>
  async function changeGroupImage(image, threadID, callback) {
    try {
      const jid = idToJID(threadID);
      const content = Buffer.isBuffer(image) ? image : image;
      await sock.updateProfilePicture(jid, content);
      if (typeof callback === "function") callback(null);
      return null;
    } catch (err) {
      if (typeof callback === "function") callback(err);
      throw err;
    }
  };
