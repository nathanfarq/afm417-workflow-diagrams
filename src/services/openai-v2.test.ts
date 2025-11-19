/**
 * Tests for openai-v2 service
 * Focus on JSON extraction and tag parsing
 */

import { describe, it, expect } from 'vitest';
import { extractJSON } from './openai-v2';

describe('extractJSON', () => {
  it('should extract JSON with <UPDATED> tag', () => {
    const content = `Here's the updated process:

\`\`\`json <UPDATED>
{
  "processName": "Test Process",
  "processId": "123",
  "lastUpdated": "2025-11-18T00:00:00Z",
  "actors": [],
  "steps": [],
  "decisions": [],
  "controls": [],
  "risks": [],
  "flows": []
}
\`\`\`

Does this look correct?`;

    const { json, updated } = extractJSON(content);

    expect(json).not.toBeNull();
    expect(json?.processName).toBe('Test Process');
    expect(updated).toBe(true);
  });

  it('should detect <UNCHANGED> tag', () => {
    const content = `I understand. <UNCHANGED>

Let me ask a few clarifying questions...`;

    const { json, updated } = extractJSON(content);

    expect(json).toBeNull();
    expect(updated).toBe(false);
  });

  it('should handle JSON without explicit tag', () => {
    const content = `\`\`\`json
{
  "processName": "Test Process",
  "processId": "123",
  "lastUpdated": "2025-11-18T00:00:00Z",
  "actors": [],
  "steps": [],
  "decisions": [],
  "controls": [],
  "risks": [],
  "flows": []
}
\`\`\``;

    const { json, updated } = extractJSON(content);

    expect(json).not.toBeNull();
    // Should default to updated=true when JSON exists without explicit tag
    expect(updated).toBe(true);
  });

  it('should return null for malformed JSON', () => {
    const content = `\`\`\`json
{
  "processName": "Test",
  "invalid": json here
}
\`\`\``;

    const { json } = extractJSON(content);

    expect(json).toBeNull();
  });

  it('should attempt auto-repair for trailing commas', () => {
    const content = `\`\`\`json
{
  "processName": "Test Process",
  "processId": "123",
  "lastUpdated": "2025-11-18T00:00:00Z",
  "actors": [],
  "steps": [],
  "decisions": [],
  "controls": [],
  "risks": [],
  "flows": [],
}
\`\`\``;

    const { json } = extractJSON(content);

    // Auto-repair should fix the trailing comma
    expect(json).not.toBeNull();
    expect(json?.processName).toBe('Test Process');
  });

  it('should validate schema structure', () => {
    const content = `\`\`\`json
{
  "processName": "Test",
  "missingRequiredFields": true
}
\`\`\``;

    const { json } = extractJSON(content);

    // Should return null because it doesn't match ProcessSchema
    expect(json).toBeNull();
  });

  it('should handle multiple code blocks and use first JSON', () => {
    const content = `Here's the process:

\`\`\`json <UPDATED>
{
  "processName": "First Process",
  "processId": "123",
  "lastUpdated": "2025-11-18T00:00:00Z",
  "actors": [],
  "steps": [],
  "decisions": [],
  "controls": [],
  "risks": [],
  "flows": []
}
\`\`\`

And here's some other code:

\`\`\`javascript
console.log("test");
\`\`\``;

    const { json, updated } = extractJSON(content);

    expect(json).not.toBeNull();
    expect(json?.processName).toBe('First Process');
    expect(updated).toBe(true);
  });

  it('should handle newlines in JSON gracefully', () => {
    const content = `\`\`\`json
{
  "processName": "Test Process",
  "processId": "123",
  "lastUpdated": "2025-11-18T00:00:00Z",
  "actors": [
    {
      "id": "test",
      "name": "Test Actor"
    }
  ],
  "steps": [],
  "decisions": [],
  "controls": [],
  "risks": [],
  "flows": []
}
\`\`\``;

    const { json } = extractJSON(content);

    expect(json).not.toBeNull();
    expect(json?.actors).toHaveLength(1);
    expect(json?.actors[0].name).toBe('Test Actor');
  });

  it('should handle empty response', () => {
    const content = `I'm thinking about your process...`;

    const { json, updated } = extractJSON(content);

    expect(json).toBeNull();
    expect(updated).toBe(false);
  });
});
