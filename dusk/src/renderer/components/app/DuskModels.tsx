import { providerDedupeKey } from '@shared/providerIdentity';
import type { ModelEntry, ModelProvider, ProviderApiConfig } from '@shared/types';
import { ArrowRight, Download, Search } from 'lucide-react';
import { useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { flushElectronPersist } from '@/stores/settings/storage';
import { type WindowChromeKind, WindowControls } from './WindowChrome';
import './duskModels.css';

const EMPTY = {
  id: '',
  name: '',
  baseUrl: '',
  api: 'openai-completions',
  apiKey: '',
  enabled: true,
  models: [],
} satisfies ModelProvider;

export function DuskModels({
  chromeKind,
  onBack,
  onImages,
}: {
  chromeKind: WindowChromeKind;
  onBack: () => void;
  onImages: () => void;
}) {
  const providers = useSettingsStore((s) => s.providers);
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const [draft, setDraft] = useState<ModelProvider>(() => {
    const initial =
      providers.find((provider) => provider.id === defaultModel?.providerId) ?? providers[0];
    return initial ? { ...initial, apiKey: '' } : EMPTY;
  });
  const [primaryModel, setPrimaryModel] = useState(defaultModel?.modelId ?? '');
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();
  const [pending, setPending] = useState(false);
  const saved = providers.find((p) => p.id === draft.id);
  const supported =
    !draft.oauthAccountKey && (draft.api === 'openai-completions' || draft.api === 'ollama');
  const sameEndpoint = saved?.baseUrl === draft.baseUrl.trim() && saved.api === draft.api;
  const enabled = draft.models.filter((model) => model.enabled !== false);
  const modelId = enabled.some((model) => model.id === primaryModel)
    ? primaryModel
    : (enabled[0]?.id ?? '');
  const term = query.trim().toLocaleLowerCase();
  const rows = draft.models.filter((model) =>
    `${model.label ?? ''} ${model.id}`.toLocaleLowerCase().includes(term)
  );

  function pick(provider?: ModelProvider) {
    setDraft(provider ? { ...provider, apiKey: '' } : EMPTY);
    setPrimaryModel(provider?.id === defaultModel?.providerId ? (defaultModel?.modelId ?? '') : '');
    setQuery('');
    setManual('');
    setFeedback(undefined);
  }

  function change(patch: Partial<ModelProvider>) {
    setDraft((current) => ({ ...current, ...patch }));
    setFeedback(undefined);
  }

  function connection(): ProviderApiConfig {
    const baseUrl = draft.baseUrl.trim();
    const endpoint = new URL(baseUrl);
    if (
      !['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    ) {
      throw new Error('请填写有效的服务地址，不要把凭据写入地址。');
    }
    const apiKey =
      draft.apiKey.trim() ||
      (sameEndpoint ? saved?.apiKey : '') ||
      (draft.api === 'ollama' ? 'ollama' : '');
    if (!apiKey) throw new Error('请填写 API 密钥。');
    return {
      api: draft.api,
      apiKey,
      baseUrl,
      ...(sameEndpoint && saved?.headers ? { headers: saved.headers } : {}),
    };
  }

  async function perform(action: () => Promise<void>) {
    setPending(true);
    setFeedback(undefined);
    try {
      await action();
    } catch (cause) {
      setFeedback({
        ok: false,
        text:
          cause instanceof TypeError
            ? '请填写有效的服务地址。'
            : cause instanceof Error
              ? cause.message
              : '暂时无法完成操作。',
      });
    } finally {
      setPending(false);
    }
  }

  function discover() {
    void perform(async () => {
      const result = await window.electronAPI.providers.listModels(connection());
      if (!result.ok) throw new Error('未能获取上游模型，请检查地址和凭据。');
      setDraft((current) => {
        const seen = new Set(current.models.map((entry) => entry.id));
        const added: ModelEntry[] = [];
        for (const entry of result.models) {
          if (!entry.id || seen.has(entry.id)) continue;
          seen.add(entry.id);
          added.push({
            id: entry.id,
            enabled: false,
            contextWindow: entry.contextWindow,
            maxTokens: entry.maxTokens,
          });
        }
        return { ...current, models: [...current.models, ...added] };
      });
      setQuery('');
      setFeedback({ ok: true, text: `已获取 ${result.models.length} 个模型。` });
    });
  }

  function save() {
    void perform(async () => {
      const config = connection();
      const settings = useSettingsStore.getState();
      const id = draft.id || crypto.randomUUID();
      const { id: _old, ...value } = draft;
      const attributes = {
        ...value,
        ...config,
        name: draft.name.trim(),
        catalogId: saved?.catalogId ?? '__custom',
        headers: config.headers,
      };
      const key = providerDedupeKey(attributes);
      if (
        settings.providers.some(
          (provider) => provider.id !== id && providerDedupeKey(provider) === key
        )
      ) {
        throw new Error('此服务已存在，请在左侧选择后编辑。');
      }
      if (saved) settings.updateProvider(id, attributes);
      else settings.addProviders([{ id, ...attributes }]);
      if (!defaultModel && modelId) settings.setDefaultModel({ providerId: id, modelId });
      await flushElectronPersist();
      setDraft((entry) => ({ ...entry, id, apiKey: '', baseUrl: config.baseUrl }));
      setFeedback({
        ok: true,
        text: `已保存。此服务有 ${enabled.length} 个模型出现在会话选择器中。`,
      });
    });
  }

  return (
    <div className="dusk-models" data-dusk="models">
      <header className="dusk-start-header drag-region" data-enso="title-bar">
        <span>模型设置 / 对话模型</span>
        <WindowControls kind={chromeKind} />
      </header>
      <div className="dusk-models-content">
        <h1>模型设置</h1>
        <p className="dusk-models-summary">
          从同一个服务启用多个模型。会话选择器只显示已启用的对话模型。
        </p>
        <nav className="dusk-models-tabs" aria-label="模型类型">
          <span aria-current="page">对话模型</span>
          <button type="button" onClick={onImages}>
            生图模型
          </button>
        </nav>
        <div className="dusk-models-grid">
          <section aria-label="对话服务">
            <div className="dusk-models-row">
              <h2>对话服务</h2>
              <button
                type="button"
                className="dusk-models-outline"
                disabled={pending}
                onClick={() => pick()}
              >
                添加服务
              </button>
            </div>
            <ul className="dusk-models-services">
              {providers.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-pressed={draft.id === entry.id}
                    disabled={pending}
                    onClick={() => pick(entry)}
                  >
                    <strong>{entry.name}</strong>
                    {defaultModel?.providerId === entry.id && <span>工作区默认</span>}
                    <small>
                      {entry.models.filter((model) => model.enabled !== false).length} 个模型已启用
                    </small>
                  </button>
                </li>
              ))}
            </ul>
            {!providers.length && <p className="dusk-models-summary">还没有配置服务。</p>}
            <button type="button" className="dusk-models-back" onClick={onBack}>
              返回会话 <ArrowRight size={14} aria-hidden="true" />
            </button>
          </section>
          <form
            className="dusk-models-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (supported && !pending) save();
            }}
          >
            <h2>{saved?.name ?? '新对话服务'}</h2>
            <fieldset disabled={pending || !supported}>
              <div className="dusk-models-fields">
                <label>
                  服务名称
                  <input
                    required
                    maxLength={30}
                    value={draft.name}
                    onChange={(event) => change({ name: event.target.value })}
                  />
                </label>
                <label>
                  服务地址
                  <input
                    required
                    type="url"
                    placeholder="https://api.example.com/v1"
                    value={draft.baseUrl}
                    onChange={(event) => change({ baseUrl: event.target.value, apiKey: '' })}
                  />
                </label>
                <label>
                  接入方式
                  <select
                    value={supported ? draft.api : 'fixed'}
                    onChange={(event) =>
                      change({
                        api: event.target.value === 'ollama' ? 'ollama' : 'openai-completions',
                        apiKey: '',
                        models: [],
                      })
                    }
                  >
                    {!supported && <option value="fixed">已有服务</option>}
                    <option value="openai-completions">兼容服务</option>
                    <option value="ollama">本地服务</option>
                  </select>
                </label>
              </div>
              {supported && draft.api !== 'ollama' && (
                <label className="dusk-models-key">
                  API 密钥
                  <input
                    type="password"
                    autoComplete="off"
                    value={draft.apiKey}
                    placeholder={sameEndpoint && saved?.apiKey ? '已保存 · 不填则保留' : ''}
                    onChange={(event) => change({ apiKey: event.target.value })}
                  />
                </label>
              )}
            </fieldset>
            <section className="dusk-models-section" aria-label="上游模型">
              <div className="dusk-models-row">
                <div>
                  <h3>上游模型</h3>
                  <p>可勾选多项，保存后在会话中可用。</p>
                </div>
                <button
                  type="button"
                  className="dusk-models-outline"
                  disabled={!supported || pending}
                  onClick={discover}
                >
                  <Download size={16} aria-hidden="true" />
                  从上游获取模型
                </button>
              </div>
              {draft.models.length > 0 && (
                <div className="dusk-models-catalog">
                  <label className="dusk-models-search">
                    <Search size={16} aria-hidden="true" />
                    <input
                      type="search"
                      aria-label="搜索上游模型"
                      placeholder="按名称或标识搜索"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    <small>已勾选 {enabled.length} 项</small>
                  </label>
                  <ul>
                    {rows.map((model) => (
                      <li key={model.id}>
                        <label>
                          <input
                            type="checkbox"
                            disabled={!supported || pending}
                            checked={model.enabled !== false}
                            onChange={(event) =>
                              change({
                                models: draft.models.map((entry) =>
                                  entry.id === model.id
                                    ? { ...entry, enabled: event.target.checked }
                                    : entry
                                ),
                              })
                            }
                          />
                          <span>{model.label ?? model.id}</span>
                        </label>
                      </li>
                    ))}
                    {rows.length === 0 && <li>未找到匹配模型。</li>}
                  </ul>
                </div>
              )}
              {supported && (
                <details>
                  <summary>手工添加模型</summary>
                  <div className="dusk-models-row">
                    <label>
                      模型标识
                      <input
                        maxLength={100}
                        value={manual}
                        onChange={(event) => setManual(event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="dusk-models-outline"
                      disabled={
                        pending ||
                        !manual.trim() ||
                        draft.models.some((item) => item.id === manual.trim())
                      }
                      onClick={() => {
                        change({ models: [...draft.models, { id: manual.trim(), enabled: true }] });
                        setManual('');
                      }}
                    >
                      添加到启用项
                    </button>
                  </div>
                </details>
              )}
            </section>
            <div className="dusk-models-section dusk-models-row">
              <label>
                此服务的默认模型
                <select value={modelId} onChange={(event) => setPrimaryModel(event.target.value)}>
                  {!enabled.length && <option value="">先勾选模型</option>}
                  {enabled.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label ?? item.id}
                    </option>
                  ))}
                </select>
              </label>
              <div className="dusk-models-actions">
                <button
                  type="button"
                  className="dusk-models-outline"
                  disabled={
                    pending ||
                    !saved?.models.some((item) => item.id === modelId && item.enabled !== false)
                  }
                  onClick={() => {
                    useSettingsStore.getState().setDefaultModel({ providerId: draft.id, modelId });
                    setFeedback({ ok: true, text: '已设为工作区默认服务。' });
                  }}
                >
                  设为工作区默认
                </button>
                <button
                  type="submit"
                  className="dusk-welcome-primary"
                  disabled={!supported || pending || !draft.name.trim() || !draft.baseUrl.trim()}
                >
                  保存已启用模型
                </button>
              </div>
            </div>
            {feedback && (
              <p role="status" className={feedback.ok ? 'dusk-models-summary' : 'dusk-start-error'}>
                {feedback.text}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
