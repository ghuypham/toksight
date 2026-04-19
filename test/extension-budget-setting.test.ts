import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('toksight.budget5h setting', () => {
  it('package.json declares budget5h as number with default 0', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const props = (pkg as { contributes: { configuration: { properties: Record<string, { type: string; default: number; minimum: number }> } } })
      .contributes.configuration.properties;
    const prop = props['toksight.budget5h'];
    expect(prop).toBeDefined();
    expect(prop.type).toBe('number');
    expect(prop.default).toBe(0);
    expect(prop.minimum).toBe(0);
  });
});
