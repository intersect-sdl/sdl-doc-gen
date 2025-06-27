import { parsePythonDocs } from "../../src/parser/pydoc";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const dir = path.resolve(__dirname, "temp-python");

describe("parsePythonDocs", () => {
  beforeAll(async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "sample.py"),
      `
def hello():
    """
    uuid: dddddddd-dddd-dddd-dddd-dddddddddddd
    Hello world function
    """
    print("Hello")
    `
    );
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("extracts uuid and docstring from Python function", async () => {
    const docs = await parsePythonDocs(path.join(dir, "sample.py"));
    expect(docs.length).toBe(1);
    expect(docs[0].uuid).toBe("dddddddd-dddd-dddd-dddd-dddddddddddd");
    expect(docs[0].docstring).toContain("Hello world function");
  });
});
