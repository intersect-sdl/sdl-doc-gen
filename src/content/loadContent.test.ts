import { buildUUIDIndexForContent, resolveLinksInContent, trackBacklinks } from "./loadContent";
import { describe, it, expect, vi } from "vitest";
import fs from "fs/promises";
import path from "path";

vi.mock("fs/promises");
vi.mock("path");

const mockContentDir = "/mock/content";
const mockCachePath = "/mock/cache";
const mockOutPath = "/mock/backlinks.json";

describe("loadContent.ts", () => {
  it("should build UUID index for content", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue("---\nslug: test\n---\nContent");
    vi.spyOn(fs, "writeFile").mockResolvedValue();

    await expect(buildUUIDIndexForContent(mockContentDir, mockCachePath)).resolves.not.toThrow();
  });

  it("should resolve links in content", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue("[[uuid:1234-5678-9012-3456]]");
    vi.spyOn(fs, "writeFile").mockResolvedValue();

    await expect(resolveLinksInContent(mockContentDir, mockCachePath)).resolves.not.toThrow();
  });

  it("should track backlinks", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue("[[uuid:1234-5678-9012-3456]]");
    vi.spyOn(fs, "writeFile").mockResolvedValue();

    await expect(trackBacklinks(mockContentDir, mockOutPath)).resolves.not.toThrow();
  });
});
