import { createServer } from "http";
import express from "express";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { ShmupRoom } from "./rooms/ShmupRoom";

const PORT = Number(process.env.PORT) || 2567;

const app = express();
app.use(express.json());

const httpServer = createServer(app);

const gameServer = new Server({ server: httpServer });
gameServer.define("shmup_room", ShmupRoom);

// Colyseus dashboard — only enabled in development
// In production set NODE_ENV=production to disable it
if (process.env.NODE_ENV !== "production") {
    app.use("/colyseus", monitor());
    console.log(`Colyseus monitor → http://localhost:${PORT}/colyseus`);
}

httpServer.listen(PORT, () => {
    console.log(`Shmup server listening on port ${PORT}`);
});
