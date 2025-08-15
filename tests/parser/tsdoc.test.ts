import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Project } from 'ts-morph';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { parseTypeScriptDocs } from '../../src/parser/tsdoc';

describe('TypeScript Documentation Parser', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsdoc-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createTestFile(content: string): Promise<string> {
    const filePath = path.join(tempDir, 'test.ts');
    await fs.writeFile(filePath, content);
    // Create a tsconfig.json file in the temp directory
    const tsConfig = {
      compilerOptions: {
        target: "es2022",
        module: "esnext",
        moduleResolution: "bundler",
        lib: ["es2022", "dom"],
        strict: true,
      }
    };
    await fs.writeFile(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
    return filePath;
  }

  it('should parse basic JSDoc comments', async () => {
    const testContent = [
      '/** ',
      ' * A simple test function',
      ' * @param x The first parameter',
      ' * @returns The return value',
      ' */',
      'function testFunction(x: number): number {',
      '  return x * 2;',
      '}'
    ].join('\n');

    const filePath = await createTestFile(testContent);
    const docs = parseTypeScriptDocs(path.join(tempDir, 'test.ts'));

    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      name: 'testFunction',
      kind: 'FunctionDeclaration',
      tags: {
        param: ['The first parameter'],
        returns: ['The return value']
      }
    });
    expect(docs[0].documentation).toContain('A simple test function');
  });

  it('should handle multiple JSDoc tags', async () => {
    const testContent = `
      /**
       * Complex function with multiple tags
       * @param x First parameter
       * @param y Second parameter
       * @returns The computed value
       * @example
       * const result = complexFunction(1, 2);
       * @throws {Error} When inputs are invalid
       */
      function complexFunction(x: number, y: number): number {
        return x + y;
      }
    `;

    const filePath = await createTestFile(testContent);
    const docs = parseTypeScriptDocs(filePath);

    expect(docs).toHaveLength(1);
    expect(docs[0].tags).toMatchObject({
      param: ['First parameter', 'Second parameter'],
      returns: ['The computed value'],
      example: ['const result = complexFunction(1, 2);'],
      throws: ['When inputs are invalid']
    });
  });

  it('should extract UUID from comments', async () => {
    const testContent = `
      /**
       * Function with UUID
       * @uuid 550e8400-e29b-41d4-a716-446655440000
       */
      function uuidFunction() {}
    `;

    const filePath = await createTestFile(testContent);
    const docs = parseTypeScriptDocs(filePath);

    expect(docs[0].uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should process code info for functions', async () => {
    const testContent = `
      /**
       * Function with parameters
       * @param x First param
       * @param y Second param
       * @returns Sum of params
       */
      function sum(x: number, y: number): number {
        return x + y;
      }
    `;

    const filePath = await createTestFile(testContent);
    const docs = parseTypeScriptDocs(filePath);

    expect(docs[0].codeInfo).toBeDefined();
    expect(docs[0].codeInfo?.parameters).toHaveLength(2);
    expect(docs[0].codeInfo?.parameters?.[0]).toMatchObject({
      name: 'x',
      type: 'number',
      description: 'First param'
    });
    expect(docs[0].codeInfo?.returns).toMatchObject({
      type: 'number',
      description: 'Sum of params'
    });
  });

  it('should handle classes with methods', async () => {
    const testContent = `
      /**
       * A test class
       */
      class TestClass {
        /**
         * A method
         * @param input The input value
         */
        method(input: string): void {}
      }
    `;

    const filePath = await createTestFile(testContent);
    const docs = parseTypeScriptDocs(filePath);

    expect(docs).toHaveLength(2);
    expect(docs[0].name).toBe('TestClass');
    expect(docs[1].name).toBe('method');
  });

  it('should process JSDoc with directives', async () => {
    const testContent = [
      '/**',
      ' * Function with special directives',
      ' * @example',
      ' * ```typescript',
      ' * const x = specialFunction();',
      ' * ```',
      ' * @deprecated Use newFunction instead',
      ' * @since 2.0.0',
      ' */',
      'function specialFunction() {}'
    ].join('\n');

    const filePath = await createTestFile(testContent);
    const docs = parseTypeScriptDocs(filePath);

    expect(docs[0].documentation).toContain('```typescript');
    expect(docs[0].tags).toMatchObject({
      example: expect.any(Array),
      deprecated: ['Use newFunction instead'],
      since: ['2.0.0']
    });
  });

  it('should handle interfaces and type definitions', async () => {
    const testContent = `
      /**
       * A test interface
       * @template T The type parameter
       */
      interface TestInterface<T> {
        /**
         * A property
         */
        prop: T;
      }

      /**
       * A type alias
       */
      type TestType = string | number;
    `;

    const filePath = await createTestFile(testContent);
    const docs = parseTypeScriptDocs(filePath);

    expect(docs).toHaveLength(3); // Interface, property, and type alias
    expect(docs.map(d => d.kind)).toContain('InterfaceDeclaration');
    expect(docs.map(d => d.kind)).toContain('TypeAliasDeclaration');
  });

  it('should process nested JSDoc comments', async () => {
    const testContent = `
      /**
       * Outer function
       * @param options Configuration options
       */
      function outer(options: {
        /**
         * Inner property
         */
        prop: string
      }) {}
    `;

    const filePath = await createTestFile(testContent);
    const docs = parseTypeScriptDocs(filePath);

    expect(docs).toHaveLength(2);
    expect(docs[0].name).toBe('outer');
    expect(docs[1].name).toBe('prop');
  });
});
