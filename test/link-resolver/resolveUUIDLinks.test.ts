import { resolveUUIDLinks } from "../../src/link-resolver/resolveUUIDLinks";
import { buildUUIDIndex } from "../../src/link-resolver/uuidIndex";
import { mkdir, writeFile, readFile, rm } from "fs/promises";
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const dir = path.resolve(__dirname, "temp-links");
const uuid = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe("resolveUUIDLinks", () => {
  beforeAll(async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "target.md"), `---\nuuid: ${uuid}\ntitle: Target\n---\nThis is the target.`);
    await writeFile(path.join(dir, "source.md"), `Link to [[uuid:${uuid}]]`);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("replaces uuid references with relative links", async () => {
    await resolveUUIDLinks(dir, path.join(dir, "uuid-index.json"));
    const updated = await readFile(path.join(dir, "source.md"), "utf-8");
    expect(updated).toMatch("[Target](./target.md)");
  });
});
