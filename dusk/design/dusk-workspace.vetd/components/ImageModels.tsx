import { useState } from 'react';
import { Link } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { field, primary, secondary, SettingsPage } from './SettingsParts';
import { modeName } from './mediaPreview';
import type { ImageMode, ImageModel } from './mediaPreview';

const modes = ['text', 'edit'] as const;
const empty: ImageModel = { id: '', name: '', endpoint: '', identifier: '', modes: ['text'], checked: false };

export function ModelTabs({ active }: { active: 'chat' | 'image' }) {
  return (
    <nav className="mb-6 flex gap-6 border-b border-line/65" aria-label="模型用途">
      {([['chat', '/models', '对话模型'], ['image', '/image-models', '生图模型']] as const).map(([key, to, name]) => (
        <Link key={key} to={to} aria-current={key === active ? 'page' : undefined} className={`border-b-2 px-1 pb-2.5 ${key === active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-surface-foreground'}`}>{name}</Link>
      ))}
    </nav>
  );
}

export function ImageModels() {
  const { images } = useWorkspace();
  const [item, setItem] = useState(images.models[0] ?? empty);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();
  const [demoCredential, setDemoCredential] = useState(item.checked);
  const saved = images.models.find((model) => model.id === item.id);
  const matchesSaved = saved && ['name', 'endpoint', 'identifier', 'checked'].every((key) => saved[key as keyof ImageModel] === item[key as keyof ImageModel]) && saved.modes.join() === item.modes.join();
  const available = (mode: ImageMode) => images.available(mode);
  function patch(change: Partial<ImageModel>) {
    setItem((previous) => ({ ...previous, ...change, checked: change.checked ?? false }));
    setResult(undefined);
  }
  function issue() {
    try {
      const url = new URL(item.endpoint.trim());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '请填写有效的服务地址，不要在地址中填写凭据。';
    } catch { return '请填写有效的服务地址。'; }
    if (!item.name.trim() || !item.identifier.trim() || !item.modes.length) return '请填写配置名称和模型标识，并选择至少一种能力。';
    return '';
  }
  return (
    <SettingsPage breadcrumb="模型设置 / 生图模型" title="生图模型" summary="与对话模型分开。文生图和图生图可以选用不同的默认服务。">
      <ModelTabs active="image" />
      <div className="grid grid-cols-[286px_minmax(0,1fr)] items-start gap-8">
        <section aria-label="生图模型列表">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">图像服务</h2>
            <button type="button" className={secondary} onClick={() => { setItem(empty); setDemoCredential(false); setResult(undefined); }}>添加生图模型</button>
          </div>
          <ul className="space-y-2">
            {images.models.map((model) => (
              <li key={model.id}>
                <button type="button" aria-pressed={item.id === model.id} onClick={() => { setItem(model); setDemoCredential(model.checked); setResult(undefined); }} className={`block min-h-16 w-full rounded-control p-3 text-left ${model.id === item.id ? 'bg-raised' : 'hover:bg-panel'}`}>
                  <span className="block truncate font-semibold">{model.name}</span>
                  <span className="mt-1 block truncate text-xs text-quiet">{model.modes.map((mode) => modeName[mode]).join(' / ')} · {model.checked ? '已测试' : '未测试'}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-3 border-t border-line/65 pt-4">
            <h3 className="font-semibold">默认生图模型</h3>
            {modes.map((mode) => (
              <label key={mode} className="block text-xs text-muted">{modeName[mode]}默认
                <select className={field} value={available(mode).some((model) => model.id === images.defaults[mode]) ? images.defaults[mode] : ''} onChange={(event) => images.setDefault(mode, event.target.value)}>
                  <option disabled value="">暂无已测试模型</option>
                  {available(mode).map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>
        <form className="rounded-control bg-panel p-6" onSubmit={(event) => {
          event.preventDefault();
          const error = issue();
          if (error) { setResult({ ok: false, text: error }); return; }
          const clean = { ...item, id: item.id || crypto.randomUUID(), name: item.name.trim(), endpoint: item.endpoint.trim(), identifier: item.identifier.trim() };
          images.save(clean); setItem(clean); setResult({ ok: true, text: '已保存生图配置。' });
        }}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[26px] font-semibold">{saved?.name ?? '新图像服务'}</h2>
            <span className={`text-xs ${item.checked ? 'text-cool' : 'text-quiet'}`}>{item.checked ? '通过演示测试' : '待测试'}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label>配置名称<input className={field} required maxLength={30} value={item.name} onChange={(event) => patch({ name: event.target.value })} /></label>
            <label>模型标识<input className={field} required maxLength={80} value={item.identifier} onChange={(event) => patch({ identifier: event.target.value })} /></label>
          </div>
          <label className="mt-4 block">服务地址<input className={field} required type="url" placeholder="https://images.example.com/v1" value={item.endpoint} onChange={(event) => patch({ endpoint: event.target.value })} /></label>
          <fieldset className="mt-5 rounded-control border border-line/70 px-4 pb-3">
            <legend className="px-1">支持能力</legend>
            <div className="mt-1 flex flex-wrap gap-x-7 gap-y-2">
              {modes.map((mode) => (
                <label key={mode} className="flex items-center gap-2">
                  <input type="checkbox" className="size-4 accent-primary" checked={item.modes.includes(mode)} onChange={(event) => patch({ modes: event.target.checked ? [...item.modes, mode] : item.modes.filter((entry) => entry !== mode) })} />
                  {modeName[mode]}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-quiet">选择的模型必须支持对应模式，才能在会话或角色卡里使用。</p>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={demoCredential} onChange={(event) => { setDemoCredential(event.target.checked); patch({ checked: false }); }} />使用独立演示密钥</label>
            <span className="text-xs text-quiet">仅用于生图演示，不接收真实密钥。</span>
          </div>
          <p aria-live="polite" className={`mt-2 min-h-5 text-xs ${result?.ok ? 'text-cool' : 'text-rose'}`}>{result?.text}</p>
          <div className="mt-2 flex justify-between gap-3 border-t border-line/65 pt-4">
            <button type="button" className={secondary} onClick={() => { const validation = issue() || (!demoCredential ? '启用生图演示密钥后再测试。' : ''); patch({ checked: !validation }); setResult({ ok: !validation, text: validation || `已通过${item.modes.map((mode) => modeName[mode]).join('、')}的演示测试。` }); }}>测试生图能力</button>
            <button type="submit" className={primary} disabled={Boolean(matchesSaved)}>保存配置</button>
          </div>
        </form>
      </div>
    </SettingsPage>
  );
}
