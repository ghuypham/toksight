import type { ParsedMessage } from './types';

/** Line types that should be skipped during parsing — not actual messages */
const SKIP_TYPES = new Set(['permission-mode', 'file-history-snapshot', 'attachment', 'system']);

/**
 * Parse a single JSONL line into a ParsedMessage.
 * Returns null for non-message lines, invalid JSON, or empty input.
 */
export function parseJsonlLine(line: string): ParsedMessage | null {
  if (!line.trim()) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(line);
  } catch {
    return null;
  }

  const type = data.type as string;
  if (SKIP_TYPES.has(type)) return null;
  if (type !== 'user' && type !== 'assistant') return null;

  const message = data.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const result: ParsedMessage = {
    uuid: data.uuid as string,
    parentUuid: (data.parentUuid as string) ?? null,
    type: type as 'user' | 'assistant',
    timestamp: data.timestamp as string,
    sessionId: (data.sessionId as string) ?? '',
  };

  if (type === 'assistant') {
    result.model = message.model as string | undefined;

    // Map snake_case API fields to camelCase TokenUsage
    const rawUsage = message.usage as Record<string, number> | undefined;
    if (rawUsage) {
      result.usage = {
        inputTokens: rawUsage.input_tokens ?? 0,
        outputTokens: rawUsage.output_tokens ?? 0,
        cacheCreationTokens: rawUsage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: rawUsage.cache_read_input_tokens ?? 0,
      };
    }

    // Extract tool_use blocks from assistant content array
    const content = message.content;
    if (Array.isArray(content)) {
      const toolUses = content
        .filter((block: Record<string, unknown>) => block.type === 'tool_use')
        .map((block: Record<string, unknown>) => {
          const input = block.input as Record<string, unknown> | undefined;
          // Skill tool: extract the invoked skill name from input.skill (e.g. "superpowers:brainstorming")
          const skill = block.name === 'Skill' ? (input?.skill as string | undefined) : undefined;
          // Task tool: extract the dispatched subagent_type (e.g. "ui-ux-designer", "Explore")
          const agent = block.name === 'Task' ? (input?.subagent_type as string | undefined) : undefined;
          return {
            name: block.name as string,
            path: (input?.file_path ?? input?.path) as string | undefined,
            skill,
            agent,
          };
        });
      if (toolUses.length > 0) {
        result.toolUses = toolUses;
      }
    }
  }

  return result;
}

/**
 * Parse full JSONL file content into an array of ParsedMessages.
 * Skips non-message lines and invalid JSON lines silently.
 */
export function parseJsonlContent(content: string, sessionId: string): ParsedMessage[] {
  if (!content.trim()) return [];

  const messages: ParsedMessage[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const parsed = parseJsonlLine(line);
    if (parsed) {
      // Fall back to provided sessionId if line didn't include one
      if (!parsed.sessionId) parsed.sessionId = sessionId;
      messages.push(parsed);
    }
  }

  return messages;
}
