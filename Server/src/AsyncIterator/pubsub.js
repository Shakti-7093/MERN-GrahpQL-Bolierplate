import { EventEmitter } from "events";

const pubsub = new EventEmitter();
const activeSubscriptions = new Map();
const processedEvents = new Set();

function createAsyncIterator(eventName) {
  const pullQueue = [];
  const pushQueue = [];
  const subscriptionId = `${eventName}_${Date.now()}_${Math.random()}`;

  // Check if this subscription already exists
  if (activeSubscriptions.has(subscriptionId)) {
    console.log(`[PubSub] Subscription ${subscriptionId} already exists, cleaning up old one`);
    const oldSub = activeSubscriptions.get(subscriptionId);
    pubsub.off(eventName, oldSub.listener);
    activeSubscriptions.delete(subscriptionId);
  }

  const listener = (data) => {
    // Create a unique event ID
    const eventId = `${eventName}_${JSON.stringify(data)}`;
    
    // Check if we've already processed this event
    if (processedEvents.has(eventId)) {
      console.log(`[PubSub] Skipping duplicate event ${eventId}`);
      return;
    }
    
    console.log(`[PubSub] Event '${eventName}' received for subscription ${subscriptionId}:`, data);
    
    // Mark this event as processed
    processedEvents.add(eventId);
    
    // Clean up old events (keep only last 100)
    if (processedEvents.size > 100) {
      const oldestEvent = Array.from(processedEvents)[0];
      processedEvents.delete(oldestEvent);
    }

    if (pullQueue.length !== 0) {
      const resolve = pullQueue.shift();
      resolve({ value: data, done: false });
    } else {
      pushQueue.push(data);
    }
  };

  console.log(`[PubSub] Adding listener for event: ${eventName} with subscription ID: ${subscriptionId}`);
  pubsub.on(eventName, listener);
  activeSubscriptions.set(subscriptionId, { eventName, listener });

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
      console.log(`[PubSub] Cleaning up subscription ${subscriptionId}`);
      pubsub.off(eventName, listener);
      activeSubscriptions.delete(subscriptionId);
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(error) {
      console.error(`[PubSub] Error in subscription ${subscriptionId}:`, error);
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
  console.log(`[PubSub] Publishing event '${eventName}' to ${activeCount} active subscriptions`);
  if (activeCount > 0) {
    pubsub.emit(eventName, data);
  } else {
    console.log(`[PubSub] No active subscriptions for event '${eventName}', skipping publish`);
  }
}

function getActiveSubscriptionCount(eventName) {
  return Array.from(activeSubscriptions.values()).filter(sub => sub.eventName === eventName).length;
}

function cleanupAllSubscriptions() {
  console.log('[PubSub] Cleaning up all subscriptions');
  activeSubscriptions.forEach((sub, id) => {
    console.log(`[PubSub] Cleaning up subscription ${id}`);
    pubsub.off(sub.eventName, sub.listener);
  });
  activeSubscriptions.clear();
  processedEvents.clear();
}

export { pubsub, createAsyncIterator, publish, getActiveSubscriptionCount, cleanupAllSubscriptions };
