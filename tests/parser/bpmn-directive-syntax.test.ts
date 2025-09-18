/**
 * Tests for BPMN directive syntax support
 * Verifies both leaf and container directive syntaxes work correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseMarkdown } from '../../src/parser/markdown';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a test BPMN file if it doesn't exist
const testBpmnPath = path.join(__dirname, 'test-workflow.bpmn');
const testBpmnContent = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
</bpmn:definitions>`;

describe('BPMN Directive Syntax Support', () => {
  // Setup test file
  beforeAll(() => {
    if (!fs.existsSync(testBpmnPath)) {
      fs.writeFileSync(testBpmnPath, testBpmnContent);
    }
  });

  // Cleanup test file
  afterAll(() => {
    if (fs.existsSync(testBpmnPath)) {
      fs.unlinkSync(testBpmnPath);
    }
  });

  it('should process leaf directive syntax ::bpmn{src="file.bpmn"}', async () => {
    const markdown = `
# Test Document

::bpmn{src="test-workflow.bpmn" width="400" height="300"}

Some content after.
    `;

    // Use the test directory as the base directory
    const result = await parseMarkdown(markdown, { 
      baseDir: __dirname
    });
    
    // Should contain BPMN container elements
    expect(result.code).toContain('bpmn-container');
    expect(result.code).toContain('BPMN Workflow: test-workflow.bpmn');
    expect(result.code).toContain('Process ID:');
    expect(result.code).toContain('Dimensions: 400×300px');
    
    // Should not contain error messages
    expect(result.code).not.toContain('BPMN directive missing');
    expect(result.code).not.toContain('Error processing BPMN');
  });

  it('should process container directive syntax :::bpmn{src="file.bpmn"}', async () => {
    const markdown = `
# Test Document

:::bpmn{src="test-workflow.bpmn" width="800" height="600"}
:::

Some content after.
    `;

    const result = await parseMarkdown(markdown, { 
      baseDir: __dirname
    });
    
    // Should contain BPMN container elements
    expect(result.code).toContain('bpmn-container');
    expect(result.code).toContain('BPMN Workflow: test-workflow.bpmn');
    expect(result.code).toContain('Process ID:');
    expect(result.code).toContain('Dimensions: 800×600px');
    
    // Should not contain error messages
    expect(result.code).not.toContain('BPMN directive missing');
    expect(result.code).not.toContain('Error processing BPMN');
  });

  it('should handle missing src attribute gracefully', async () => {
    const markdownLeaf = `::bpmn{width="400"}`;
    const markdownContainer = `:::bpmn{width="400"}\n:::`;

    const resultLeaf = await parseMarkdown(markdownLeaf);
    const resultContainer = await parseMarkdown(markdownContainer);
    
    // Both should contain error message about missing src
    expect(resultLeaf.code).toContain('BPMN directive missing required "src" attribute');
    expect(resultContainer.code).toContain('BPMN directive missing required "src" attribute');
  });

  it('should handle non-existent BPMN files gracefully', async () => {
    const markdownLeaf = `::bpmn{src="nonexistent.bpmn"}`;
    const markdownContainer = `:::bpmn{src="nonexistent.bpmn"}\n:::`;

    const resultLeaf = await parseMarkdown(markdownLeaf);
    const resultContainer = await parseMarkdown(markdownContainer);
    
    // Both should contain error message about file not found
    expect(resultLeaf.code).toContain('BPMN processing failed');
    expect(resultContainer.code).toContain('BPMN processing failed');
  });

  it('should preserve attributes correctly for both syntaxes', async () => {
    const attributes = {
      src: 'test-workflow.bpmn',
      width: '1200',
      height: '900',
      theme: 'ornl'
    };

    const attrString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    const markdownLeaf = `::bpmn{${attrString}}`;
    const markdownContainer = `:::bpmn{${attrString}}\n:::`;

    const resultLeaf = await parseMarkdown(markdownLeaf, { 
      baseDir: __dirname
    });
    const resultContainer = await parseMarkdown(markdownContainer, { 
      baseDir: __dirname
    });
    
    // Both should contain the custom dimensions
    expect(resultLeaf.code).toContain('Dimensions: 1200×900px');
    expect(resultContainer.code).toContain('Dimensions: 1200×900px');
    
    // Both should reference the correct file
    expect(resultLeaf.code).toContain('test-workflow.bpmn');
    expect(resultContainer.code).toContain('test-workflow.bpmn');
  });
});
