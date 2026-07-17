import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];

async function read(relativePath) {
    return fs.readFile(path.join(root, relativePath), "utf8");
}

async function listFiles(relativeDirectory) {
    const directory = path.join(root, relativeDirectory);
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const relativePath = path.join(relativeDirectory, entry.name);
        if (entry.isDirectory()) files.push(...await listFiles(relativePath));
        else files.push(relativePath);
    }
    return files;
}

function requireCondition(condition, message) {
    if (!condition) failures.push(message);
}

const requiredFiles = [
    "AGENTS.md",
    "src/AGENTS.md",
    "server/AGENTS.md",
    "ARCHITECTURE.md",
    "README.md",
    ".env.example",
];

for (const relativePath of requiredFiles) {
    try {
        await fs.access(path.join(root, relativePath));
    } catch (_error) {
        failures.push(`Missing required documentation file: ${relativePath}`);
    }
}

const agents = await read("AGENTS.md");
const architecture = await read("ARCHITECTURE.md");
const readme = await read("README.md");
const envExample = await read(".env.example");
const packageJson = JSON.parse(await read("package.json"));

requireCondition(agents.split(/\r?\n/).length <= 170, "Root AGENTS.md should remain a compact routing guide (170 lines maximum).");
requireCondition(/Keep documentation up to date/i.test(agents), "AGENTS.md must explicitly require keeping documentation up to date.");

for (const [label, content] of [["AGENTS.md", agents], ["README.md", readme], ["ARCHITECTURE.md", architecture]]) {
    requireCondition(/Neon/.test(content), `${label} must identify Neon as the production SQL/persistence provider.`);
    requireCondition(/Render/.test(content), `${label} must identify Render as the production server provider.`);
}

const staleStatements = [
    /join with the displayed room code/i,
    /Space returns players? to [`']?Lobby/i,
    /No ready-up flow/i,
    /Development builds expose a map editor through [`']?Lobby/i,
    /Render\s*\/\s*Railway\s*\/\s*Fly\.io/i,
];

for (const pattern of staleStatements) {
    for (const [label, content] of [["AGENTS.md", agents], ["README.md", readme], ["ARCHITECTURE.md", architecture]]) {
        requireCondition(!pattern.test(content), `${label} contains retired guidance matching ${pattern}.`);
    }
}

const roomSource = await read("server/src/rooms/ShmupRoom.ts");
const handledMessages = [...roomSource.matchAll(/this\.onMessage\("([^"]+)"/g)].map((match) => match[1]);
for (const message of handledMessages) {
    requireCondition(architecture.includes(`\`"${message}"\``), `ARCHITECTURE.md is missing client-to-server message \"${message}\".`);
}

const sourceFiles = [
    ...await listFiles("server/src"),
    ...await listFiles("src"),
].filter((file) => /\.(?:ts|js)$/.test(file));

const documentedEnvironmentVariables = new Set(
    [...envExample.matchAll(/\b([A-Z][A-Z0-9_]+)=/g)].map((match) => match[1]),
);

for (const sourceFile of sourceFiles) {
    const source = await read(sourceFile);
    const serverVariables = [...source.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((match) => match[1]);
    const clientVariables = [...source.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)].map((match) => match[1]);
    for (const variable of [...serverVariables, ...clientVariables]) {
        requireCondition(documentedEnvironmentVariables.has(variable), `.env.example is missing ${variable}, used by ${sourceFile}.`);
    }
}

for (const script of ["docs:check", "server:typecheck", "server:test", "client:build", "verify"]) {
    requireCondition(typeof packageJson.scripts?.[script] === "string", `package.json is missing the ${script} script.`);
}

if (failures.length > 0) {
    console.error("Documentation checks failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log(`Documentation checks passed (${handledMessages.length} room handlers and ${documentedEnvironmentVariables.size} environment variables covered).`);
}
