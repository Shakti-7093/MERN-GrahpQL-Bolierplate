import WebSocketClient from './client.js';

// Create a new WebSocket client instance
const wsClient = new WebSocketClient();

// Connect to the WebSocket server
wsClient.connect();

// Example subscription queries
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

// Subscribe to new todos
wsClient.subscribe(NEW_TODO_SUBSCRIPTION, {}, 'NEW_TODO');

// Subscribe to new users
wsClient.subscribe(NEW_USER_SUBSCRIPTION, {}, 'NEW_USER');

// Example of how to unsubscribe
setTimeout(() => {
  wsClient.unsubscribe('NEW_TODO');
}, 60000); // Unsubscribe after 1 minute

// Example of how to disconnect
process.on('SIGINT', () => {
  wsClient.disconnect();
  process.exit(0);
}); 