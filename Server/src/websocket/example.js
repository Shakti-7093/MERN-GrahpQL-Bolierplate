import WebSocketClient from "./client.js";

const wsClient = new WebSocketClient();

wsClient.connect();

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

wsClient.subscribe(NEW_TODO_SUBSCRIPTION, {}, "NEW_TODO");

wsClient.subscribe(NEW_USER_SUBSCRIPTION, {}, "NEW_USER");

setTimeout(() => {
  wsClient.unsubscribe("NEW_TODO");
}, 60000);

process.on("SIGINT", () => {
  wsClient.disconnect();
  process.exit(0);
});
