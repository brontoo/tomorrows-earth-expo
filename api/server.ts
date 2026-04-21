import "dotenv/config";
import express from "express";
import { registerOAuthRoutes } from "../server/_core/oauth.js";


const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerOAuthRoutes(app);

app.use((_, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;