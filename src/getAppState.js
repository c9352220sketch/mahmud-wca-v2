"use strict";

/**
 * getAppState()
 * FCA returns the raw cookie jar as an array of { key, value, domain, ... }.
 * WhatsApp has no cookie-based session — this instead exposes the Baileys
 * auth credentials in the same array-of-objects shape so scripts that dump
 * "the session state" (e.g. a getfbstate-style backup command) keep working
 * without crashing, without pretending WhatsApp has FB cookies.
 */
module.exports = (sock) =>
  function getAppState() {
    const creds = sock.authState?.creds || {};
    return Object.entries(creds)
      .filter(([, value]) => typeof value !== "object" || value === null)
      .map(([key, value]) => ({ key, value: String(value), domain: "whatsapp", path: "/" }));
  };
