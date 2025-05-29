import { createClient } from "graphql-ws";
import WebSocket from "ws";

const activeSubscriptions = new Map();
let isConnected = false;

const client = createClient({
  url: "ws://localhost:4000/graphql-subscriptions",
  webSocketImpl: WebSocket,
  lazy: false,
  retryAttempts: 5,
  connectionParams: {},
  on: {
    connected: () => {
      console.log("WebSocket connected");
      isConnected = true;
      setupSubscriptions();
    },
    closed: () => {
      console.log("WebSocket closed");
      isConnected = false;
      activeSubscriptions.clear();
    },
  },
});

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

const subscribeTo = (query, name) => {
  if (activeSubscriptions.has(name)) {
    console.log(`Subscription to ${name} already exists`);
    return activeSubscriptions.get(name);
  }

  console.log(`Subscribing to ${name} with query:`, query);

  const subscription = client.subscribe(
    {
      query: query.trim(),
      variables: {},
    },
    {
      next: (data) => {
        console.log(`${name} data:`, JSON.stringify(data, null, 2));
      },
      error: (err) => {
        console.error(`${name} error:`, err);
        activeSubscriptions.delete(name);
        if (isConnected) {
          setTimeout(() => {
            console.log(`Reconnecting ${name} subscription...`);
            subscribeTo(query, name);
          }, 3000);
        }
      },
      complete: () => {
        console.log(`${name} subscription complete`);
        activeSubscriptions.delete(name);
      },
    }
  );

  activeSubscriptions.set(name, subscription);
  return subscription;
};

function setupSubscriptions() {
  if (!isConnected) {
    console.log("Not connected, skipping subscription setup");
    return;
  }

  console.log("Setting up subscriptions...");
  subscribeTo(NEW_TODO_QUERY, "NEW_TODO");
  subscribeTo(NEW_USER_QUERY, "NEW_USER");
}

process.on("SIGINT", () => {
  console.log("Cleaning up subscriptions...");
  activeSubscriptions.forEach((subscription, name) => {
    console.log(`Unsubscribing from ${name}`);
    subscription.unsubscribe();
  });
  process.exit(0);
});
