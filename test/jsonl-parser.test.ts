import { describe, it, expect } from 'vitest';
import { parseJsonlLine, parseJsonlContent } from '../src/jsonl-parser';

const makeAssistantLine = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  parentUuid: 'parent-1',
  type: 'assistant',
  uuid: 'msg-1',
  timestamp: '2026-04-15T10:00:00.000Z',
  sessionId: 'session-1',
  message: {
    role: 'assistant',
    model: 'claude-sonnet-4-6',
    usage: {
      input_tokens: 1000,
      output_tokens: 200,
      cache_creation_input_tokens: 500,
      cache_read_input_tokens: 3000,
    },
    content: [{ type: 'text', text: 'Hello' }],
  },
  ...overrides,
});

const makeUserLine = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  parentUuid: null,
  type: 'user',
  uuid: 'msg-0',
  timestamp: '2026-04-15T09:59:00.000Z',
  sessionId: 'session-1',
  message: {
    role: 'user',
    content: 'Hello Claude',
  },
  ...overrides,
});

describe('parseJsonlLine', () => {
  it('parses assistant message with usage', () => {
    const result = parseJsonlLine(makeAssistantLine());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('assistant');
    expect(result!.model).toBe('claude-sonnet-4-6');
    expect(result!.usage).toEqual({
      inputTokens: 1000,
      outputTokens: 200,
      cacheCreationTokens: 500,
      cacheReadTokens: 3000,
    });
  });

  it('parses user message', () => {
    const result = parseJsonlLine(makeUserLine());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('user');
    expect(result!.parentUuid).toBeNull();
  });

  it('skips permission-mode lines', () => {
    const line = JSON.stringify({ type: 'permission-mode', permissionMode: 'default' });
    expect(parseJsonlLine(line)).toBeNull();
  });

  it('skips file-history-snapshot lines', () => {
    const line = JSON.stringify({ type: 'file-history-snapshot', snapshot: {} });
    expect(parseJsonlLine(line)).toBeNull();
  });

  it('skips attachment lines', () => {
    const line = JSON.stringify({ type: 'attachment', attachment: {} });
    expect(parseJsonlLine(line)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseJsonlLine('not json')).toBeNull();
  });

  it('returns null for empty line', () => {
    expect(parseJsonlLine('')).toBeNull();
  });

  it('extracts tool uses from assistant content', () => {
    const line = makeAssistantLine({
      message: {
        role: 'assistant',
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        content: [
          { type: 'tool_use', name: 'Read', input: { file_path: '/src/index.ts' } },
          { type: 'tool_use', name: 'Edit', input: { file_path: '/src/app.ts' } },
          { type: 'text', text: 'Done' },
        ],
      },
    });
    const result = parseJsonlLine(line);
    expect(result!.toolUses).toEqual([
      { name: 'Read', path: '/src/index.ts' },
      { name: 'Edit', path: '/src/app.ts' },
    ]);
  });

  it('extracts Task subagent_type as agent field', () => {
    const line = makeAssistantLine({
      message: {
        role: 'assistant',
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        content: [
          { type: 'tool_use', name: 'Task', input: { subagent_type: 'ui-ux-designer', description: 'audit' } },
          { type: 'tool_use', name: 'Task', input: { subagent_type: 'Explore', description: 'find files' } },
          { type: 'tool_use', name: 'Read', input: { file_path: '/x.ts' } },
        ],
      },
    });
    const result = parseJsonlLine(line);
    const tasks = result!.toolUses!.filter(t => t.name === 'Task');
    expect(tasks).toHaveLength(2);
    expect(tasks[0].agent).toBe('ui-ux-designer');
    expect(tasks[1].agent).toBe('Explore');
    // Non-Task tools must not carry agent field
    const read = result!.toolUses!.find(t => t.name === 'Read')!;
    expect(read.agent).toBeUndefined();
  });

  it('extracts Skill name as skill field', () => {
    const line = makeAssistantLine({
      message: {
        role: 'assistant',
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        content: [
          { type: 'tool_use', name: 'Skill', input: { skill: 'superpowers:brainstorming' } },
        ],
      },
    });
    const result = parseJsonlLine(line);
    expect(result!.toolUses![0].skill).toBe('superpowers:brainstorming');
    expect(result!.toolUses![0].agent).toBeUndefined();
  });
});

describe('parseJsonlContent', () => {
  it('parses multiple lines and filters non-messages', () => {
    const content = [
      JSON.stringify({ type: 'permission-mode', permissionMode: 'default' }),
      makeUserLine(),
      makeAssistantLine(),
    ].join('\n');

    const messages = parseJsonlContent(content, 'session-1');
    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe('user');
    expect(messages[1].type).toBe('assistant');
  });

  it('handles empty content', () => {
    expect(parseJsonlContent('', 'session-1')).toEqual([]);
  });
});
