# mahmud-wca v2

**WhatsApp Client API** — FCA-compatible WhatsApp wrapper built on [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys).

Designed to be a drop-in WhatsApp equivalent of [mahmud-fca](https://github.com/mahmudx7/mahmud-fca).

---

## Install

```bash
npm install
# or
npm install @whiskeysockets/baileys pino qrcode-terminal axios mime-types
```

---

## Usage

```js
const { login } = require("mahmud-wca");

const api = await login({
  authFolder: "./auth_info",   // session folder
  printQR: true,               // show QR in terminal
});

api.on("connection.open", () => {
  console.log("✅ Connected!");
});

// Listen for messages (FCA-compatible callback)
api.listenMqtt((err, event) => {
  if (err) return console.error(err);
  console.log(event.type, event.body);
});

// Send a message
await api.sendMessage("1234567890", "Hello WhatsApp!");

// Send a file
await api.sendFile("1234567890", "./image.png", "Caption here");

// React to a message
await api.react("1234567890", messageID, "🔥");

// Delete a message
await api.deleteMessage("1234567890", messageID);

// Get group info
const info = await api.getThreadInfo("120363000000000000");

// Add user to group
await api.addUserToGroup("1234567890", "120363000000000000");

// Remove user from group
await api.removeUserFromGroup("1234567890", "120363000000000000");
```

---

## Event Types (FCA-compatible)

| `event.type`        | When                                  |
|---------------------|---------------------------------------|
| `message`           | Normal text/media message             |
| `message_reply`     | Reply to a previous message           |
| `message_reaction`  | Emoji reaction on a message           |
| `event`             | Group join/leave/promote/demote       |
| `typ`               | Typing indicator                      |

---

## API Reference

| Method | Description |
|--------|-------------|
| `sendMessage(threadID, msg, cb?)` | Send text or rich message |
| `sendFile(threadID, filePath, caption?, cb?)` | Send image/video/audio/doc |
| `react(threadID, messageID, emoji, cb?)` | Send emoji reaction |
| `deleteMessage(threadID, messageID, cb?)` | Delete message for everyone |
| `getUserInfo(userID\|[userID], cb?)` | Get user profile info |
| `getThreadInfo(threadID, cb?)` | Get group/chat metadata |
| `getThreadList(count, cb?)` | List recent chats |
| `addUserToGroup(userID\|[userID], groupID, cb?)` | Add member(s) to group |
| `removeUserFromGroup(userID\|[userID], groupID, cb?)` | Remove member(s) |
| `changeGroupName(groupID, name, cb?)` | Rename a group |
| `createGroup(name, [participants], cb?)` | Create a new group |
| `listenMqtt(callback)` | Start event listener |
| `getCurrentUserID()` | Get bot's WhatsApp ID |
| `markAsRead(threadID)` | Mark chat as read |
| `setPresence(threadID, type)` | Set typing/available status |

---

## Author

**mahmudx7** — [GitHub](https://github.com/mahmudx7)
