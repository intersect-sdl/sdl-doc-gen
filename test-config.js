#!/usr/bin/env node

/**
 * Test script for the doc-gen configuration system
 * Run with: node test-config.js
 */

// Set up test environment variables
process.env.PROJECT_ROOT = "/Users/x8q/Projects/INTERSECT/ACL";

// Import the configuration system
import { getConfig, configurePaths } from './src/config/config.ts';

console.log('🧪 Testing doc-gen configuration system...\n');

try {
  // Test 1: Default configuration with environment variable
  console.log('1. Testing default configuration with PROJECT_ROOT environment variable:');
  const config1 = getConfig();
  config1.logConfig();
  console.log('');

  // Test 2: Custom configuration
  console.log('2. Testing custom configuration:');
  const customConfig = {
    basePath: "/custom/project/path",
    contentRoots: ["documentation", "guides"],
    slugPrefixes: ["/docs/", "/guides/"],
    fileExtensions: ["md", "mdx", "markdown"]
  };
  
  configurePaths(customConfig);
  const config2 = getConfig();
  config2.logConfig();
  console.log('');

  // Test 3: Path to slug conversion
  console.log('3. Testing path to slug conversion:');
  const testPaths = [
    "/custom/project/path/docs/architecture.md",
    "/custom/project/path/guides/getting-started.md",
    "/some/other/path/file.md"
  ];

  testPaths.forEach(testPath => {
    const slug = config2.pathToSlug(testPath);
    console.log(`  ${testPath} → ${slug}`);
  });
  console.log('');

  // Test 4: File patterns
  console.log('4. Testing file patterns:');
  const patterns = config2.getFilePatterns();
  console.log('  File patterns:', patterns);
  console.log('');

  // Test 5: Content roots
  console.log('5. Testing content roots resolution:');
  const contentRoots = config2.getContentRoots();
  console.log('  Resolved content roots:', contentRoots);
  console.log('');

  console.log('✅ All configuration tests passed!');
  
} catch (error) {
  console.error('❌ Configuration test failed:', error);
  process.exit(1);
}
