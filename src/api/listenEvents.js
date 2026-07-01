"use strict";

const { normaliseJID, jidToID, extractBody, extractQuoted, extractReaction, mediaType, downloadMedia } = require("../utils");

/**
 * listenMqtt(callback)
 *
 * Calls callback with an FCA-compatible event object every time a relevant
 * WhatsApp event arrives.  Format mirrors mahmud-fca:
 *
 *   callback(err, event)
 *
 * event.type ∈ "message" | "message_reply" | "message_reaction" |
 *               "event" | "read" | "typ"
 */
module.exports = (sock, emitter) =>
  function listenMqtt(callback) {

    // ── Incoming messages ───────────────────────────────────────────────────
    emitter.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue; // ignore own messages by default

        const jid = normaliseJID(msg.key.remoteJid || "");
        const isGroup = jid.endsWith("@g.us");
        const senderJID = isGroup
          ? normaliseJID(msg.key.participant || msg.pushName || "")
          : jid;

        const body = extractBody(msg);
        const quoted = extractQuoted(msg);

        // Build attachments list (if media)
        const mType = mediaType(msg);
        const attachments = [];
        if (mType) {
          attachments.push({
            type: mType,
            ID: msg.key.id,
            filename: `${msg.key.id}.${mType === "photo" ? "jpg" : mType === "video" ? "mp4" : mType === "audio" ? "mp3" : "bin"}`,
            getBuffer: () => downloadMedia(msg),
          });
        }

        const event = {
          type: quoted ? "message_reply" : "message",
          senderID: jidToID(senderJID),
          threadID: jidToID(jid),
          messageID: msg.key.id,
          body,
          attachments,
          timestamp: msg.messageTimestamp || Date.now(),
          isGroup,
          participantIDs: [],
          mentions: [],
          // Extra WP fields
          _raw: msg,
          _sock: sock,
          // Reply info (FCA-compat)
          messageReply: quoted || undefined,
        };

        callback(null, event);
      }
    });

    // ── Reactions ───────────────────────────────────────────────────────────
    emitter.on("messages.update", (updates) => {
      for (const update of updates) {
        const reaction = extractReaction(update);
        if (!reaction) continue;

        const jid = normaliseJID(update.key?.remoteJid || "");
        callback(null, {
          type: "message_reaction",
          threadID: jidToID(jid),
          senderID: reaction.senderID ? jidToID(reaction.senderID) : jidToID(jid),
          messageID: reaction.messageID,
          reaction: reaction.reaction,
          userReaction: reaction.reaction,
          timestamp: Date.now(),
          _raw: update,
        });
      }
    });

    // ── Group participant changes (join / leave / add / remove) ─────────────
    emitter.on("group-participants.update", (update) => {
      const jid = normaliseJID(update.id || "");
      const action = update.action; // "add" | "remove" | "promote" | "demote"

      const typeMap = {
        add: "event",
        remove: "event",
        promote: "event",
        demote: "event",
      };

      callback(null, {
        type: typeMap[action] || "event",
        threadID: jidToID(jid),
        logMessageType: action === "add" ? "log:subscribe" : action === "remove" ? "log:unsubscribe" : `log:${action}`,
        logMessageData: {
          addedParticipants: action === "add" ? update.participants.map(jidToID) : [],
          leftParticipants: action === "remove" ? update.participants.map(jidToID) : [],
        },
        author: jidToID(normaliseJID(update.author || "")),
        participants: (update.participants || []).map((p) => jidToID(normaliseJID(p))),
        timestamp: Date.now(),
        _raw: update,
      });
    });

    // ── Typing indicators ───────────────────────────────────────────────────
    emitter.on("presence.update", ({ id, presences }) => {
      for (const [participantJid, presence] of Object.entries(presences || {})) {
        callback(null, {
          type: "typ",
          threadID: jidToID(normaliseJID(id)),
          senderID: jidToID(normaliseJID(participantJid)),
          isTyping: presence.lastKnownPresence === "composing" || presence.lastKnownPresence === "recording",
        });
      }
    });

    // Return a stopListening function (FCA compat)
    return function stopListening() {
      emitter.removeAllListeners("messages.upsert");
      emitter.removeAllListeners("messages.update");
      emitter.removeAllListeners("group-participants.update");
      emitter.removeAllListeners("presence.update");
    };
  };
