import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { parse, validate, execute, getOperationAST } from "graphql";
import schema from "../graphql/schema.js";
import { cleanupClientSubscriptions } from "../AsyncIterator/pubsub.js";

const WS_PATH = "/graphql-subscriptions";

const clients = new Map();
const availableIds = new Set();
let maxClientId = 0;

// Error types
class WebSocketError extends Error {
  constructor(message, code = "WS_ERROR", details = {}) {
    super(message);
    this.name = "WebSocketError";
    this.code = code;
    this.details = details;
  }
}

class GraphQLError extends Error {
  constructor(message, code = "GRAPHQL_ERROR", details = {}) {
    super(message);
    this.name = "GraphQLError";
    this.code = code;
    this.details = details;
  }
}

function generateClientId() {
  try {
    let id;

    if (availableIds.size > 0) {
      id = Math.min(...availableIds);
      availableIds.delete(id);
    } else {
      id = ++maxClientId;
    }

    return `client_${id}`;
  } catch (error) {
    console.error("[WebSocket] Error generating client ID:", error);
    throw new WebSocketError(
      "Failed to generate client ID",
      "CLIENT_ID_ERROR",
      { error }
    );
  }
}

function removeClient(clientId) {
  try {
    if (!clientId) {
      console.warn("[WebSocket] Attempted to remove client with no ID");
      return;
    }

    const client = clients.get(clientId);
    if (client) {
      if (client.subscriptions) {
        client.subscriptions.forEach((sub) => {
          try {
            sub.unsubscribe();
          } catch (error) {
            console.error(
              `[WebSocket] Error unsubscribing client ${clientId}:`,
              error
            );
          }
        });
      }

      const numericId = parseInt(clientId.split("_")[1]);
      if (!isNaN(numericId)) {
        availableIds.add(numericId);
        console.log(`[WebSocket] ID ${numericId} added to available IDs`);
      }

      clients.delete(clientId);
      console.log(`[WebSocket] Client ${clientId} removed from tracking`);
      console.log(
        `[WebSocket] Available IDs: ${Array.from(availableIds)
          .sort((a, b) => a - b)
          .join(", ")}`
      );
    } else {
      console.warn(`[WebSocket] Client ${clientId} not found during removal`);
    }
  } catch (error) {
    console.error(`[WebSocket] Error removing client ${clientId}:`, error);
  }
}

function handleClientError(clientId, error) {
  try {
    console.error(`[WebSocket] Client ${clientId} error:`, error);
    removeClient(clientId);
  } catch (err) {
    console.error(`[WebSocket] Error handling client ${clientId} error:`, err);
  }
}

export function initializeWebSocketServer(server) {
  try {
    const wsServer = new WebSocketServer({
      server,
      path: WS_PATH,
      handleProtocols: (protocols, request) => {
        try {
          if (protocols.includes("graphql-transport-ws")) {
            return "graphql-transport-ws";
          }
          return false;
        } catch (error) {
          console.error("[WebSocket] Protocol handling error:", error);
          return false;
        }
      },
      clientTracking: true,
      perMessageDeflate: false,
    });

    wsServer.on("connection", (ws, req) => {
      let clientId;
      try {
        clientId = generateClientId();
        clients.set(clientId, {
          ws,
          address: req.socket.remoteAddress,
          connectedAt: new Date(),
          subscriptions: new Set(),
        });

        ws.clientId = clientId;

        console.log(
          `[WebSocket] New client ${clientId} connected from ${req.socket.remoteAddress}`
        );
        console.log(`[WebSocket] Total connected clients: ${clients.size}`);

        ws.on("message", (message) => {
          try {
            console.log(
              `[WebSocket] Message received from client ${clientId}:`,
              message
            );
          } catch (error) {
            handleClientError(clientId, error);
          }
        });

        ws.on("close", () => {
          try {
            console.log(`[WebSocket] Client ${clientId} disconnected`);
            cleanupClientSubscriptions(clientId);
            removeClient(clientId);
            console.log(`[WebSocket] Total connected clients: ${clients.size}`);
          } catch (error) {
            console.error(
              `[WebSocket] Error during client ${clientId} disconnect:`,
              error
            );
          }
        });

        ws.on("error", (error) => {
          handleClientError(clientId, error);
        });

        ws.isAlive = true;
        ws.on("pong", () => {
          ws.isAlive = true;
        });
      } catch (error) {
        console.error(
          "[WebSocket] Error during client connection setup:",
          error
        );
        if (clientId) {
          cleanupClientSubscriptions(clientId);
          removeClient(clientId);
        }
      }
    });

    const interval = setInterval(() => {
      wsServer.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          const clientId = ws.clientId;
          console.log(`[WebSocket] Client ${clientId} connection timeout`);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    wsServer.on("error", (error) => {
      console.error("[WebSocket] Server error:", error);
    });

    wsServer.on("close", () => {
      try {
        console.log("[WebSocket] Server closed");
        clearInterval(interval);
        clients.clear();
      } catch (error) {
        console.error("[WebSocket] Error during server close:", error);
      }
    });

    useServer(
      {
        schema,
        onConnect: (ctx) => {
          try {
            const clientId = ctx.extra.socket.clientId;
            console.log(`[GraphQL] Client ${clientId} connected`);
            return true;
          } catch (error) {
            console.error("[GraphQL] Connection error:", error);
            return false;
          }
        },
        onSubscribe: (ctx, msg) => {
          try {
            const clientId = ctx.extra.socket.clientId;
            console.log(
              `[GraphQL] Subscription payload from client ${clientId}:`,
              JSON.stringify(msg.payload, null, 2)
            );

            if (!msg.payload || !msg.payload.query) {
              throw new GraphQLError(
                "Invalid subscription payload: missing query",
                "INVALID_PAYLOAD",
                { clientId }
              );
            }

            const { query, variables } = msg.payload;

            const document = parse(query);
            console.log(
              `[GraphQL] Parsed document from client ${clientId}:`,
              JSON.stringify(document, null, 2)
            );

            const validationErrors = validate(schema, document);
            if (validationErrors.length > 0) {
              throw new GraphQLError(
                `Validation errors: ${validationErrors
                  .map((e) => e.message)
                  .join(", ")}`,
                "VALIDATION_ERROR",
                { clientId, errors: validationErrors }
              );
            }

            const operation = getOperationAST(document);
            const operationName = operation
              ? operation.name?.value
              : "anonymous";
            console.log(
              `[GraphQL] Client ${clientId} subscribed to:`,
              operationName
            );

            const client = clients.get(clientId);
            if (client) {
              client.subscriptions.add({ unsubscribe: () => {} });
            }

            return {
              schema,
              operationName,
              document,
              variableValues: variables || {},
            };
          } catch (error) {
            console.error("[GraphQL] Subscription error:", error);
            throw error;
          }
        },
        onNext: (ctx, msg, args, result) => {
          try {
            const clientId = ctx.extra.socket.clientId;
            console.log(
              `[GraphQL] Subscription data sent to client ${clientId}`
            );
          } catch (error) {
            console.error("[GraphQL] Error in onNext:", error);
          }
        },
        onError: (ctx, msg, errors) => {
          try {
            const clientId = ctx.extra.socket.clientId;
            console.error(
              `[GraphQL] Subscription error for client ${clientId}:`,
              errors
            );
          } catch (error) {
            console.error("[GraphQL] Error in onError:", error);
          }
        },
        onComplete: (ctx, msg) => {
          try {
            const clientId = ctx.extra.socket.clientId;
            console.log(
              `[GraphQL] Subscription completed for client ${clientId}`
            );

            const client = clients.get(clientId);
            if (client) {
              client.subscriptions.clear();
            }
          } catch (error) {
            console.error("[GraphQL] Error in onComplete:", error);
          }
        },
        execute: async (ctx, msg) => {
          const clientId = ctx.extra.socket.clientId;
          try {
            const { query, variables, operationName } = msg.payload;
            const document = parse(query);
            const result = await execute({
              schema,
              document,
              variableValues: variables,
              operationName,
              contextValue: ctx,
            });
            return result;
          } catch (error) {
            console.error(
              `[GraphQL] Execution error for client ${clientId}:`,
              error
            );
            throw new GraphQLError("Execution error", "EXECUTION_ERROR", {
              clientId,
              error,
            });
          }
        },
      },
      wsServer
    );

    return wsServer;
  } catch (error) {
    console.error("[WebSocket] Server initialization error:", error);
    throw new WebSocketError(
      "Failed to initialize WebSocket server",
      "INIT_ERROR",
      { error }
    );
  }
}

export function getConnectedClients() {
  try {
    return Array.from(clients.entries()).map(([id, data]) => ({
      id,
      address: data.address,
      connectedAt: data.connectedAt,
    }));
  } catch (error) {
    console.error("[WebSocket] Error getting connected clients:", error);
    return [];
  }
}

export function getClientCount() {
  try {
    return clients.size;
  } catch (error) {
    console.error("[WebSocket] Error getting client count:", error);
    return 0;
  }
}

export { WS_PATH };
