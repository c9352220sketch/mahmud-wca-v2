"use strict";

const { idToJID } = require("./utils");

/**
 * changeGroupName(groupID, newName, callback?)
 */
module.exports = (sock) =>
  async function changeGroupName(groupID, newName, callback) {
    const jid = idToJID(groupID);
    try {
      await sock.groupUpdateSubject(jid, newName);
      if (typeof callback === "function") callback(null);
    } catch (err) {
      if (typeof callback === "function") callback(err);
      throw err;
    }
  };
