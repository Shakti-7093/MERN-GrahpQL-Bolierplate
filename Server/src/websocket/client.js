import { createClient } from "graphql-ws";
import WebSocket from "ws";
import dotenv from "dotenv";
dotenv.config();

class WebSocketClient {
  constructor(
    url = `ws://localhost:${process.env.PORT}/graphql-subscriptions`
  ) {
    this.url = url;
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.subscriptions = new Map();
  }

  connect() {
    this.client = createClient({
      url: this.url,
      webSocketImpl: WebSocket,
      lazy: false,
      connectionParams: {},
      retryAttempts: this.maxReconnectAttempts,
      on: {
        connected: () => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
        },
        closed: () => {
          console.log("WebSocket closed");
          this.isConnected = false;
          this.handleReconnect();
        },
        error: (error) => {
          console.error("WebSocket error:", error);
          this.handleReconnect();
        },
      },
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  subscribe(query, variables = {}, name = "subscription") {
    if (!this.client) {
      throw new Error(
        "WebSocket client not initialized. Call connect() first."
      );
    }

    const subscription = this.client.subscribe(
      { query, variables },
      {
        next: (data) => {
          console.log(`${name} data:`, JSON.stringify(data, null, 2));
        },
        error: (error) => {
          console.error(`${name} error:`, error);
        },
        complete: () => {
          console.log(`${name} subscription complete`);
          this.subscriptions.delete(name);
        },
      }
    );

    this.subscriptions.set(name, subscription);
    return subscription;
  }

  unsubscribe(name) {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(name);
    }
  }

  disconnect() {
    if (this.client) {
      this.subscriptions.forEach((subscription, name) => {
        this.unsubscribe(name);
      });

      this.client.dispose();
      this.isConnected = false;
    }
  }
}

export default WebSocketClient;
