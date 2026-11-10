// ============================================================
// LIVE UI — Online panel ka button / room / realtime logic
// Game ka board wahi purana script.js chalata hai.
// Host ke Start dabate hi sab ke browser me game ek saath khulta hai.
// ============================================================
(function(){
  document.addEventListener("DOMContentLoaded", function(){
    var DB = window.AppwriteDB; if(!DB){ return; }
    var $ = function(id){ return document.getElementById(id); };
    var nameEl=$("online-name"), modeEl=$("online-mode"), codeEl=$("online-code");
    var createBtn=$("online-create"), joinBtn=$("online-join"), startBtn=$("online-start"),
        copyBtn=$("online-copy"), leaveBtn=$("online-leave");
    if(!createBtn) return;

    function showPlayers(){
      DB.api.listPlayers(DB.state.roomId).then(function(list){
        var ul=$("online-players"); if(!ul) return;
        ul.innerHTML = list.map(function(p){
          return "<li><span class='dot' style='background:"+({red:"#ED1C24",blue:"#2196F3",green:"#4CAF50",orange:"#FF9800"}[p.color]||"#111")+"'></span>"+p.name+" — "+p.color+(p.userId===DB.state.userId?" (Tum)":"")+"</li>";
        }).join("") || "<li>Koi player nahi</li>";
      }).catch(function(){});
    }
    function onRoom(room){
      DB.api.log("Room status: " + room.status);
      if(room.status==="playing"){
        // Sab ka game ek saath start — mode ke hisaab se
        var label = "Online — Room " + room.code;
        var active = ["red","blue","orange","green"];
        if(room.mode==="1 Vs 1") active = ["red","blue"];
        if(window.__launchLudo) window.__launchLudo(active, label);
        $("online-panel").style.display="none";
      }
    }
    function onMessage(m){
      // Dusre player ka emoji / chat — apne purane local functions jaisa dikhao
      if(m.senderId === DB.state.userId) return; // apna message dobara mat dikhao
      if(m.type==="emoji"){
        var house = document.querySelector('.emoji-house[data-house="'+m.color+'"]');
        if(house){ var b=document.createElement("div"); b.className="emoji-fly"; b.textContent=m.emoji||"😊";
          var r=house.getBoundingClientRect(); b.style.left=(r.left+r.width/2)+"px"; b.style.top=(r.top+r.height/2)+"px";
          document.body.appendChild(b); setTimeout(function(){ b.style.transform="translate(0,120px) scale(2)"; b.style.opacity="0"; },30);
          setTimeout(function(){ b.remove(); },3000); }
      } else if(m.type==="chat"){
        var bubble=document.createElement("div"); bubble.className="chat-bubble"; bubble.textContent=m.senderName+": "+m.text;
        bubble.style.left="12px"; bubble.style.top="70px"; document.body.appendChild(bubble);
        setTimeout(function(){ bubble.remove(); },7000);
      }
    }
    function afterRoom(){
      $("online-room-info").style.display="block";
      $("online-room-code").textContent = DB.state.roomCode;
      $("online-my-color").textContent = DB.state.myColor || "-";
      $("online-copy").style.display="inline-block";
      $("online-start").style.display="inline-block";
      $("online-leave").style.display="inline-block";
      DB.api.subscribeAll(onRoom, showPlayers, onMessage);
      showPlayers();
    }

    createBtn.addEventListener("click", async function(){
      try{ DB.api.log("Room ban raha hai..."); await DB.api.createRoom(nameEl.value.trim()||"Player", modeEl.value); afterRoom(); }
      catch(e){ DB.api.log("Error: "+e.message); alert(e.message); }
    });
    joinBtn.addEventListener("click", async function(){
      try{ if(!codeEl.value.trim()){ alert("Room code likho"); return; } DB.api.log("Join ho raha hai...");
        await DB.api.joinRoom(codeEl.value.trim(), nameEl.value.trim()||"Player"); afterRoom(); }
      catch(e){ DB.api.log("Error: "+e.message); alert(e.message); }
    });
    startBtn.addEventListener("click", async function(){
      try{ await DB.api.startGame(); }catch(e){ alert(e.message); }
    });
    copyBtn.addEventListener("click", function(){
      var txt="Mera Ludo Room Code: "+DB.state.roomCode+" — game kholo aur Join me ye code daalo!";
      if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ DB.api.log("Code copy ho gaya!"); });
      else { prompt("Code copy karo:", txt); }
    });
    leaveBtn.addEventListener("click", async function(){ await DB.api.leaveRoom(); location.reload(); });

    // Local emoji/chat ko bhi Live bhejo (jab room me ho)
    document.addEventListener("click", function(e){
      var btn=e.target.closest("button[data-emoji]"); if(!btn||!DB.state.roomId) return;
      var house=btn.closest(".emoji-house"); if(!house) return;
      DB.api.sendMessage("emoji","",btn.dataset.emoji).catch(function(){});
    });
    var chatSend=$("chat-send");
    if(chatSend) chatSend.addEventListener("click", function(){
      var inp=$("chat-input"); if(!inp||!DB.state.roomId||!inp.value.trim()) return;
      DB.api.sendMessage("chat", inp.value.trim(), "").catch(function(){});
    });
  });
})();
