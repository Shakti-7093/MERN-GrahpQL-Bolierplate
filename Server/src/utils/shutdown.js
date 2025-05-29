import mongoose from "mongoose";

export async function shutdown(wsServer, httpServer, signal) {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

  try {
    if (wsServer) {
      wsServer.close(() => {
        console.log("[WebSocket] Server closed");
      });
    }

    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
      console.log("[Server] HTTP server closed");
    }

    await mongoose.connection.close();
    console.log("[MongoDB] Connection closed");

    process.exit(0);
  } catch (error) {
    console.error("[Server] Shutdown error:", error);
    process.exit(1);
  }
}

export function setupShutdownHandlers(wsServer, httpServer) {
  process.on("uncaughtException", (err) => {
    console.error("[Server] Uncaught Exception:", err);
    shutdown(wsServer, httpServer, "UNCAUGHT_EXCEPTION");
  });

  process.on("unhandledRejection", (err) => {
    console.error("[Server] Unhandled Rejection:", err);
    shutdown(wsServer, httpServer, "UNHANDLED_REJECTION");
  });

  process.on("SIGTERM", () => shutdown(wsServer, httpServer, "SIGTERM"));
  process.on("SIGINT", () => shutdown(wsServer, httpServer, "SIGINT"));
}
