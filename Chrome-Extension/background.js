
const WS_URL = 'ws://localhost:4000/graphql-subscriptions';

const NEW_TODO_SUBSCRIPTION = `
  subscription {
    newTodo {
      _id
      title
      description
      completed
      userID
    }
  }
`;

const NEW_USER_SUBSCRIPTION = `
  subscription {
    newUser {
      _id
      name
      email
      role
    }
  }
`;

let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000;
let isConnecting = false;
let isConnected = false;
let activeSubscriptions = new Set();

function connectWebSocket() {
  if (isConnecting) {
    console.log('Connection attempt already in progress');
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  isConnecting = true;
  ws = new WebSocket(WS_URL, ['graphql-transport-ws']);

  ws.onopen = () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
    isConnecting = false;
    isConnected = true;
    
    chrome.storage.local.set({ connectionStatus: 'connected' });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'connection_init',
        payload: {}
      }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);
      
      if (data.type === 'connection_ack') {
        console.log('Connection acknowledged by server');
        if (ws.readyState === WebSocket.OPEN) {
          setupSubscriptions();
        }
      } else if (data.type === 'next') {
        if (data.id === '1') {
          console.log('New Todo:', data.payload.data.newTodo);
          chrome.storage.local.set({ 
            lastTodo: { ...data.payload.data.newTodo, lastUpdate: new Date().toISOString() }
          });
        } else if (data.id === '2') {
          console.log('New User:', data.payload.data.newUser);
          chrome.storage.local.set({ 
            lastUser: { ...data.payload.data.newUser, lastUpdate: new Date().toISOString() }
          });
        }
      } else if (data.type === 'error') {
        console.error('GraphQL error:', data.payload);
        chrome.storage.local.set({ lastError: data.payload });
      } else if (data.type === 'complete') {
        console.log('Subscription completed:', data.id);
        activeSubscriptions.delete(data.id);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      chrome.storage.local.set({ lastError: error.message });
    }
  };

  ws.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
    isConnecting = false;
    isConnected = false;
    activeSubscriptions.clear();
    chrome.storage.local.set({ connectionStatus: 'disconnected' });
    handleReconnect();
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    isConnecting = false;
    isConnected = false;
    chrome.storage.local.set({ 
      connectionStatus: 'error',
      lastError: error.message || 'WebSocket error occurred'
    });
  };
}

function setupSubscriptions() {
  if (!isConnected || ws.readyState !== WebSocket.OPEN) {
    console.log('Not connected, skipping subscription setup');
    return;
  }

  if (!activeSubscriptions.has('1')) {
    ws.send(JSON.stringify({
      id: '1',
      type: 'subscribe',
      payload: {
        query: NEW_TODO_SUBSCRIPTION
      }
    }));
    activeSubscriptions.add('1');
  }

  if (!activeSubscriptions.has('2')) {
    ws.send(JSON.stringify({
      id: '2',
      type: 'subscribe',
      payload: {
        query: NEW_USER_SUBSCRIPTION
      }
    }));
    activeSubscriptions.add('2');
  }
}

function handleReconnect() {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
    chrome.storage.local.set({ 
      connectionStatus: 'reconnecting',
      reconnectAttempt: reconnectAttempts
    });
    setTimeout(connectWebSocket, reconnectInterval);
  } else {
    console.error('Max reconnection attempts reached');
    chrome.storage.local.set({ 
      connectionStatus: 'failed',
      lastError: 'Max reconnection attempts reached'
    });
  }
}

connectWebSocket();

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    connectionStatus: 'connecting',
    lastTodo: null,
    lastUser: null,
    lastError: null
  });
  connectWebSocket();
});

chrome.runtime.onSuspend.addListener(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(1000, 'Extension unloading');
  }
}); 