import { useState } from 'react';
import { Link } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { field, primary, secondary, SettingsPage } from './SettingsParts';
import { ModelTabs } from './ImageModels';
import type { ModelConfig } from './demo';
import { upstreamCatalog } from './chat-models';
import type { ChatModel } from './chat-models';

const blank: ModelConfig = { id: '', name: '', protocol: 'compatible', endpoint: '', identifier: '', verified: false, enabled: [] };

type Feedback = { ok: boolean; text: string };

function serviceCatalog(service: ModelConfig) {
  return upstreamCatalog.filter((model) => service.protocol === 'local' ? model.identifier.includes(':') : !model.identifier.includes(':'));
}

export function Models() {
  const { models, defaultModel, setDefaultModel, saveModel } = useWorkspace();
  const [value, setValue] = useState(() => models.find((item) => item.id === defaultModel) ?? models[0] ?? blank);
  const [listed, setListed] = useState<ChatModel[]>(() => value.verified ? serviceCatalog(value) : []);
  const [sampleKey, setSampleKey] = useState(value.verified);
  const [result, setResult] = useState<Feedback>();
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState('');
  const saved = models.find((item) => item.id === value.id);
  const all = [...new Map([...listed, ...value.enabled].map((model) => [model.identifier, model])).values()];
  const visible = all.filter((model) => `${model.name} ${model.identifier}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));

  function select(model: ModelConfig) {
    setValue(model); setListed(model.verified ? serviceCatalog(model) : []); setSampleKey(model.verified);
    setQuery(''); setManual(''); setResult(undefined);
  }
  function change(patch: Partial<ModelConfig>) {
    setValue((state) => ({ ...state, ...patch })); setResult(undefined);
  }
  function discover() {
    try {
      const url = new URL(value.endpoint.trim());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    } catch { setResult({ ok: false, text: '请填写有效的服务地址，不要把凭据写入地址。' }); return; }
    if (value.protocol === 'compatible' && !sampleKey) { setResult({ ok: false, text: '启用演示凭据后再获取上游模型。' }); return; }
    const rows = serviceCatalog(value);
    setListed(rows); setQuery(''); change({ verified: true });
    setResult({ ok: true, text: `已加载 ${rows.length} 个示例模型。` });
  }
  function toggle(model: ChatModel) {
    const enabled = value.enabled.some((item) => item.identifier === model.identifier)
      ? value.enabled.filter((item) => item.identifier !== model.identifier) : [...value.enabled, model];
    change({ enabled, identifier: enabled.some((item) => item.identifier === value.identifier) ? value.identifier : enabled[0]?.identifier ?? '' });
  }
  function save() {
    if (!value.name.trim() || !value.endpoint.trim()) return;
    const next = { ...value, id: value.id || crypto.randomUUID(), name: value.name.trim(), endpoint: value.endpoint.trim() };
    saveModel(next); setValue(next);
    setResult({ ok: true, text: `已保存。此服务有 ${next.enabled.length} 个模型出现在会话选择器中。` });
  }

  return (
    <SettingsPage breadcrumb="模型设置 / 对话模型" title="模型设置" summary="从同一个服务启用多个模型。会话选择器只显示已启用的对话模型。">
      <ModelTabs active="chat" />
      <div className="grid grid-cols-[246px_minmax(0,1fr)] items-start gap-7">
        <section aria-label="对话服务">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">对话服务</h2>
            <button type="button" className={secondary} onClick={() => select(blank)}>添加服务</button>
          </div>
          <ul className="space-y-1.5">
            {models.map((item) => (
              <li key={item.id}>
                <button type="button" aria-pressed={item.id === value.id} onClick={() => select(item)} className={`block min-h-15 w-full rounded-control px-3 py-2 text-left ${item.id === value.id ? 'bg-raised' : 'hover:bg-panel'}`}>
                  <span className="flex justify-between gap-2">
                    <span className="truncate font-semibold">{item.name}</span>
                    {item.id === defaultModel && <span className="shrink-0 text-xs text-primary">工作区默认</span>}
                  </span>
                  <span className="mt-1 block text-xs text-quiet">{item.enabled.length} 个模型已启用</span>
                </button>
              </li>
            ))}
          </ul>
          {!models.length && <p className="py-2 text-sm text-muted">还没有配置服务。</p>}
          <Link to="/" className="mt-5 inline-flex items-center gap-1.5 px-2 text-xs text-primary hover:underline">返回会话<span className="icon-[lucide--arrow-right] size-3.5" aria-hidden="true" /></Link>
        </section>
        <form className="rounded-control bg-panel p-5" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[26px] font-semibold">{saved?.name ?? '新对话服务'}</h2>
            <span className="text-xs text-quiet">示例数据 · 不连接真实服务</span>
          </div>
          <div className="mt-3 grid grid-cols-[minmax(0,1.55fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3">
            <label>服务名称<input required className={field} maxLength={30} value={value.name} onChange={(e) => change({ name: e.target.value })} /></label>
            <label>服务地址<input required type="url" className={field} placeholder="https://api.example.com/v1" value={value.endpoint} onChange={(e) => { setListed([]); change({ endpoint: e.target.value, verified: false }); }} /></label>
            <label>接入方式<select className={field} value={value.protocol} onChange={(e) => { setListed([]); change({ protocol: e.target.value === 'local' ? 'local' : 'compatible', enabled: [], identifier: '', verified: false }); }}>
              <option value="compatible">兼容服务</option>
              <option value="local">本地服务</option>
            </select></label>
          </div>
          {value.protocol === 'compatible' && <label className="mt-3 flex w-fit items-center gap-2 text-xs text-muted"><input type="checkbox" className="size-4 accent-primary" checked={sampleKey} onChange={(e) => setSampleKey(e.target.checked)} />使用演示凭据</label>}
          <section className="mt-5 border-t border-line/65 pt-4" aria-label="上游模型">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">上游模型</h3>
                <p className="mt-1 text-xs text-quiet">可勾选多项，保存后在会话中可用。</p>
              </div>
              <button type="button" className={secondary} onClick={discover}>
                <span className="icon-[lucide--download] size-4" aria-hidden="true" />从上游获取模型
              </button>
            </div>
            {!!all.length && (
              <div className="mt-3 rounded-control bg-surface px-3 py-2">
                <label className="flex items-center gap-2 border-b border-line/65 text-muted">
                  <span className="icon-[lucide--search] size-4" aria-hidden="true" />
                  <input aria-label="搜索上游模型" className="h-8 min-w-0 flex-1 bg-transparent text-xs text-surface-foreground outline-none placeholder:text-quiet" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按名称或标识搜索" />
                  <span className="text-xs text-quiet">已勾选 {value.enabled.length} 项</span>
                </label>
                <ul className="max-h-44 overflow-y-auto divide-y divide-line/55">
                  {visible.map((model) => (
                    <li key={model.identifier}>
                      <label className="flex min-h-9 cursor-pointer items-center gap-2.5 px-0.5 py-1.5">
                        <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={value.enabled.some((item) => item.identifier === model.identifier)} onChange={() => toggle(model)} />
                        <span className="min-w-0 flex-1 truncate">{model.name}</span>
                        <span className="shrink-0 text-xs text-quiet">{model.levels.length ? '支持推理档位' : '无推理档位'}</span>
                      </label>
                    </li>
                  ))}
                  {!visible.length && <li className="py-2 text-xs text-quiet">未找到匹配模型。</li>}
                </ul>
              </div>
            )}
            <details className="mt-2 text-xs text-muted">
              <summary className="w-fit cursor-pointer hover:text-primary">手工添加模型</summary>
              <div className="mt-2 flex items-end gap-2">
                <label className="min-w-0 flex-1">模型标识<input maxLength={100} className={field} value={manual} onChange={(e) => setManual(e.target.value)} /></label>
                <button type="button" className={secondary} disabled={!manual.trim() || value.enabled.some((item) => item.identifier === manual.trim())} onClick={() => { toggle({ identifier: manual.trim(), name: manual.trim(), levels: [] }); setManual(''); }}>添加到启用项</button>
              </div>
            </details>
          </section>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-line/65 pt-3">
            <label className="min-w-0 text-xs text-muted">此服务的默认模型
              <select className={field} value={value.identifier} onChange={(e) => change({ identifier: e.target.value })}>
                {!value.enabled.length && <option value="">先勾选模型</option>}
                {value.enabled.map((item) => <option key={item.identifier} value={item.identifier}>{item.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" className={secondary} disabled={!saved?.enabled.length || defaultModel === value.id} onClick={() => { setDefaultModel(value.id); setResult({ ok: true, text: '已设为工作区默认服务。' }); }}>设为工作区默认</button>
              <button type="submit" className={primary} disabled={!value.name.trim() || !value.endpoint.trim()}>保存已启用模型</button>
            </div>
          </div>
          {result && <p role="status" className={`mt-2 text-xs ${result.ok ? 'text-cool' : 'text-rose'}`}>{result.text}</p>}
        </form>
      </div>
    </SettingsPage>
  );
}
