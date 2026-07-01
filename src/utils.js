"use strict";

const mime = require("mime-types");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

/**
 * Normalise a WhatsApp JID to the standard format.
 * Group JIDs end with @g.us, user JIDs with @s.whatsapp.net
 */
function normaliseJID(jid = "") {
  if (!jid) return jid;
  if (jid.includes(":") && !jid.includes("@g.us")) {
    const [user] = jid.split(":");
    return `${user}@s.whatsapp.net`;
  }
  return jid;
}

/**
 * Convert a WA JID to a numeric-style "userID" string used in GoatBot commands.
 * Groups: strip @g.us  |  Users: strip @s.whatsapp.net
 */
function jidToID(jid = "") {
  return jid.replace(/@[a-z.]+$/i, "");
}

/**
 * Convert a GoatBot-style "userID" back to a WhatsApp JID.
 * If the ID contains a hyphen it's a group, otherwise a user.
 */
function idToJID(id = "") {
  if (!id) return "";
  if (id.includes("@")) return id;
  if (id.includes("-")) return `${id}@g.us`;
  return `${id}@s.whatsapp.net`;
}

/**
 * Check whether a JID belongs to a group.
 */
function isGroup(jid = "") {
  return jid.endsWith("@g.us");
}

/**
 * Build a message key object (used by Baileys for quote / delete operations).
 */
function buildKey(jid, id, fromMe = false) {
  return { remoteJid: jid, id, fromMe };
}

/**
 * Download a Baileys media message and return a Buffer.
 */
async function downloadMedia(msg) {
  return downloadMediaMessage(msg, "buffer", {});
}

/**
 * Guess MIME type from a file path or URL.
 */
function guessMime(filePath = "") {
  return mime.lookup(path.extname(filePath)) || "application/octet-stream";
}

/**
 * Extract the plain text body from a Baileys message object.
 */
function extractBody(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title ||
    m.templateButtonReplyMessage?.selectedDisplayText ||
    ""
  );
}

/**
 * Extract the quoted message info (for onReply detection).
 */
function extractQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx || !ctx.quotedMessage) return null;
  return {
    senderID: ctx.participant ? normaliseJID(ctx.participant) : normaliseJID(ctx.remoteJid || ""),
    messageID: ctx.stanzaId,
    body: extractBody({ message: ctx.quotedMessage }),
    message: ctx.quotedMessage,
  };
}

/**
 * Extract reaction info from a message update.
 */
function extractReaction(msg) {
  const r = msg.message?.reactionMessage;
  if (!r) return null;
  return {
    reaction: r.text || "",
    messageID: r.key?.id,
    senderID: normaliseJID(msg.key?.participant || msg.key?.remoteJid || ""),
  };
}

/**
 * Determine the media type string from a Baileys message.
 */
function mediaType(msg) {
  const m = msg.message;
  if (!m) return null;
  if (m.imageMessage) return "photo";
  if (m.videoMessage) return "video";
  if (m.audioMessage) return "audio";
  if (m.documentMessage) return "file";
  if (m.stickerMessage) return "sticker";
  return null;
}

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  normaliseJID,
  jidToID,
  idToJID,
  isGroup,
  buildKey,
  downloadMedia,
  guessMime,
  extractBody,
  extractQuoted,
  extractReaction,
  mediaType,
  sleep,
};
