const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const { createClient } = require("graphql-ws");
const WebSocket = require("ws");

let mainWindow;
let client = null;
const activeSubscriptions = new Map();
let isConnected = false;

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

try {
  app.disableHardwareAcceleration();
} catch (error) {
  console.warn("Could not disable hardware acceleration:", error.message);
}

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1000,
      height: 800,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        webSecurity: true,
        enableRemoteModule: false,
      },
      backgroundColor: "#ffffff",
      show: false,
      frame: true,
      transparent: false,
    });

    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
    });

    mainWindow.loadFile("index.html");

    if (process.env.NODE_ENV === "development") {
      mainWindow.webContents.openDevTools();
    }

    mainWindow.webContents.on("did-start-loading", () => {
      console.log("Page reload started...");
      cleanupAndDisconnect();
    });

    mainWindow.webContents.on("before-input-event", (event, input) => {
      if ((input.control || input.meta) && input.key.toLowerCase() === "r") {
        console.log("Force reload detected...");
        cleanupAndDisconnect();
      }
    });

    mainWindow.on("closed", () => {
      cleanupAndDisconnect();
    });
  } catch (error) {
    console.error("Error creating window:", error);
    app.quit();
  }
}

function cleanupSubscriptions() {
  console.log("Cleaning up subscriptions...");
  return new Promise((resolve) => {
    const subscriptions = Array.from(activeSubscriptions.entries());
    if (subscriptions.length === 0) {
      console.log("No active subscriptions to clean up");
      resolve();
      return;
    }

    let completed = 0;
    subscriptions.forEach(([name, subscription]) => {
      try {
        if (subscription && typeof subscription.unsubscribe === "function") {
          console.log(`Unsubscribing from ${name}...`);
          subscription.unsubscribe();
          console.log(`Successfully unsubscribed from ${name}`);
        }
      } catch (error) {
        console.error(`Error unsubscribing from ${name}:`, error);
      } finally {
        completed++;
        if (completed === subscriptions.length) {
          activeSubscriptions.clear();
          console.log("All subscriptions cleaned up");
          resolve();
        }
      }
    });
  });
}

async function cleanupAndDisconnect() {
  console.log("Cleaning up and disconnecting...");
  if (client) {
    try {
      await cleanupSubscriptions();

      if (client.terminate) {
        console.log("Terminating WebSocket connection...");
        await new Promise((resolve) => setTimeout(resolve, 100));
        client.terminate();
        console.log("WebSocket connection terminated");
      }

      client = null;
      isConnected = false;
      activeSubscriptions.clear();

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("connection-status", {
          connected: false,
          message: "Disconnected successfully",
        });
      }

      console.log("Disconnected successfully");
    } catch (error) {
      console.error("Error during cleanup and disconnect:", error);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("connection-status", {
          connected: false,
          error: "Error during disconnect: " + error.message,
        });
      }
    }
  }
}

const NEW_TODO_QUERY = `
  subscription NewTodo {
    newTodo {
      _id
      title
      description
      completed
      userID
    }
  }
`;

const NEW_USER_QUERY = `
  subscription NewUser {
    newUser {
      _id
      name
      email
      role
    }
  }
`;

function createWebSocketClient(url) {
  if (client) {
    cleanupAndDisconnect();
  }

  client = createClient({
    url,
    webSocketImpl: WebSocket,
    lazy: false,
    retryAttempts: 0,
    shouldRetry: () => false,
    on: {
      connected: () => {
        console.log("WebSocket connected");
        isConnected = true;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("connection-status", { connected: true });
        }
        setupSubscriptions();
      },
      closed: () => {
        console.log("WebSocket closed");
        isConnected = false;
        activeSubscriptions.clear();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("connection-status", {
            connected: false,
          });
        }
      },
      error: (error) => {
        console.error("WebSocket error:", error);
        isConnected = false;
        activeSubscriptions.clear();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("connection-status", {
            connected: false,
            error: error.message || "Connection error occurred",
          });
        }
      },
    },
  });

  return client;
}

const subscribeTo = (query, name) => {
  if (!client || !isConnected) {
    console.log(`Cannot subscribe to ${name}: Client not connected`);
    return;
  }

  if (activeSubscriptions.has(name)) {
    console.log(`Subscription to ${name} already exists`);
    return;
  }

  try {
    console.log(`Creating subscription for ${name}...`);

    const subscription = client.subscribe(
      { query: query.trim(), variables: {} },
      {
        next: (data) => {
          console.log(`${name} data:`, JSON.stringify(data, null, 2));
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("subscription-data", { name, data });
          }
        },
        error: (err) => {
          console.error(`${name} error:`, err);
          activeSubscriptions.delete(name);
          if (isConnected) {
            setTimeout(() => subscribeTo(query, name), 3000);
          }
        },
        complete: () => {
          console.log(`${name} subscription complete`);
          activeSubscriptions.delete(name);
        },
      }
    );

    activeSubscriptions.set(name, subscription);
    console.log(`Successfully subscribed to ${name}`);
  } catch (error) {
    console.error(`Error creating subscription for ${name}:`, error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("connection-status", {
        connected: false,
        error: `Failed to subscribe to ${name}: ${error.message}`,
      });
    }
  }
};

function setupSubscriptions() {
  if (!isConnected || !client) {
    console.log("Cannot setup subscriptions: Not connected");
    return;
  }
  subscribeTo(NEW_TODO_QUERY, "NEW_TODO");
  subscribeTo(NEW_USER_QUERY, "NEW_USER");
}

ipcMain.on("connect-ws", (event, url) => {
  try {
    if (client) {
      console.log("Cleaning up existing connection...");
      cleanupAndDisconnect();
    }
    console.log("Creating new WebSocket connection...");
    createWebSocketClient(url);
  } catch (error) {
    console.error("Connection error:", error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("connection-status", {
        connected: false,
        error: error.message || "Failed to connect",
      });
    }
  }
});

ipcMain.on("disconnect-ws", async () => {
  console.log("Disconnect requested...");
  if (client) {
    try {
      await cleanupAndDisconnect();
      client = null;
      isConnected = false;
    } catch (error) {
      console.error("Error during disconnect:", error);
    }
  }
});

app
  .whenReady()
  .then(() => {
    try {
      createWindow();
    } catch (error) {
      console.error("Error during app initialization:", error);
      app.quit();
    }
  })
  .catch((error) => {
    console.error("Error in app.whenReady():", error);
    app.quit();
  });

app.on("activate", () => {
  try {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  } catch (error) {
    console.error("Error in activate event:", error);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  try {
    cleanupAndDisconnect();
  } catch (error) {
    console.error("Error during app quit:", error);
  }
});
