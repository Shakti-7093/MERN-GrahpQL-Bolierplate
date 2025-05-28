const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// GraphQL WS Client
const { createClient } = require('graphql-ws');
const WebSocket = require('ws');

let mainWindow;
let client = null;
const activeSubscriptions = new Map();
let isConnected = false;

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Handle any unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Disable hardware acceleration to prevent graphics issues
try {
  app.disableHardwareAcceleration();
} catch (error) {
  console.warn('Could not disable hardware acceleration:', error.message);
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
        enableRemoteModule: false
      },
      // Additional window settings to prevent graphics issues
      backgroundColor: '#ffffff',
      show: false, // Don't show until ready
      frame: true,
      transparent: false
    });

    // Show window when ready to prevent white flash
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

  mainWindow.loadFile('index.html');

    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
}

    // Handle reload events
    mainWindow.webContents.on('did-start-loading', () => {
      console.log('Page reload started...');
      cleanupAndDisconnect();
    });

    // Handle force reload (Ctrl+R or Cmd+R)
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
        console.log('Force reload detected...');
        cleanupAndDisconnect();
      }
    });

    // Handle window close
    mainWindow.on('closed', () => {
      cleanupAndDisconnect();
    });
  } catch (error) {
    console.error('Error creating window:', error);
    app.quit();
  }
}

function cleanupSubscriptions() {
  console.log('Cleaning up subscriptions...');
  return new Promise((resolve) => {
    const subscriptions = Array.from(activeSubscriptions.entries());
    if (subscriptions.length === 0) {
      console.log('No active subscriptions to clean up');
      resolve();
      return;
    }

    let completed = 0;
    subscriptions.forEach(([name, subscription]) => {
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') {
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
          console.log('All subscriptions cleaned up');
          resolve();
        }
      }
    });
  });
}

async function cleanupAndDisconnect() {
  console.log('Cleaning up and disconnecting...');
  if (client) {
    try {
      // First cleanup all subscriptions
      await cleanupSubscriptions();
      
      // Then close the WebSocket connection
      if (client.terminate) {
        console.log('Terminating WebSocket connection...');
        // Set a small delay to ensure subscriptions are fully cleaned up
        await new Promise(resolve => setTimeout(resolve, 100));
        client.terminate();
        console.log('WebSocket connection terminated');
      }

      // Clear all references and update state
      client = null;
      isConnected = false;
      activeSubscriptions.clear(); // Ensure subscriptions are cleared
      
      // Update UI
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('connection-status', { 
          connected: false,
          message: 'Disconnected successfully'
        });
      }
      
      console.log('Disconnected successfully');
    } catch (error) {
      console.error('Error during cleanup and disconnect:', error);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('connection-status', { 
          connected: false,
          error: 'Error during disconnect: ' + error.message
        });
      }
    }
  }
}

// ===== WebSocket Subscriptions =====
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
    // Clean up existing client
    cleanupAndDisconnect();
  }

  client = createClient({
    url,
    webSocketImpl: WebSocket,
    lazy: false, // Changed back to false to allow immediate connection
    retryAttempts: 0, // Keep retry attempts disabled
    shouldRetry: () => false, // Keep manual retry control
    on: {
      connected: () => {
        console.log('WebSocket connected');
        isConnected = true;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('connection-status', { connected: true });
        }
        setupSubscriptions();
      },
      closed: () => {
        console.log('WebSocket closed');
        isConnected = false;
        activeSubscriptions.clear(); // Clear subscriptions on close
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('connection-status', { connected: false });
        }
      },
      error: (error) => {
        console.error('WebSocket error:', error);
        isConnected = false;
        activeSubscriptions.clear(); // Clear subscriptions on error
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('connection-status', { 
            connected: false,
            error: error.message || 'Connection error occurred'
          });
        }
      }
    }
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
          mainWindow.webContents.send('subscription-data', { name, data });
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
      }
    }
  );

    // Store the subscription
  activeSubscriptions.set(name, subscription);
    console.log(`Successfully subscribed to ${name}`);

  } catch (error) {
    console.error(`Error creating subscription for ${name}:`, error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('connection-status', {
        connected: false,
        error: `Failed to subscribe to ${name}: ${error.message}`
      });
    }
  }
};

function setupSubscriptions() {
  if (!isConnected || !client) {
    console.log('Cannot setup subscriptions: Not connected');
    return;
  }
  subscribeTo(NEW_TODO_QUERY, 'NEW_TODO');
  subscribeTo(NEW_USER_QUERY, 'NEW_USER');
}

// IPC handlers
ipcMain.on('connect-ws', (event, url) => {
  try {
    if (client) {
      console.log('Cleaning up existing connection...');
      cleanupAndDisconnect();
    }
    console.log('Creating new WebSocket connection...');
    createWebSocketClient(url);
  } catch (error) {
    console.error('Connection error:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('connection-status', {
        connected: false,
        error: error.message || 'Failed to connect'
      });
    }
  }
});

ipcMain.on('disconnect-ws', async () => {
  console.log('Disconnect requested...');
  if (client) {
    try {
      await cleanupAndDisconnect();
      // Ensure client is completely nullified
      client = null;
      isConnected = false;
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }
});

// Electron lifecycle
app.whenReady().then(() => {
  try {
  createWindow();
  } catch (error) {
    console.error('Error during app initialization:', error);
    app.quit();
  }
}).catch((error) => {
  console.error('Error in app.whenReady():', error);
  app.quit();
});

  app.on('activate', () => {
  try {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  } catch (error) {
    console.error('Error in activate event:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  try {
    cleanupAndDisconnect();
  } catch (error) {
    console.error('Error during app quit:', error);
  }
});
