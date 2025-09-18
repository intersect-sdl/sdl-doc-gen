import path from 'node:path';
import { PathConfig } from '../types.js';

/**
 * Configuration manager for doc-gen library
 */
export class DocGenConfig {
  private static instance: DocGenConfig;
  private config: Required<PathConfig>;

  private constructor(pathConfig?: PathConfig) {
    this.config = this.resolveConfig(pathConfig);
  }

  /**
   * Get or create the singleton configuration instance
   */
  static getInstance(pathConfig?: PathConfig): DocGenConfig {
    if (!DocGenConfig.instance) {
      DocGenConfig.instance = new DocGenConfig(pathConfig);
    } else if (pathConfig) {
      // Update existing instance with new config
      DocGenConfig.instance.updateConfig(pathConfig);
    }
    return DocGenConfig.instance;
  }

  /**
   * Update the current configuration
   */
  updateConfig(pathConfig: PathConfig): void {
    this.config = this.resolveConfig(pathConfig);
  }

  /**
   * Resolve configuration from multiple sources with fallbacks
   */
  private resolveConfig(pathConfig?: PathConfig): Required<PathConfig> {
    // Default configuration
    const defaults: Required<PathConfig> = {
      basePath: this.resolveBasePath(),
      contentRoots: ['docs', 'platforms'],
      slugPrefixes: ['/docs/', '/platforms/'],
      fileExtensions: ['md', 'mdx']
    };

    // Override with provided config
    const resolved: Required<PathConfig> = {
      basePath: pathConfig?.basePath ? this.resolvePath(pathConfig.basePath) : defaults.basePath,
      contentRoots: pathConfig?.contentRoots ?? defaults.contentRoots,
      slugPrefixes: pathConfig?.slugPrefixes ?? defaults.slugPrefixes,
      fileExtensions: pathConfig?.fileExtensions ?? defaults.fileExtensions
    };

    return resolved;
  }

  /**
   * Resolve base path from multiple sources
   */
  private resolveBasePath(): string {
    // 1. Check environment variables
    const envVars = [
      'DOC_GEN_BASE_PATH',
      'PROJECT_ROOT',
      'WORKSPACE_ROOT',
      'PWD'
    ];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value && this.isValidPath(value)) {
        //console.log(`[doc-gen] Using base path from ${envVar}: ${value}`);
        return path.resolve(value);
      }
    }

    // 2. Fallback to current working directory
    const cwd = process.cwd();
    //console.log(`[doc-gen] Using current working directory as base path: ${cwd}`);
    return cwd;
  }

  /**
   * Resolve a path that might be an environment variable or absolute path
   */
  private resolvePath(pathOrEnvVar: string): string {
    // Check if it's an environment variable reference
    if (process.env[pathOrEnvVar]) {
      const envPath = process.env[pathOrEnvVar];
      //console.log(`[doc-gen] Resolved path from env ${pathOrEnvVar}: ${envPath}`);
      return path.resolve(envPath);
    }

    // Check if it's a Windows absolute path (even on non-Windows systems)
    if (/^[A-Za-z]:(\\|\/)/i.test(pathOrEnvVar)) {
      // Normalize Windows paths to forward slashes for consistent processing
      return pathOrEnvVar.replace(/\\/g, '/');
    }

    // Check if it's already an absolute path
    if (path.isAbsolute(pathOrEnvVar)) {
      return pathOrEnvVar;
    }

    // Resolve relative to current working directory
    return path.resolve(pathOrEnvVar);
  }

  /**
   * Check if a path exists and is accessible
   */
  private isValidPath(pathToCheck: string): boolean {
    try {
      const resolved = path.resolve(pathToCheck);
      // Basic validation - path should be absolute after resolution
      return path.isAbsolute(resolved);
    } catch {
      return false;
    }
  }

  /**
   * Get the resolved base path
   */
  getBasePath(): string {
    return this.config.basePath;
  }

  /**
   * Get resolved content root paths (absolute)
   */
  getContentRoots(): string[] {
    return this.config.contentRoots.map(root => {
      if (path.isAbsolute(root)) {
        return root;
      }
      return path.resolve(this.config.basePath, root);
    });
  }

  /**
   * Get slug prefixes for content root removal
   */
  getSlugPrefixes(): string[] {
    return this.config.slugPrefixes;
  }

  /**
   * Get file extensions to process
   */
  getFileExtensions(): string[] {
    return this.config.fileExtensions;
  }

  /**
   * Generate file glob patterns for content discovery
   */
  getFilePatterns(): string[] {
    return this.config.fileExtensions.map(ext => `**/*.${ext}`);
  }

  /**
   * Convert file path to slug based on configuration
   */
  pathToSlug(filePath: string): string {
    // Normalize the path and convert backslashes to forward slashes for consistent processing
    let normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    const normalizedBasePath = path.normalize(this.config.basePath).replace(/\\/g, '/');
    
    // Remove file extension
    let slug = normalizedPath.replace(/\.[^/.]+$/, "");
    
    // Remove base path if present
    if (slug.startsWith(normalizedBasePath)) {
      slug = slug.slice(normalizedBasePath.length);
    }
    
    // Remove Windows drive letter if present (e.g., "/C:" becomes "")
    slug = slug.replace(/^\/[A-Za-z]:/, '');
    
    // Remove configured prefixes
    for (const prefix of this.config.slugPrefixes) {
      if (slug.startsWith(prefix)) {
        slug = slug.slice(prefix.length);
        break; // Only remove the first matching prefix
      }
    }
    
    return slug;
  }

  /**
   * Get full configuration object (for debugging)
   */
  getConfig(): Required<PathConfig> {
    return { ...this.config };
  }

  /**
   * Log current configuration (for debugging)
   */
  logConfig(): void {
    //console.log('[doc-gen] Current configuration:');
    //console.log('  Base Path:', this.config.basePath);
    //console.log('  Content Roots:', this.config.contentRoots);
    //console.log('  Resolved Content Roots:', this.getContentRoots());
    //console.log('  Slug Prefixes:', this.config.slugPrefixes);
    //console.log('  File Extensions:', this.config.fileExtensions);
  }
}

/**
 * Convenience function to get configuration instance
 */
export function getConfig(pathConfig?: PathConfig): DocGenConfig {
  return DocGenConfig.getInstance(pathConfig);
}

/**
 * Convenience function to configure doc-gen paths
 */
export function configurePaths(pathConfig: PathConfig): void {
  DocGenConfig.getInstance(pathConfig);
}
