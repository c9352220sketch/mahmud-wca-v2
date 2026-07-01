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
const fs = require("fs");

const sendMessage = require("./sendMessage");
const sendFile = require("./sendFile");
const reactMsg = require("./react");
const setMessageReaction = require("./setMessageReaction");
const unsendMessage = require("./unsendMessage");
const deleteMessage = require("./deleteMessage");
const editMessage = require("./editMessage");
const changeNickname = require("./changeNickname");
const sendTypingIndicator = require("./sendTypingIndicator");
const getUserInfo = require("./getUserInfo");
const getThreadInfo = require("./getThreadInfo");
const getThreadList = require("./getThreadList");
const addUserToGroup = require("./addUserToGroup");
const removeUserFromGroup = require("./removeUserFromGroup");
const changeGroupName = require("./changeGroupName");
const changeGroupImage = require("./changeGroupImage");
const changeAvatar = require("./changeAvatar");
const changeThreadEmoji = require("./changeThreadEmoji");
const changeThreadColor = require("./changeThreadColor");
const createGroup = require("./createGroup");
const getAppState = require("./getAppState");
const httpPost = require("./httpPost");
const listenEvents = require("./listenEvents");

const { normaliseJID, jidToID, idToJID } = require("./utils");

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
      console.log("✅ mahmud-wca: WhatsApp connected!");
      emitter.emit("connection.open", sock.user);
    }
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      emitter.emit("connection.close", { reason, shouldReconnect });
      if (shouldReconnect) {
        console.log("⚡ mahmud-wca: Reconnecting...");
      } else {
        console.log("🔴 mahmud-wca: Logged out. Re-scan QR.");
      }
    }
  });

  // Forward all Baileys events
  for (const evName of [
    "messages.upsert", "messages.update", "message-receipt.update",
    "groups.update", "group-participants.update", "presence.update",
    "chats.update", "contacts.update", "call",
  ]) {
    sock.ev.on(evName, (data) => emitter.emit(evName, data));
  }

  // Build FCA-compatible API object.
  // Method names and signatures mirror mahmud-fca's src/<method>.js layout
  // 1:1 so bot commands written against either library work unmodified.
  const api = {
    _sock: sock,

    // ── Messaging ───────────────────────────────────────────────────────────
    sendMessage: sendMessage(sock),
    sendFile: sendFile(sock),
    react: reactMsg(sock),
    setMessageReaction: setMessageReaction(sock),
    unsendMessage: unsendMessage(sock),
    deleteMessage: deleteMessage(sock),
    editMessage: editMessage(sock),
    sendTypingIndicator: sendTypingIndicator(sock),

    // ── Info ────────────────────────────────────────────────────────────────
    getUserInfo: getUserInfo(sock),
    getThreadInfo: getThreadInfo(sock),
    getThreadList: getThreadList(sock),
    getAppState: getAppState(sock),

    // ── Group management ────────────────────────────────────────────────────
    addUserToGroup: addUserToGroup(sock),
    removeUserFromGroup: removeUserFromGroup(sock),
    changeGroupName: changeGroupName(sock),
    changeGroupImage: changeGroupImage(sock),
    changeAvatar: changeAvatar(sock),
    changeNickname: changeNickname(sock),
    changeThreadEmoji: changeThreadEmoji(sock),
    changeThreadColor: changeThreadColor(sock),
    createGroup: createGroup(sock),

    // ── Networking ──────────────────────────────────────────────────────────
    httpPost: httpPost(sock),

    // ── Events ──────────────────────────────────────────────────────────────
    listenMqtt: listenEvents(sock, emitter),

    // ── Helpers ─────────────────────────────────────────────────────────────
    getCurrentUserID: () => jidToID(normaliseJID(sock.user?.id || "")),
    getBotInfo: () => sock.user || {},

    markAsRead: async (threadID) => {
      const jid = idToJID(threadID);
      await sock.readMessages([{ remoteJid: jid, id: "all" }]).catch(() => {});
    },

    setPresence: async (threadID, type = "available") => {
      const jid = idToJID(threadID);
      await sock.sendPresenceUpdate(type, jid).catch(() => {});
    },

    // FCA compat — no-op for WA
    changeBlockedStatus: async () => {},
    setTitle: async (title, threadID) => {
      if (threadID) {
        const jid = idToJID(threadID);
        await sock.groupUpdateSubject(jid, title).catch(() => {});
      }
    },

    // EventEmitter passthrough
    on: (e, l) => emitter.on(e, l),
    once: (e, l) => emitter.once(e, l),
    off: (e, l) => emitter.off(e, l),
    emit: (e, ...a) => emitter.emit(e, ...a),
  };

  return api;
}

module.exports = login;
