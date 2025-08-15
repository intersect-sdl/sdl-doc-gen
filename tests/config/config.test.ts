import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocGenConfig, getConfig, configurePaths } from '../../src/config/config';
import path from 'path';

describe('DocGenConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear relevant environment variables
    delete process.env.DOC_GEN_BASE_PATH;
    delete process.env.PROJECT_ROOT;
    delete process.env.WORKSPACE_ROOT;
    
    // Reset singleton instance
    (DocGenConfig as any).instance = undefined;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Reset singleton instance
    (DocGenConfig as any).instance = undefined;
  });

  describe('Environment Variable Resolution', () => {
    it('should use DOC_GEN_BASE_PATH when available', () => {
      process.env.DOC_GEN_BASE_PATH = '/custom/doc/gen/path';
      
      const config = getConfig();
      expect(config.getBasePath()).toBe('/custom/doc/gen/path');
    });

    it('should fall back to PROJECT_ROOT when DOC_GEN_BASE_PATH is not set', () => {
      process.env.PROJECT_ROOT = '/project/root/path';
      
      const config = getConfig();
      expect(config.getBasePath()).toBe('/project/root/path');
    });

    it('should fall back to WORKSPACE_ROOT when PROJECT_ROOT is not set', () => {
      process.env.WORKSPACE_ROOT = '/workspace/root/path';
      
      const config = getConfig();
      expect(config.getBasePath()).toBe('/workspace/root/path');
    });

    it('should use current working directory as final fallback', () => {
      const config = getConfig();
      expect(config.getBasePath()).toBe(process.cwd());
    });
  });

  describe('Configuration Override', () => {
    it('should use provided configuration over environment variables', () => {
      process.env.PROJECT_ROOT = '/env/path';
      
      const config = getConfig({
        basePath: '/override/path'
      });
      
      expect(config.getBasePath()).toBe('/override/path');
    });

    it('should merge configuration with defaults', () => {
      const config = getConfig({
        basePath: '/custom/path',
        fileExtensions: ['md', 'txt']
      });
      
      expect(config.getBasePath()).toBe('/custom/path');
      expect(config.getFileExtensions()).toEqual(['md', 'txt']);
      expect(config.getContentRoots()).toEqual(['/custom/path/docs', '/custom/path/platforms']); // Resolved absolute paths
    });
  });

  describe('Path Resolution', () => {
    it('should resolve relative content roots to absolute paths', () => {
      const config = getConfig({
        basePath: '/project/root',
        contentRoots: ['docs', 'guides']
      });
      
      const resolvedRoots = config.getContentRoots();
      expect(resolvedRoots).toEqual([
        '/project/root/docs',
        '/project/root/guides'
      ]);
    });

    it('should handle absolute content root paths', () => {
      const config = getConfig({
        basePath: '/project/root',
        contentRoots: ['/absolute/docs', 'relative/guides']
      });
      
      const resolvedRoots = config.getContentRoots();
      expect(resolvedRoots).toEqual([
        '/absolute/docs',
        '/project/root/relative/guides'
      ]);
    });
  });

  describe('Slug Generation', () => {
    it('should convert file paths to slugs correctly', () => {
      const config = getConfig({
        basePath: '/project/root',
        slugPrefixes: ['/docs/', '/guides/']
      });
      
      const testCases = [
        {
          input: '/project/root/docs/getting-started.md',
          expected: '/getting-started'
        },
        {
          input: '/project/root/guides/advanced-usage.md',
          expected: '/advanced-usage'
        },
        {
          input: '/other/path/file.md',
          expected: '/other/path/file'
        }
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(config.pathToSlug(input)).toBe(expected);
      });
    });

    it('should handle Windows paths correctly', () => {
      const config = getConfig({
        basePath: 'C:\\project\\root',
        slugPrefixes: ['/docs/']
      });
      
      const windowsPath = 'C:\\project\\root\\docs\\guide.md';
      const slug = config.pathToSlug(windowsPath);
      
      expect(slug).toBe('/guide');
      expect(slug).not.toContain('\\');
    });

    it('should remove only the first matching prefix', () => {
      const config = getConfig({
        basePath: '/project/root',
        slugPrefixes: ['/docs/', '/docs/guides/']
      });
      
      const slug = config.pathToSlug('/project/root/docs/guides/tutorial.md');
      expect(slug).toBe('/guides/tutorial');
    });
  });

  describe('File Pattern Generation', () => {
    it('should generate correct glob patterns', () => {
      const config = getConfig({
        fileExtensions: ['md', 'mdx', 'txt']
      });
      
      const patterns = config.getFilePatterns();
      expect(patterns).toEqual(['**/*.md', '**/*.mdx', '**/*.txt']);
    });
  });

  describe('Configuration Updates', () => {
    it('should update existing configuration instance', () => {
      const config1 = getConfig({ basePath: '/initial/path' });
      expect(config1.getBasePath()).toBe('/initial/path');
      
      configurePaths({ basePath: '/updated/path' });
      
      const config2 = getConfig();
      expect(config2.getBasePath()).toBe('/updated/path');
      
      // Should be the same instance
      expect(config1).toBe(config2);
    });
  });

  describe('Defaults', () => {
    it('should provide sensible defaults', () => {
      const config = getConfig();
      
      expect(config.getContentRoots()).toEqual([
        path.resolve(process.cwd(), 'docs'),
        path.resolve(process.cwd(), 'platforms')
      ]);
      expect(config.getSlugPrefixes()).toEqual(['/docs/', '/platforms/']);
      expect(config.getFileExtensions()).toEqual(['md', 'mdx']);
    });
  });

  describe('Debug and Utility Methods', () => {
    it('should provide cache statistics', () => {
      const config = getConfig({
        basePath: '/test/path',
        contentRoots: ['docs'],
        slugPrefixes: ['/docs/'],
        fileExtensions: ['md']
      });
      
      const fullConfig = config.getConfig();
      
      expect(fullConfig).toEqual({
        basePath: '/test/path',
        contentRoots: ['docs'],
        slugPrefixes: ['/docs/'],
        fileExtensions: ['md']
      });
    });

    it('should log configuration without throwing', () => {
      const config = getConfig();
      
      // Should not throw
      expect(() => config.logConfig()).not.toThrow();
    });
  });

  describe('Environment Variable References', () => {
    it('should resolve environment variable references in basePath', () => {
      process.env.CUSTOM_ROOT = '/custom/env/path';
      
      const config = getConfig({
        basePath: 'CUSTOM_ROOT'
      });
      
      expect(config.getBasePath()).toBe('/custom/env/path');
    });

    it('should handle non-existent environment variables', () => {
      const config = getConfig({
        basePath: 'NON_EXISTENT_VAR'
      });
      
      // Should resolve relative to current working directory
      expect(config.getBasePath()).toBe(path.resolve('NON_EXISTENT_VAR'));
    });
  });
});
