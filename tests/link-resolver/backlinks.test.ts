import { buildBacklinkIndex } from "../../src/link-resolver/backlinks";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(__dirname, "temp-content");

describe("buildBacklinkIndex", () => {
  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });

    await writeFile(path.join(testDir, "doc1.md"), `Link to [[uuid:11111111-1111-1111-1111-111111111111]]`);
    await writeFile(path.join(testDir, "doc2.svx"), `Also links [[uuid:11111111-1111-1111-1111-111111111111]] and [[uuid:22222222-2222-2222-2222-222222222222]]`);
    await writeFile(path.join(testDir, "script.ts"), `// uuid = 33333333-3333-3333-3333-333333333333`);
    await writeFile(path.join(testDir, "notes.py"), `"""uuid: 44444444-4444-4444-4444-444444444444"""`);
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("indexes all UUID references correctly", async () => {
    const backlinks = await buildBacklinkIndex(testDir);

    expect(backlinks["11111111-1111-1111-1111-111111111111"]).toBeDefined();
    expect(backlinks["11111111-1111-1111-1111-111111111111"].count).toBe(2);
    expect(backlinks["22222222-2222-2222-2222-222222222222"].count).toBe(1);
    expect(backlinks["33333333-3333-3333-3333-333333333333"]).toBeUndefined();
    expect(backlinks["44444444-4444-4444-4444-444444444444"]).toBeUndefined();
  });
});
