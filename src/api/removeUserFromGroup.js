"use strict";

const { idToJID } = require("../utils");

/**
 * removeUserFromGroup(userID | [userID], groupID, callback?)
 */
module.exports = (sock) =>
  async function removeUserFromGroup(userIDs, groupID, callback) {
    const groupJID = idToJID(groupID);
    const jids = (Array.isArray(userIDs) ? userIDs : [userIDs]).map(idToJID);
    try {
      const res = await sock.groupParticipantsUpdate(groupJID, jids, "remove");
      if (typeof callback === "function") callback(null, res);
      return res;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
