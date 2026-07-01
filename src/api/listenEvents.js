"use strict";

const {
  normaliseJID, jidToID, extractBody, extractQuoted,
  extractReaction, mediaType, downloadMedia,
} = require("../utils");

/**
 * listenMqtt(callback)
 *
 * Produces FCA-compatible event objects from WhatsApp events.
 * All IDs are numeric strings (no @s.whatsapp.net / @g.us suffix).
 *
 * event.type ∈ "message" | "message_reply" | "message_reaction" | "event" | "typ"
 */
module.exports = (sock, emitter) =>
  function listenMqtt(callback) {

    // ── Incoming messages ─────────────────────────────────────────────────
    emitter.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue;

        const jid = normaliseJID(msg.key.remoteJid || "");
        const isGroup = jid.endsWith("@g.us");
        const senderJID = isGroup
          ? normaliseJID(msg.key.participant || "")
          : jid;

        const body = extractBody(msg);
        const quoted = extractQuoted(msg);
        const mType = mediaType(msg);

        const attachments = [];
        if (mType) {
          attachments.push({
            type: mType,
            ID: msg.key.id,
            url: null,
            filename: `${msg.key.id}.${mType === "photo" ? "jpg" : mType === "video" ? "mp4" : mType === "audio" ? "mp3" : "bin"}`,
            getBuffer: () => downloadMedia(msg),
          });
        }

        // mentions: { [userID]: "@phoneNumber" } — FCA format
        const mentions = {};
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        for (const mjid of mentioned) {
          const uid = jidToID(normaliseJID(mjid));
          mentions[uid] = `@${uid}`;
        }

        // participantIDs: members of the group (from cached thread data)
        const threadID = jidToID(jid);
        const cachedThread = global.db?.threads?.[threadID];
        const participantIDs = (cachedThread?.members || []).map(m => m.userID || m);

        const event = {
          type: quoted ? "message_reply" : "message",
          senderID: jidToID(senderJID),
          threadID,
          messageID: msg.key.id,
          body,
          attachments,
          timestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000),
          isGroup,
          participantIDs,
          mentions,
          // Reply info (FCA compat)
          messageReply: quoted ? {
            senderID: jidToID(quoted.senderID || ""),
            messageID: quoted.messageID,
            body: quoted.body,
          } : undefined,
          _raw: msg,
          _sock: sock,
        };

        callback(null, event);
      }
    });

    // ── Reactions ─────────────────────────────────────────────────────────
    emitter.on("messages.update", (updates) => {
      for (const update of updates) {
        const reaction = extractReaction(update);
        if (!reaction) continue;
        const jid = normaliseJID(update.key?.remoteJid || "");
        const senderJID = normaliseJID(update.key?.participant || update.key?.remoteJid || "");
        callback(null, {
          type: "message_reaction",
          threadID: jidToID(jid),
          senderID: jidToID(senderJID),
          messageID: reaction.messageID,
          reaction: reaction.reaction,
          userReaction: reaction.reaction,
          timestamp: Math.floor(Date.now() / 1000),
          _raw: update,
        });
      }
    });

    // ── Group participant changes ──────────────────────────────────────────
    emitter.on("group-participants.update", async (update) => {
      const jid = normaliseJID(update.id || "");
      const action = update.action; // "add" | "remove" | "promote" | "demote"
      const threadID = jidToID(jid);
      const author = update.author ? jidToID(normaliseJID(update.author)) : "";

      if (action === "add") {
        // Build addedParticipants in FCA format: [{ userFbId, fullName }]
        const addedParticipants = await Promise.all(
          (update.participants || []).map(async (pJid) => {
            const uid = jidToID(normaliseJID(pJid));
            let fullName = uid;
            try {
              const info = await sock.fetchStatus(pJid).catch(() => null);
              if (info?.status) fullName = info.status;
              // Try contacts
              const contact = sock.store?.contacts?.[pJid] || {};
              if (contact.name || contact.notify) fullName = contact.name || contact.notify;
            } catch (_) {}
            return { userFbId: uid, fullName };
          })
        );

        callback(null, {
          type: "event",
          threadID,
          logMessageType: "log:subscribe",
          logMessageData: { addedParticipants },
          author,
          timestamp: Math.floor(Date.now() / 1000),
          isGroup: true,
          _raw: update,
        });

      } else if (action === "remove") {
        for (const pJid of (update.participants || [])) {
          const uid = jidToID(normaliseJID(pJid));
          callback(null, {
            type: "event",
            threadID,
            logMessageType: "log:unsubscribe",
            logMessageData: {
              leftParticipantFbId: uid,
              leftParticipants: [uid],
            },
            author,
            timestamp: Math.floor(Date.now() / 1000),
            isGroup: true,
            _raw: update,
          });
        }

      } else if (action === "promote" || action === "demote") {
        for (const pJid of (update.participants || [])) {
          const uid = jidToID(normaliseJID(pJid));
          callback(null, {
            type: "event",
            threadID,
            logMessageType: "log:thread-admins",
            logMessageData: {
              ADMIN_EVENT: action === "promote" ? "add_admin" : "remove_admin",
              TARGET_ID: uid,
            },
            author,
            timestamp: Math.floor(Date.now() / 1000),
            isGroup: true,
            _raw: update,
          });
        }
      }
    });

    // ── Group metadata changes ─────────────────────────────────────────────
    emitter.on("groups.update", (updates) => {
      for (const update of updates) {
        const jid = normaliseJID(update.id || "");
        const threadID = jidToID(jid);

        if (update.subject) {
          callback(null, {
            type: "event",
            threadID,
            logMessageType: "log:thread-name",
            logMessageData: { name: update.subject },
            timestamp: Math.floor(Date.now() / 1000),
            isGroup: true,
          });
        }
        if (update.icon) {
          callback(null, {
            type: "event",
            threadID,
            logMessageType: "log:thread-icon",
            logMessageData: { thread_icon: update.icon },
            timestamp: Math.floor(Date.now() / 1000),
            isGroup: true,
          });
        }
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    emitter.on("presence.update", ({ id, presences }) => {
      for (const [participantJid, presence] of Object.entries(presences || {})) {
        callback(null, {
          type: "typ",
          threadID: jidToID(normaliseJID(id)),
          senderID: jidToID(normaliseJID(participantJid)),
          isTyping: ["composing", "recording"].includes(presence.lastKnownPresence),
        });
      }
    });

    return function stopListening() {
      emitter.removeAllListeners("messages.upsert");
      emitter.removeAllListeners("messages.update");
      emitter.removeAllListeners("group-participants.update");
      emitter.removeAllListeners("groups.update");
      emitter.removeAllListeners("presence.update");
    };
  };
