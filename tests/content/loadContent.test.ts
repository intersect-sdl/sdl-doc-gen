import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { getEntries, getSiteToc, getAllSites } from '../../src/content/loadContent';
import { configurePaths, DocGenConfig } from '../../src/config/config';
import { mkdir, writeFile, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('loadContent with configuration', () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    testDir = path.resolve(__dirname, 'temp-content');
    await mkdir(testDir, { recursive: true });
    await mkdir(path.join(testDir, 'docs'), { recursive: true });
    await mkdir(path.join(testDir, 'platforms'), { recursive: true });

    // Create test markdown files
    await writeFile(
      path.join(testDir, 'docs', 'getting-started.md'),
      `---
title: Getting Started
description: How to get started
---

# Getting Started

This is a guide to getting started.`
    );

    await writeFile(
      path.join(testDir, 'docs', 'advanced.md'),
      `---
title: Advanced Usage
description: Advanced features
---

# Advanced Usage

Advanced topics and usage.`
    );

    await writeFile(
      path.join(testDir, 'platforms', 'platform-a.md'),
      `---
title: Platform A
description: Platform A documentation
---

# Platform A

Documentation for Platform A.`
    );

    await writeFile(
      path.join(testDir, 'platforms', 'platform-b.mdx'),
      `---
title: Platform B
description: Platform B documentation
---

# Platform B

Documentation for Platform B with MDX support.`
    );
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset singleton instance
    (DocGenConfig as any).instance = undefined;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Reset singleton instance
    (DocGenConfig as any).instance = undefined;
  });

  describe('getEntries', () => {
    it('should get entries with default configuration', async () => {
      const entries = await getEntries(path.join(testDir, 'docs'));
      
      expect(entries).toHaveLength(2);
      // With default config, the slugs include the relative path from the current working directory
      expect(entries.map(e => e.slug)).toContain('/tests/content/temp-content/docs/getting-started');
      expect(entries.map(e => e.slug)).toContain('/tests/content/temp-content/docs/advanced');
    });

    it('should get entries with custom configuration', async () => {
      const customConfig = {
        basePath: testDir,
        slugPrefixes: ['/docs/'],
        fileExtensions: ['md']
      };

      const entries = await getEntries(path.join(testDir, 'docs'), customConfig);
      
      expect(entries).toHaveLength(2);
      expect(entries.map(e => e.slug)).toContain('/getting-started');
      expect(entries.map(e => e.slug)).toContain('/advanced');
    });

    it('should respect fileExtensions configuration', async () => {
      const customConfig = {
        basePath: testDir,
        slugPrefixes: ['/platforms/'],
        fileExtensions: ['md'] // Only .md, not .mdx
      };

      const entries = await getEntries(path.join(testDir, 'platforms'), customConfig);
      
      expect(entries).toHaveLength(1);
      expect(entries[0].slug).toBe('/platform-a');
    });

    it('should include both md and mdx files when configured', async () => {
      const customConfig = {
        basePath: testDir,
        slugPrefixes: ['/platforms/'],
        fileExtensions: ['md', 'mdx']
      };

      const entries = await getEntries(path.join(testDir, 'platforms'), customConfig);
      
      expect(entries).toHaveLength(2);
      expect(entries.map(e => e.slug)).toContain('/platform-a');
      expect(entries.map(e => e.slug)).toContain('/platform-b');
    });
  });

  describe('getSiteToc', () => {
    it('should get site table of contents with default configuration', async () => {
      const toc = await getSiteToc(path.join(testDir, 'docs'));
      
      expect(toc).toHaveLength(2);
      expect(toc.some(item => item.meta.title === 'Getting Started')).toBe(true);
      expect(toc.some(item => item.meta.title === 'Advanced Usage')).toBe(true);
    });

    it('should get site table of contents with custom configuration', async () => {
      const customConfig = {
        basePath: testDir,
        slugPrefixes: ['/docs/'],
        fileExtensions: ['md']
      };

      const toc = await getSiteToc(path.join(testDir, 'docs'), customConfig);
      
      expect(toc).toHaveLength(2);
      
      // Check that slugs are generated correctly
      const slugs = toc.map(item => item.meta.slug);
      expect(slugs).toContain('/getting-started');
      expect(slugs).toContain('/advanced');
    });

    it('should parse frontmatter correctly', async () => {
      const toc = await getSiteToc(path.join(testDir, 'docs'));
      
      const gettingStartedItem = toc.find(item => item.meta.title === 'Getting Started');
      expect(gettingStartedItem).toBeDefined();
      expect(gettingStartedItem?.meta.description).toBe('How to get started');
    });
  });

  describe('getAllSites', () => {
    it('should get all sites with default configuration', async () => {
      const sites = await getAllSites(path.join(testDir, 'docs'));
      
      expect(sites).toHaveLength(2);
      expect(sites.every(site => site.content)).toBe(true);
      expect(sites.every(site => site.meta)).toBe(true);
    });

    it('should get all sites with custom configuration', async () => {
      const customConfig = {
        basePath: testDir,
        fileExtensions: ['md', 'mdx']
      };

      const sites = await getAllSites(path.join(testDir, 'platforms'), customConfig);
      
      expect(sites).toHaveLength(2);
      expect(sites.every(site => site.content)).toBe(true);
      expect(sites.every(site => site.meta)).toBe(true);
    });
  });

  describe('Environment variable integration', () => {
    it('should use environment variables for base path', async () => {
      process.env.PROJECT_ROOT = testDir;
      
      const entries = await getEntries(path.join(testDir, 'docs'));
      
      expect(entries).toHaveLength(2);
      // Slugs should be generated relative to PROJECT_ROOT
      expect(entries.map(e => e.slug)).toContain('/getting-started');
    });

    it('should override environment variables with explicit config', async () => {
      process.env.PROJECT_ROOT = '/some/other/path';
      
      const customConfig = {
        basePath: testDir,
        slugPrefixes: ['/docs/']
      };

      const entries = await getEntries(path.join(testDir, 'docs'), customConfig);
      
      expect(entries).toHaveLength(2);
      expect(entries.map(e => e.slug)).toContain('/getting-started');
    });
  });

  describe('Path resolution', () => {
    it('should handle different slug prefixes', async () => {
      const customConfig = {
        basePath: testDir,
        slugPrefixes: ['/documentation/', '/guides/']
      };

      const entries = await getEntries(path.join(testDir, 'docs'), customConfig);
      
      expect(entries).toHaveLength(2);
      // Since the files are in docs/ but we're looking for /documentation/ prefix,
      // the docs prefix should be preserved in the path
      expect(entries.map(e => e.slug)).toContain('/docs/getting-started');
      expect(entries.map(e => e.slug)).toContain('/docs/advanced');
    });

    it('should generate correct slugs for nested directories', async () => {
      // Create a nested directory structure
      await mkdir(path.join(testDir, 'docs', 'guides'), { recursive: true });
      await writeFile(
        path.join(testDir, 'docs', 'guides', 'tutorial.md'),
        `---
title: Tutorial
---

# Tutorial

A nested tutorial.`
      );

      const customConfig = {
        basePath: testDir,
        slugPrefixes: ['/docs/']
      };

      const entries = await getEntries(path.join(testDir, 'docs'), customConfig);
      
      expect(entries.some(e => e.slug === '/guides/tutorial')).toBe(true);
      
      // Clean up
      await rm(path.join(testDir, 'docs', 'guides'), { recursive: true });
    });
  });
});
