// ============================================================
// APPWRITE CONFIG — sirf yahi file edit karni hai
// Project ID / Endpoint / Database ID aapne diye hain.
// Collection IDs neeche wale Appwrite me banane ke baad
// yahan same likhne hain (default: rooms / players / messages)
// ============================================================
window.APPWRITE_CONFIG = {
  endpoint: "https://sgp.cloud.appwrite.io/v1",
  projectId: "6ad38c490014fcb0e330",
  databaseId: "6ad38cf8003244bddb7f",
  collections: {
    rooms: "rooms",       // Collection ID: rooms
    players: "players",   // Collection ID: players
    messages: "messages"  // Collection ID: messages (chat + emoji)
  }
};
