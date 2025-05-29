import { EventEmitter } from "events";

const pubsub = new EventEmitter();
const activeSubscriptions = new Map();
const clientProcessedEvents = new Map();

function createAsyncIterator(eventName, clientId) {
  const pullQueue = [];
  const pushQueue = [];
  const subscriptionId = `${eventName}_${clientId}_${Date.now()}_${Math.random()}`;

  if (!clientProcessedEvents.has(clientId)) {
    clientProcessedEvents.set(clientId, new Set());
  }

  if (activeSubscriptions.has(subscriptionId)) {
    console.log(
      `[PubSub] Subscription ${subscriptionId} already exists for client ${clientId}, cleaning up old one`
    );
    const oldSub = activeSubscriptions.get(subscriptionId);
    pubsub.off(eventName, oldSub.listener);
    activeSubscriptions.delete(subscriptionId);
  }

  const listener = (data) => {
    const eventId = `${eventName}_${JSON.stringify(data)}`;
    const clientProcessed = clientProcessedEvents.get(clientId);

    if (clientProcessed.has(eventId)) {
      console.log(
        `[PubSub] Client ${clientId} already processed event ${eventId}`
      );
      return;
    }

    console.log(
      `[PubSub] Event '${eventName}' received for client ${clientId} subscription ${subscriptionId}:`,
      data
    );

    clientProcessed.add(eventId);

    if (clientProcessed.size > 100) {
      const oldestEvent = Array.from(clientProcessed)[0];
      clientProcessed.delete(oldestEvent);
    }

    if (pullQueue.length !== 0) {
      const resolve = pullQueue.shift();
      resolve({ value: data, done: false });
    } else {
      pushQueue.push(data);
    }
  };

  console.log(
    `[PubSub] Adding listener for event: ${eventName} with subscription ID: ${subscriptionId} for client ${clientId}`
  );
  pubsub.on(eventName, listener);
  activeSubscriptions.set(subscriptionId, { eventName, listener, clientId });

  return {
    next() {
      return new Promise((resolve) => {
        if (pushQueue.length !== 0) {
          return resolve({ value: pushQueue.shift(), done: false });
        }
        pullQueue.push(resolve);
      });
    },
    return() {
      console.log(
        `[PubSub] Cleaning up subscription ${subscriptionId} for client ${clientId}`
      );
      pubsub.off(eventName, listener);
      activeSubscriptions.delete(subscriptionId);
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(error) {
      console.error(
        `[PubSub] Error in subscription ${subscriptionId} for client ${clientId}:`,
        error
      );
      pubsub.off(eventName, listener);
      activeSubscriptions.delete(subscriptionId);
      return Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

function publish(eventName, data) {
  const activeCount = getActiveSubscriptionCount(eventName);
  console.log(
    `[PubSub] Publishing event '${eventName}' to ${activeCount} active subscriptions`
  );
  if (activeCount > 0) {
    pubsub.emit(eventName, data);
  } else {
    console.log(
      `[PubSub] No active subscriptions for event '${eventName}', skipping publish`
    );
  }
}

function getActiveSubscriptionCount(eventName) {
  return Array.from(activeSubscriptions.values()).filter(
    (sub) => sub.eventName === eventName
  ).length;
}

function cleanupClientSubscriptions(clientId) {
  console.log(`[PubSub] Cleaning up all subscriptions for client ${clientId}`);
  activeSubscriptions.forEach((sub, id) => {
    if (sub.clientId === clientId) {
      console.log(
        `[PubSub] Cleaning up subscription ${id} for client ${clientId}`
      );
      pubsub.off(sub.eventName, sub.listener);
      activeSubscriptions.delete(id);
    }
  });
  clientProcessedEvents.delete(clientId);
}

function cleanupAllSubscriptions() {
  console.log("[PubSub] Cleaning up all subscriptions");
  activeSubscriptions.forEach((sub, id) => {
    console.log(`[PubSub] Cleaning up subscription ${id}`);
    pubsub.off(sub.eventName, sub.listener);
  });
  activeSubscriptions.clear();
  clientProcessedEvents.clear();
}

export {
  pubsub,
  createAsyncIterator,
  publish,
  getActiveSubscriptionCount,
  cleanupClientSubscriptions,
  cleanupAllSubscriptions,
};
