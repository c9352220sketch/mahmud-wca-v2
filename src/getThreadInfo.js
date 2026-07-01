"use strict";

const { idToJID, jidToID, normaliseJID } = require("./utils");

/**
 * getThreadInfo(threadID, callback?)
 * Returns thread/group metadata similar to FCA format.
 */
module.exports = (sock) =>
  async function getThreadInfo(threadID, callback) {
    const jid = idToJID(threadID);

    try {
      const isGroup = jid.endsWith("@g.us");
      let info = {};

      if (isGroup) {
        const meta = await sock.groupMetadata(jid);
        info = {
          threadID: jidToID(jid),
          name: meta.subject || "",
          isGroup: true,
          userInfo: meta.participants.map((p) => ({
            userID: jidToID(normaliseJID(p.id)),
            isAdmin: p.admin === "admin" || p.admin === "superadmin",
            isSuperAdmin: p.admin === "superadmin",
          })),
          adminIDs: meta.participants
            .filter((p) => p.admin)
            .map((p) => ({ id: jidToID(normaliseJID(p.id)) })),
          approvalMode: false,
          description: meta.desc || "",
          participantCount: meta.participants.length,
          imageSrc: null,
        };
        try { info.imageSrc = await sock.profilePictureUrl(jid, "image"); } catch (_) {}
      } else {
        const uid = jidToID(jid);
        info = {
          threadID: uid,
          name: uid,
          isGroup: false,
          userInfo: [{ userID: uid, isAdmin: false }],
          adminIDs: [],
          approvalMode: false,
          description: "",
          participantCount: 1,
          imageSrc: null,
        };
        try { info.imageSrc = await sock.profilePictureUrl(jid, "image"); } catch (_) {}
      }

      if (typeof callback === "function") callback(null, info);
      return info;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
