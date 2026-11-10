// ScienceTube chat settings.
//
// Chat needs a realtime database, because a static host like Netlify can't
// relay messages between visitors by itself. It uses a free Firebase
// Realtime Database (no SDK, just its REST + live-stream API).
//
// To turn on real chat:
//   1. Create a free project at https://console.firebase.google.com
//   2. Build > Realtime Database > Create database.
//   3. Rules tab: paste the contents of database.rules.json and Publish.
//   4. Copy the database URL (looks like https://NAME-default-rtdb.firebaseio.com)
//      into databaseURL below, commit and deploy.
//
// While databaseURL is empty, chat runs in "demo mode": messages only reach
// other tabs in this same browser, so the page can be tried out safely.
window.SCIENCETUBE_CHAT = {
  databaseURL: "",
  rooms: [
    { id: "general", name: "General", emoji: "💬" },
    { id: "games", name: "Games", emoji: "🎮" },
    { id: "help", name: "Homework help", emoji: "📚" },
    { id: "random", name: "Random", emoji: "🎲" },
  ],
  history: 60, // messages loaded when you join a room
};
