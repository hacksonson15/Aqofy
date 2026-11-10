// ============================================================
// APPWRITE DATABASE — alag file
// Kaam: Client + Account (Anonymous) + Databases + Realtime
// Is file me koi UI / game logic nahi hai, sirf DB helpers.
// ============================================================
(function(){
  var CFG = window.APPWRITE_CONFIG;
  if(!CFG){ console.error("APPWRITE_CONFIG missing"); return; }

  var client = new Appwrite.Client()
    .setEndpoint(CFG.endpoint)
    .setProject(CFG.projectId);

  var account = new Appwrite.Account(client);
  var databases = new Appwrite.Databases(client);
  var DB = CFG.databaseId, C = CFG.collections;

  var state = { userId:null, userName:"Player", roomId:null, roomCode:null, playerDocId:null, myColor:null, unsubscribers:[] };
  window.AppwriteDB = { client:client, account:account, databases:databases, state:state };

  function log(msg){ var el=document.getElementById("online-log"); if(el){ el.textContent=msg; } console.log("[Live]",msg); }

  // --- 1. Anonymous login (koi signup nahi chahiye) ---
  async function ensureSession(){
    if(state.userId) return state.userId;
    try{ var me = await account.get(); state.userId = me.$id; }
    catch(e){ var s = await account.createAnonymousSession(); state.userId = s.userId; }
    return state.userId;
  }

  // --- 2. ROOM: create ---
  async function createRoom(name, mode){
    await ensureSession();
    state.userName = name || "Player";
    var code = Math.random().toString(36).slice(2,8).toUpperCase();
    var room = await databases.createDocument(DB, C.rooms, Appwrite.ID.unique(), {
      code: code, hostId: state.userId, hostName: state.userName,
      mode: mode || "4 Players", status: "waiting",
      playersCount: 1, maxPlayers: (mode==="1 Vs 1"?2:mode==="2 Vs 2"?4:4)
    });
    state.roomId = room.$id; state.roomCode = code; state.myColor = "red";
    await joinPlayerDoc(room.$id, "red"); // host = red
    log("Room bana diya! Code: " + code + " — doston ko bhejo.");
    return room;
  }

  // --- 3. ROOM: join by code ---
  async function joinRoom(code, name){
    await ensureSession();
    state.userName = name || "Player";
    var res = await databases.listDocuments(DB, C.rooms, [Appwrite.Query.equal("code", code.toUpperCase()), Appwrite.Query.equal("status","waiting")]);
    if(!res.documents.length) throw new Error("Room nahi mila. Code check karo ya host se naya code lo.");
    var room = res.documents[0];
    if(room.playersCount >= room.maxPlayers) throw new Error("Room full hai.");
    state.roomId = room.$id; state.roomCode = room.code;
    // khaali color dhoondo: red > blue > orange > green
    var taken = await listPlayers(room.$id);
    var colors = ["red","blue","orange","green"];
    var free = colors.find(function(c){ return !taken.some(function(p){ return p.color===c; }); }) || "red";
    state.myColor = free;
    await joinPlayerDoc(room.$id, free);
    await databases.updateDocument(DB, C.rooms, room.$id, { playersCount: taken.length + 1 });
    log("Room join ho gaya! Tumhara color: " + free);
    return room;
  }

  // --- 4. PLAYERS collection ---
  async function joinPlayerDoc(roomId, color){
    var doc = await databases.createDocument(DB, C.players, Appwrite.ID.unique(), {
      roomId: roomId, userId: state.userId, name: state.userName,
      color: color, isOnline: true, joinedAt: new Date().toISOString()
    });
    state.playerDocId = doc.$id;
    return doc;
  }
  async function listPlayers(roomId){
    var r = await databases.listDocuments(DB, C.players, [Appwrite.Query.equal("roomId", roomId), Appwrite.Query.limit(20)]);
    return r.documents;
  }

  // --- 5. START GAME: host sab ka game ek saath start karega ---
  async function startGame(){
    if(!state.roomId) throw new Error("Pehle room banao / join karo.");
    await databases.updateDocument(DB, C.rooms, state.roomId, { status: "playing" });
  }

  // --- 6. MESSAGES: chat + emoji (ek hi collection) ---
  async function sendMessage(type, text, emoji){
    if(!state.roomId) return;
    await databases.createDocument(DB, C.messages, Appwrite.ID.unique(), {
      roomId: state.roomId, senderId: state.userId, senderName: state.userName,
      color: state.myColor || "red", type: type, text: text || "", emoji: emoji || "",
      createdAt: new Date().toISOString()
    });
  }

  // --- 7. REALTIME: rooms + players + messages subscribe ---
  function subscribeAll(onRoom, onPlayers, onMessage){
    unsubscribeAll();
    // Room status change (waiting -> playing)
    state.unsubscribers.push(client.subscribe("databases."+DB+".collections."+C.rooms+".documents", function(res){
      if(res.payload && res.payload.$id === state.roomId) onRoom && onRoom(res.payload);
    }));
    // Players list change
    state.unsubscribers.push(client.subscribe("databases."+DB+".collections."+C.players+".documents", function(res){
      if(res.payload && res.payload.roomId === state.roomId) onPlayers && onPlayers();
    }));
    // Naye messages (chat / emoji)
    state.unsubscribers.push(client.subscribe("databases."+DB+".collections."+C.messages+".documents", function(res){
      if(res.events && res.events.includes("databases.*.collections.*.documents.*.create")
        && res.payload && res.payload.roomId === state.roomId) onMessage && onMessage(res.payload);
    }));
  }
  function unsubscribeAll(){ state.unsubscribers.forEach(function(u){ try{ u(); }catch(e){} }); state.unsubscribers=[]; }

  async function leaveRoom(){
    try{ if(state.playerDocId) await databases.deleteDocument(DB, C.players, state.playerDocId); }catch(e){}
    unsubscribeAll(); state.roomId=null; state.roomCode=null; state.playerDocId=null;
  }

  window.AppwriteDB.api = { ensureSession:ensureSession, createRoom:createRoom, joinRoom:joinRoom, listPlayers:listPlayers, startGame:startGame, sendMessage:sendMessage, subscribeAll:subscribeAll, leaveRoom:leaveRoom, log:log };
})();
