import mongoose from "mongoose";
import { createServer } from "http";
import app from "./src/index.js";
import { initializeWebSocketServer, WS_PATH } from "./src/websocket/config.js";
import { PORT, DB } from "./src/config/server.js";
import { setupShutdownHandlers } from "./src/utils/shutdown.js";
import { cleanupAllSubscriptions } from "./src/AsyncIterator/pubsub.js";

let wsServer = null;
let httpServer = null;

async function startServer() {
  try {
    await mongoose.connect(DB);
    console.log("[MongoDB] Connection successful!");

    httpServer = createServer(app);

    wsServer = initializeWebSocketServer(httpServer);

    setupShutdownHandlers(wsServer, httpServer);

    wsServer.on("connection", (ws, req) => {
      console.log(
        `[WebSocket] New client connected from ${req.socket.remoteAddress}`
      );

      ws.on("close", (code, reason) => {
        console.log(
          `[WebSocket] Client from ${req.socket.remoteAddress} disconnected. Code: ${code}, Reason: ${reason}`
        );
        cleanupAllSubscriptions();
      });

      ws.on("error", (error) => {
        console.error(
          `[WebSocket] Error for client ${req.socket.remoteAddress}:`,
          error
        );
        cleanupAllSubscriptions();
      });
    });

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] Running on port ${PORT}`);
      console.log(
        `[WebSocket] Server available at ws://0.0.0.0:${PORT}${WS_PATH}`
      );
      console.log(`[WebSocket] Local access: ws://localhost:${PORT}${WS_PATH}`);
      console.log(
        `[WebSocket] Network access: ws://<your-ip>:${PORT}${WS_PATH}`
      );
    });
  } catch (error) {
    console.error("[Server] Startup error:", error);
    process.exit(1);
  }
}

startServer();
