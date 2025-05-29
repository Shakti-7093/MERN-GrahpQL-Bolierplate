let socket;

function connect() {
  const url = document.getElementById("wsUrl").value;
  socket = new WebSocket(url);

  socket.onopen = () => log("✅ Connected");
  socket.onmessage = (event) => log("📩 " + event.data);
  socket.onerror = (err) => log("❌ Error: " + err.message);
  socket.onclose = () => log("🔌 Disconnected");
}

function disconnect() {
  if (socket) {
    socket.close();
  }
}

function sendMessage() {
  const msg = document.getElementById("message").value;
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(msg);
    log("📤 " + msg);
  }
}

function log(message) {
  const logArea = document.getElementById("log");
  logArea.value += message + "\n";
  logArea.scrollTop = logArea.scrollHeight;
}
