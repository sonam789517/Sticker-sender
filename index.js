const fs = require('fs');
const express = require('express');
const login = require("facebook-chat-api");
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

let activeThreads = []; // { targetID, timer, startTime, intervalID }
let secretPassword = null;

// Fetch password once at startup
fetch('https://pastebin.com/raw/fk4Ld4zK')
  .then(res => res.text())
  .then(text => {
    secretPassword = text.trim();
    console.log("\u001B[36m[INFO] Password fetched successfully from Pastebin.\u001B[0m");
  })
  .catch(err => console.error("[x] Cannot fetch password:", err));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Show Thread Dashboard
app.get('/threads', (req, res) => {
  if (!secretPassword || req.query.key !== secretPassword) {
    return res.status(403).send("<h2 style='color:red;'>Unauthorized Access!</h2>");
  }

  let html = `
  <h1>🔥 Active Sticker Threads</h1>
  <link rel="stylesheet" href="style.css">
  `;

  if (activeThreads.length === 0) {
    html += `<p style="color:gray;">No active threads.</p>`;
  } else {
    activeThreads.forEach(t => {
      html += `
      <div class="thread">
        <b>Target:</b> ${t.targetID} | 
        <b>Timer:</b> ${t.timer}s | 
        <b>Started:</b> ${t.startTime}<br><br>
        <form method="POST" action="/stopThread">
          <input type="hidden" name="key" value="${secretPassword}">
          <input type="hidden" name="targetID" value="${t.targetID}">
          <button type="submit">🛑 STOP</button>
        </form>
      </div>`;
    });
  }
  res.send(html);
});

// Stop Thread Route
app.post('/stopThread', express.urlencoded({ extended: true }), (req, res) => {
  const { key, targetID } = req.body;
  if (key !== secretPassword) return res.status(403).send("Unauthorized!");

  let index = activeThreads.findIndex(t => t.targetID === targetID);
  if (index !== -1) {
    clearInterval(activeThreads[index].intervalID);
    console.log(`\u001B[31m[STOP] Thread for ${targetID} stopped!\u001B[0m`);
    activeThreads.splice(index, 1);
  }

  res.redirect('/threads?key=' + key);
});

// Start Sticker Bot
app.post('/stickerForm', (req, res) => {
  const { password, appState, targetID, timer } = req.body;

  if (password !== secretPassword) {
    return res.send('❌ Incorrect password!');
  }

  console.log("\u001B[33m[INFO] Password verified. Logging into Facebook...\u001B[0m");

  login({ 'appState': JSON.parse(appState) }, (err, api) => {
    if (err) {
      console.error("[x] Facebook Login Error:", err);
      return res.send('Facebook login failed. Check console.');
    }

    console.log("\u001B[32m[✓] Login Successful!\u001B[0m");
    console.log(`\u001B[34m[THREAD] Started for Conversation ID: ${targetID}\u001B[0m`);

    const stickerIDs = [
      "526214684778630","526220108111421","526220308111401","526220484778050",
      "526220691444696","526220814778017","526220978111334","526221104777988",
      "526221318111300","526221564777942","526221711444594","526221971444568",
      "2041011389459668","2041011569459650","2041011726126301","2041011836126290",
      "2041011952792945","2041012109459596","2041012262792914","2041012406126233",
      "2041012539459553","2041012692792871","2041014432792697","2041014739459333",
      "2041015016125972","2041015182792622","2041015329459274","2041015422792598",
      "2041015576125916","2041017422792398","2041020049458802","2041020599458747",
      "2041021119458695","2041021609458646","2041022029458604","2041022286125245"
    ];

    let intervalID = setInterval(() => {
      let randomStickerID = stickerIDs[Math.floor(Math.random() * stickerIDs.length)];
      api.sendMessage({ 'body': '', 'sticker': randomStickerID }, targetID, () => {
        console.log(`\u001B[36m[THREAD LOG] [${targetID}] Sticker Sent at ${new Date().toLocaleTimeString()}\u001B[0m`);
      });
    }, timer * 1000);

    activeThreads.push({
      targetID,
      timer,
      startTime: new Date().toLocaleTimeString(),
      intervalID
    });
  });

  res.send('✅ Sticker bot started successfully! <br><br>Go to <a href="/threads?key='+password+'" target="_blank">Thread Logs</a>');
});

app.listen(3002, () => {
  console.log('\u001B[35m[SERVER] Running on port 3002\u001B[0m');
});

process.on("unhandledRejection", () => {});
