import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { graphqlHTTP } from "express-graphql";
import schema from "./graphql/schema.js";
import globalErrorHandler from "./controllers/errorController.js";
import AppError from "./utils/appError.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
  });
});

app.use(
  "/graphql",
  graphqlHTTP((req, res) => ({
    schema: schema,
    graphiql:
      process.env.NODE_ENV === "development"
        ? {
            subscriptionEndpoint: `${process.env.WEBSOCKETSERVER_URL}:${process.env.WEBSOCKETSERVER_PORT}${process.env.WEBSOCKETSERVER_PATH}`,
          }
        : false,
    context: { req, res },
  }))
);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
