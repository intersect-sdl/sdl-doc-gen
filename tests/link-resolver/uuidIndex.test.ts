import { buildUUIDIndex } from "../../src/link-resolver/uuidIndex";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(__dirname, "temp-uuid");

const UUID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UUID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("buildUUIDIndex", () => {
  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    await writeFile(path.join(testDir, "a.md"), `---\nuuid: ${UUID_A}\ntitle: Alpha\n---\nSome markdown.`);
    await writeFile(path.join(testDir, "b.ts"), `/**\n * uuid: ${UUID_B}\n * This is Beta\n */\nexport function beta() {}`);
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it.skip("creates UUID index from Markdown and TypeScript", async () => {
    const index = await buildUUIDIndex(testDir);
    
    expect(index[UUID_A]).toBeDefined();
    expect(index[UUID_B]).toBeDefined();
    expect(index[UUID_A].type).toBe("markdown");
    expect(index[UUID_B].type).toBe("typescript");
  });
});
