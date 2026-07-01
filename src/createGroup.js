"use strict";

const { idToJID, jidToID } = require("./utils");

/**
 * createGroup(name, [participantIDs], callback?)
 * Returns { threadID, link }
 */
module.exports = (sock) =>
  async function createGroup(name, participants = [], callback) {
    const jids = participants.map(idToJID);
    try {
      const res = await sock.groupCreate(name, jids);
      const result = {
        threadID: jidToID(res.id || ""),
        groupID: res.id,
      };
      if (typeof callback === "function") callback(null, result);
      return result;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
