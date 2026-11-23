export const reasoningLabels = {
  off: '关闭', minimal: '极低', low: '低', medium: '中', high: '高', xhigh: '极高',
};
export type Reasoning = keyof typeof reasoningLabels;
export type ChatModel = { identifier: string; name: string; levels: Reasoning[]; defaultLevel?: Reasoning };

// Illustrative capabilities for design review only; real levels come from service metadata or a model registry.
export const upstreamCatalog: ChatModel[] = [
  { identifier: 'gpt-4o-mini', name: 'GPT‑4o mini', levels: [] },
  { identifier: 'gpt-5-mini', name: 'GPT‑5 mini', levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'medium' },
  { identifier: 'gpt-5.2', name: 'GPT‑5.2', levels: ['off', 'low', 'medium', 'high', 'xhigh'], defaultLevel: 'medium' },
  { identifier: 'deepseek-reasoner', name: 'DeepSeek Reasoner', levels: ['off', 'high'], defaultLevel: 'high' },
  { identifier: 'qwen2.5:7b', name: 'Qwen2.5 7B', levels: [] },
];
