import { describe, expect, it, vi } from 'vitest';
import { DUSK_LEGENDS, prepareDuskLegend } from './duskLegends';

function harness() {
  const getPresets = vi.fn((): { id: string; systemPromptTailId?: string }[] => []);
  const writePrompt = vi.fn(
    async (_id: string, _content: string) =>
      ({ ok: true }) as { ok: true } | { ok: false; error: string }
  );
  const addPreset = vi.fn(() => ({ id: 'saved-role' }));
  return { getPresets, writePrompt, addPreset };
}

describe('暮色传奇预设', () => {
  it('为所选传奇写入独立提示正文，不替换会话的基础提示', async () => {
    const api = harness();
    await expect(prepareDuskLegend('buzhi', api)).resolves.toBe('saved-role');
    expect(api.writePrompt).toHaveBeenCalledWith(
      DUSK_LEGENDS.buzhi.promptId,
      expect.stringContaining('不知')
    );
    expect(api.addPreset).toHaveBeenCalledExactlyOnceWith({
      name: '不知',
      skillIds: [],
      mcpServerIds: [],
      systemPromptTailId: DUSK_LEGENDS.buzhi.promptId,
    });
    expect(DUSK_LEGENDS.buzhi.promptId).not.toBe(DUSK_LEGENDS.yunshen.promptId);
  });

  it('复用已保存的传奇预设，不覆盖用户之后调整的内容', async () => {
    const api = harness();
    api.getPresets.mockReturnValue([
      { id: 'existing', systemPromptTailId: DUSK_LEGENDS.yunshen.promptId },
    ]);
    await expect(prepareDuskLegend('yunshen', api)).resolves.toBe('existing');
    expect(api.writePrompt).not.toHaveBeenCalled();
    expect(api.addPreset).not.toHaveBeenCalled();
  });

  it('提示词写入失败时不保存一个失效预设', async () => {
    const api = harness();
    api.writePrompt.mockResolvedValueOnce({ ok: false, error: 'write failed' });
    await expect(prepareDuskLegend('buzhi', api)).rejects.toThrow('write failed');
    expect(api.addPreset).not.toHaveBeenCalled();
  });
});
