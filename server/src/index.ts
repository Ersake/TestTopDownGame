import { createServer } from "http";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { ShmupRoom } from "./rooms/ShmupRoom";
import { isProductionEnv } from "./env";
import { CharacterStorage, toCharacterSummary } from "./characters/CharacterStorage";

const PORT = Number(process.env.PORT) || 2567;

const app = express();
app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    next();
});
app.options("*", (_req, res) => res.sendStatus(204));
app.use(express.json());

const characterStorage = new CharacterStorage();

app.post("/characters/list", async (req, res) => {
    try {
        const characters = await characterStorage.listForOwner(req.body?.playerKey);
        res.json({ characters: characters.map(toCharacterSummary) });
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Unable to list characters." });
    }
});

app.post("/characters/create", async (req, res) => {
    try {
        const character = await characterStorage.create(req.body?.playerKey, req.body?.displayName);
        res.json({ character: toCharacterSummary(character) });
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Unable to create character." });
    }
});

app.post("/characters/delete", async (req, res) => {
    try {
        const deleted = await characterStorage.deleteOwned(req.body?.playerKey, req.body?.characterId);
        if (!deleted) {
            res.status(404).json({ error: "Character not found." });
            return;
        }
        res.json({ deleted: true });
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Unable to delete character." });
    }
});

const httpServer = createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({
        server: httpServer,
        maxPayload: 512 * 1024,
    }),
});
gameServer.define("shmup_room", ShmupRoom);

// Colyseus dashboard — only enabled in development
// In production set NODE_ENV=production to disable it
if (!isProductionEnv()) {
    app.use("/colyseus", monitor());
    console.log(`Colyseus monitor → http://localhost:${PORT}/colyseus`);
}

httpServer.listen(PORT, () => {
    console.log(`Shmup server listening on port ${PORT}`);
});
