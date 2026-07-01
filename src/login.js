"use strict";

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const EventEmitter = require("events");
const path = require("path");
const fs = require("fs");

const sendMessage = require("./api/sendMessage");
const sendFile = require("./api/sendFile");
const reactMsg = require("./api/react");
const deleteMessage = require("./api/deleteMessage");
const getUserInfo = require("./api/getUserInfo");
const getThreadInfo = require("./api/getThreadInfo");
const getThreadList = require("./api/getThreadList");
const addUserToGroup = require("./api/addUserToGroup");
const removeUserFromGroup = require("./api/removeUserFromGroup");
const changeGroupName = require("./api/changeGroupName");
const createGroup = require("./api/createGroup");
const listenEvents = require("./api/listenEvents");

const { normaliseJID } = require("./utils");

/**
 * login(options) → { api, ev }
 *
 * Options:
 *   authFolder  - path to store session files (default: "auth_info")
 *   browser     - [name, browser, version]
 *   printQR     - boolean (default: true)
 *   logger      - pino logger level (default: "silent")
 */
async function login(options = {}) {
  const {
    authFolder = "auth_info",
    browser = ["Hinata Bot WP", "Chrome", "4.0.0"],
    printQR = true,
    logger: logLevel = "silent",
  } = options;

  if (!fs.existsSync(authFolder)) fs.mkdirSync(authFolder, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: logLevel });

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser,
    generateHighQualityLinkPreview: true,
    getMessage: async () => undefined,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid),
  });

  const emitter = new EventEmitter();

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && printQR) {
      qrcode.generate(qr, { small: true });
      console.log("\n📱 Scan the QR code above with WhatsApp to login.\n");
    }

    if (connection === "open") {
      console.log("✅ mahmud-wca: WhatsApp connected successfully!");
      emitter.emit("connection.open", sock.user);
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("⚡ mahmud-wca: Reconnecting...");
        emitter.emit("connection.close", { reason, shouldReconnect: true });
      } else {
        console.log("🔴 mahmud-wca: Logged out. Please re-scan QR.");
        emitter.emit("connection.close", { reason, shouldReconnect: false });
      }
    }
  });

  // Forward all Baileys events to the emitter
  sock.ev.on("messages.upsert", (data) => emitter.emit("messages.upsert", data));
  sock.ev.on("messages.update", (data) => emitter.emit("messages.update", data));
  sock.ev.on("message-receipt.update", (data) => emitter.emit("message-receipt.update", data));
  sock.ev.on("groups.update", (data) => emitter.emit("groups.update", data));
  sock.ev.on("group-participants.update", (data) => emitter.emit("group-participants.update", data));
  sock.ev.on("presence.update", (data) => emitter.emit("presence.update", data));
  sock.ev.on("chats.update", (data) => emitter.emit("chats.update", data));
  sock.ev.on("contacts.update", (data) => emitter.emit("contacts.update", data));
  sock.ev.on("call", (data) => emitter.emit("call", data));

  // Build the API object (FCA-compatible interface)
  const api = {
    // Raw Baileys socket (advanced usage)
    _sock: sock,

    // ── Messaging ──────────────────────────────────────────────
    sendMessage: sendMessage(sock),
    sendFile: sendFile(sock),
    react: reactMsg(sock),
    deleteMessage: deleteMessage(sock),

    // ── User & Thread info ─────────────────────────────────────
    getUserInfo: getUserInfo(sock),
    getThreadInfo: getThreadInfo(sock),
    getThreadList: getThreadList(sock),

    // ── Group management ───────────────────────────────────────
    addUserToGroup: addUserToGroup(sock),
    removeUserFromGroup: removeUserFromGroup(sock),
    changeGroupName: changeGroupName(sock),
    createGroup: createGroup(sock),

    // ── Events listener ────────────────────────────────────────
    listenMqtt: listenEvents(sock, emitter),

    // ── Misc helpers ───────────────────────────────────────────
    getCurrentUserID: () => normaliseJID(sock.user?.id || ""),
    getBotInfo: () => sock.user || {},

    /** Mark a thread as read */
    markAsRead: async (threadID) => {
      const jid = threadID.includes("@") ? threadID : threadID.includes("-") ? `${threadID}@g.us` : `${threadID}@s.whatsapp.net`;
      await sock.readMessages([{ remoteJid: jid, id: "all" }]);
    },

    /** Set bot presence (available / unavailable / composing / recording) */
    setPresence: async (threadID, type = "available") => {
      const jid = threadID.includes("@") ? threadID : `${threadID}@s.whatsapp.net`;
      await sock.sendPresenceUpdate(type, jid);
    },

    /** Raw event emitter access */
    on: (event, listener) => emitter.on(event, listener),
    once: (event, listener) => emitter.once(event, listener),
    off: (event, listener) => emitter.off(event, listener),
    emit: (event, ...args) => emitter.emit(event, ...args),
  };

  return api;
}

module.exports = login;
