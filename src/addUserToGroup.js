"use strict";

const { idToJID } = require("./utils");

/**
 * addUserToGroup(userID | [userID], groupID, callback?)
 */
module.exports = (sock) =>
  async function addUserToGroup(userIDs, groupID, callback) {
    const groupJID = idToJID(groupID);
    const jids = (Array.isArray(userIDs) ? userIDs : [userIDs]).map(idToJID);
    try {
      const res = await sock.groupParticipantsUpdate(groupJID, jids, "add");
      if (typeof callback === "function") callback(null, res);
      return res;
    } catch (err) {
      if (typeof callback === "function") callback(err, null);
      throw err;
    }
  };
