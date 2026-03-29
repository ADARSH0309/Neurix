import { describe, it, expect } from 'vitest';
import { matchUserInputToTool, parseUserIntent, generateToolsHelpMessage } from './mcp-api';
import type { McpTool } from './mcp-api';

const makeTool = (name: string, props: Record<string, any> = {}, required: string[] = []): McpTool => ({
  name,
  description: `Tool: ${name}`,
  inputSchema: {
    type: 'object',
    properties: props,
    required,
  },
});

describe('matchUserInputToTool', () => {
  const tools: McpTool[] = [
    makeTool('list_files', {}, []),
    makeTool('search_files', { query: { type: 'string' } }, ['query']),
    makeTool('send_message', { to: { type: 'string' }, body: { type: 'string' } }, ['to', 'body']),
    makeTool('create_task', { title: { type: 'string' }, taskListName: { type: 'string' } }, ['title']),
  ];

  it('matches exact tool name with underscores', () => {
    const result = matchUserInputToTool('list_files', tools);
    expect(result.tool?.name).toBe('list_files');
  });

  it('matches tool name with spaces', () => {
    const result = matchUserInputToTool('list files', tools);
    expect(result.tool?.name).toBe('list_files');
  });

  it('is case-insensitive', () => {
    const result = matchUserInputToTool('List Files', tools);
    expect(result.tool?.name).toBe('list_files');
  });

  it('extracts argument from remaining input', () => {
    const result = matchUserInputToTool('search files my document', tools);
    expect(result.tool?.name).toBe('search_files');
    expect(result.args['query']).toBe('my document');
  });

  it('reports missing required arguments', () => {
    const result = matchUserInputToTool('send message', tools);
    expect(result.tool?.name).toBe('send_message');
    expect(result.missingRequired).toContain('to');
    expect(result.missingRequired).toContain('body');
  });

  it('fills first required string arg from input', () => {
    const result = matchUserInputToTool('send message hello@test.com', tools);
    expect(result.args['to']).toBe('hello@test.com');
    expect(result.missingRequired).toContain('body');
  });

  it('handles "in" pattern for taskListName', () => {
    const result = matchUserInputToTool('create task Buy groceries in Shopping', tools);
    expect(result.tool?.name).toBe('create_task');
    expect(result.args['title']).toBe('Buy groceries');
    expect(result.args['taskListName']).toBe('Shopping');
  });

  it('returns null for no match', () => {
    const result = matchUserInputToTool('something completely different', tools);
    expect(result.tool).toBeNull();
  });

  it('matches by keyword overlap (70% threshold)', () => {
    const result = matchUserInputToTool('search my files please', tools);
    expect(result.tool?.name).toBe('search_files');
  });
});

describe('parseUserIntent', () => {
  it('detects list intent', () => {
    expect(parseUserIntent('list my files').action).toBe('list');
  });

  it('detects search intent', () => {
    const result = parseUserIntent('search for budget report');
    expect(result.action).toBe('search');
  });

  it('detects help intent', () => {
    expect(parseUserIntent('help').action).toBe('help');
    expect(parseUserIntent('?').action).toBe('help');
    expect(parseUserIntent('what can you do').action).toBe('help');
  });

  it('returns unknown for form-related queries', () => {
    expect(parseUserIntent('list my forms').action).toBe('unknown');
  });

  it('returns unknown for unrecognized input', () => {
    expect(parseUserIntent('xyzabc').action).toBe('unknown');
  });
});

describe('generateToolsHelpMessage', () => {
  it('generates help with tool names', () => {
    const tools: McpTool[] = [
      makeTool('list_files'),
      makeTool('search_files'),
    ];
    const msg = generateToolsHelpMessage(tools, 'Google Drive');
    expect(msg).toContain('Google Drive');
    expect(msg).toContain('list files');
    expect(msg).toContain('search files');
  });

  it('handles empty tools', () => {
    const msg = generateToolsHelpMessage([], 'Test');
    expect(msg).toContain('No tools available');
  });
});
