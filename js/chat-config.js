// ScienceTube chat settings.
//
// On Netlify, chat works out of the box: messages go through the site's own
// function (netlify/functions/chat.mjs) and are kept in Netlify Blobs.
//
// Optional: to use a Firebase Realtime Database instead (instant delivery
// rather than a check every few seconds, and works on any static host):
//   1. Create a free project at https://console.firebase.google.com
//   2. Build > Realtime Database > Create database.
//   3. Rules tab: paste the contents of database.rules.json and Publish.
//   4. Copy the database URL (looks like https://NAME-default-rtdb.firebaseio.com)
//      into databaseURL below, commit and deploy.
//
// If neither is available (for example a plain static server), chat runs in
// "demo mode": messages only reach other tabs in this same browser.
window.SCIENCETUBE_CHAT = {
  databaseURL: "",
  // Room ids must match ROOMS in netlify/functions/chat.mjs and database.rules.json.
  rooms: [
    { id: "general", name: "General", emoji: "💬" },
    { id: "games", name: "Games", emoji: "🎮" },
    { id: "help", name: "Homework help", emoji: "📚" },
    { id: "random", name: "Random", emoji: "🎲" },
  ],
  history: 60, // messages loaded when you join a room
};
