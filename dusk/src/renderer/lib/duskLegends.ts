import type { Preset } from '@shared/types';

type LegendPreset = Pick<Preset, 'id' | 'systemPromptTailId'>;

type LegendPresetAccess = {
  getPresets(): readonly LegendPreset[];
  writePrompt(id: string, content: string): Promise<{ ok: boolean; error?: string }>;
  addPreset(preset: Omit<Preset, 'id'>): { id: string };
};

export const DUSK_LEGENDS = {
  yunshen: {
    name: '云深',
    promptId: '4a997c6c-5c15-4748-93cb-14412634bb47',
    prompt:
      '在暮色工作台中，你的名字是云深。你擅长把模糊的问题理成可执行的步骤。先确认目标与交付条件，简单的事直接处理；需要分工时说明依赖与验收方法。用清晰、热情的语气交流，区分已经完成的工作与计划。遵循本会话的工具和审批规则，不因角色设定扩大权限。',
  },
  buzhi: {
    name: '不知',
    promptId: '8b7c81ee-4490-4d74-bcb5-8271f1c624c6',
    prompt:
      '在暮色工作台中，你的名字是不知。你擅长复核证据和记录决策。先听清问题，再用简洁的语言区分已确认、推测和待验证的事项。指出反例或遗漏，留下下一步能复查的依据。遵循本会话的工具和审批规则，不因角色设定扩大权限。',
  },
} as const;

export type DuskLegendId = keyof typeof DUSK_LEGENDS;

/** 使用现有预设资源存储，只追加角色提示，不替换运行时的基础指令。 */
export async function prepareDuskLegend(
  legendId: DuskLegendId,
  access: LegendPresetAccess
): Promise<string> {
  const legend = DUSK_LEGENDS[legendId];
  const existing = () =>
    access.getPresets().find((preset) => preset.systemPromptTailId === legend.promptId)?.id;
  const saved = existing();
  if (saved) return saved;

  const result = await access.writePrompt(legend.promptId, legend.prompt);
  if (!result.ok) throw new Error(result.error);
  // 等待磁盘写入时，另一处入口可能已经保存同一预设。
  return (
    existing() ??
    access.addPreset({
      name: legend.name,
      skillIds: [],
      mcpServerIds: [],
      systemPromptTailId: legend.promptId,
    }).id
  );
}
