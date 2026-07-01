"use strict";

/**
 * changeAvatar(image, caption?, ttl?, callback?)
 * FCA signature includes a caption + story TTL (Facebook-only concepts).
 * WhatsApp only supports setting the bot's own profile picture, so those
 * extra args are accepted for compat but ignored.
 */
module.exports = (sock) =>
  async function changeAvatar(image, caption, ttl, callback) {
    if (typeof caption === "function") { callback = caption; caption = null; ttl = null; }
    else if (typeof ttl === "function") { callback = ttl; ttl = null; }

    try {
      const content = Buffer.isBuffer(image) ? image : image;
      await sock.updateProfilePicture(sock.user.id, content);
      if (typeof callback === "function") callback(null);
      return null;
    } catch (err) {
      if (typeof callback === "function") callback(err);
      throw err;
    }
  };
