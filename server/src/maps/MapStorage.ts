import { promises as fs } from "node:fs";
import path from "node:path";

export interface StoredMapDocument {
    version: number;
    name: string;
    width: number;
    height: number;
    chunks: unknown[];
}

export function normalizeMapName(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
    return /^[a-z0-9][a-z0-9_-]{0,47}$/.test(normalized) ? normalized : null;
}

export class MapStorage {
    constructor(private readonly directory = path.resolve(process.env.MAP_STORAGE_DIR || path.join(process.cwd(), "maps"))) {}

    private filePath(name: string): string {
        return path.join(this.directory, `${name}.json`);
    }

    async exists(name: string): Promise<boolean> {
        try {
            await fs.access(this.filePath(name));
            return true;
        } catch (_error) {
            return false;
        }
    }

    async list(): Promise<string[]> {
        try {
            const entries = await fs.readdir(this.directory, { withFileTypes: true });
            return entries
                .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
                .map((entry) => entry.name.slice(0, -5))
                .filter((name) => normalizeMapName(name) === name)
                .sort();
        } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
            throw error;
        }
    }

    async load(name: string): Promise<unknown> {
        const content = await fs.readFile(this.filePath(name), "utf8");
        return JSON.parse(content);
    }

    async save(document: StoredMapDocument): Promise<void> {
        await fs.mkdir(this.directory, { recursive: true });
        const target = this.filePath(document.name);
        const temporary = path.join(this.directory, `.${document.name}.${process.pid}.${Date.now()}.tmp`);
        await fs.writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, "utf8");
        await fs.rename(temporary, target);
    }
}
