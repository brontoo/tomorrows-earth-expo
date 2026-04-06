import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const expressApp = express();

expressApp.use(express.json({ limit: "50mb" }));
expressApp.use(
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default function handler(req: express.Request, res: express.Response) {
  return expressApp(req, res);
}