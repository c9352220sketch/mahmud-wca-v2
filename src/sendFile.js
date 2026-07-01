"use strict";

const fs = require("fs");
const path = require("path");
const { idToJID, guessMime, cacheMessage } = require("./utils");

/**
 * sendFile(threadID, filePath, caption?, callback?)
 *
 * Detects mime type and sends as image / video / audio / document.
 * Returns Promise<{ messageID }>
 */
module.exports = (sock) =>
  async function sendFile(threadID, filePath, caption = "", callback) {
    if (typeof caption === "function") {
      callback = caption;
      caption = "";
    }

    const jid = idToJID(threadID);
    const mime = guessMime(filePath);
    let buffer;

    try {
      if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
        const axios = require("axios");
        const resp = await axios.get(filePath, { responseType: "arraybuffer" });
        buffer = Buffer.from(resp.data);
      } else {
        buffer = fs.readFileSync(filePath);
      }

      let msgContent;
      const filename = path.basename(filePath);

      if (mime.startsWith("image/")) {
        msgContent = { image: buffer, caption, mimetype: mime };
      } else if (mime.startsWith("video/")) {
        msgContent = { video: buffer, caption, mimetype: mime };
      } else if (mime.startsWith("audio/")) {
        msgContent = { audio: buffer, mimetype: mime, ptt: false };
      } else {
        msgContent = { document: buffer, caption, mimetype: mime, fileName: filename };
      }

      const sent = await sock.sendMessage(jid, msgContent);
      const result = { messageID: sent?.key?.id || null };
      cacheMessage(result.messageID, jid, true);
      if (typeof callback === "function") callback(null, result);
      return result;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
