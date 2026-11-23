export const frame = { width: 1440, height: 900, title: '项目 · 打开本地目录' };

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Conversation } from '../components/Conversation';
import { Welcome } from '../components/Welcome';
import { primary } from '../components/SettingsParts';
import { useWorkspace } from './_layout';

function WorkspacePicker() {
  const { folder, folders, sessionCount, openFolder, openExamplePath } = useWorkspace();
  const navigate = useNavigate();
  const { state } = useLocation();
  const returnTo = typeof state?.returnTo === 'string' && /^\/(?!\/)/u.test(state.returnTo) ? state.returnTo : '/';
  const dialog = useRef<HTMLDialogElement>(null);
  const [path, setPath] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    return () => { if (node?.open) node.close(); };
  }, []);

  function open() {
    const text = path.trim();
    if (!/^(?:\/|~\/|[A-Za-z]:[\\/])/u.test(text)) {
      setError('请输入本地目录路径，例如 ~/设计/暮色插画。');
      return;
    }
    openExamplePath(text);
  }

  return (
    <dialog ref={dialog} aria-labelledby="workspace-title" onCancel={(event) => { event.preventDefault(); navigate(returnTo); }} className="fixed inset-0 m-auto max-h-[calc(100%-48px)] w-[570px] max-w-[calc(100%-48px)] overflow-y-auto rounded-control border border-line bg-panel p-0 text-surface-foreground shadow-xl backdrop:bg-scrim/75">
      <header className="flex items-start justify-between gap-4 px-6 pb-5 pt-6">
        <div>
          <h1 id="workspace-title" className="font-display text-[30px] font-semibold leading-tight">打开项目目录</h1>
          <p className="mt-2 text-sm text-muted">将本地目录加入侧栏。已有项目及其会话不会被替换。</p>
        </div>
        <Link to={returnTo} aria-label="关闭目录选择" className="grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-raised">
          <span className="icon-[lucide--x] size-4" aria-hidden="true" />
        </Link>
      </header>
      <form className="mx-6" onSubmit={(event) => { event.preventDefault(); open(); }}>
        <label className="block text-sm font-semibold" htmlFor="preview-folder-path">本地目录</label>
        <div className="mt-2 flex items-center gap-2">
          <input id="preview-folder-path" value={path} maxLength={512} onChange={(event) => { setPath(event.target.value); setError(''); }} className="block h-10 w-full min-w-0 rounded-control border border-line bg-surface px-3 text-sm placeholder:text-quiet" placeholder="例如 ~/设计/暮色插画" />
          <button type="submit" className={`${primary} h-10 shrink-0`} disabled={!path.trim()}>加入项目</button>
        </div>
        <p className={`mt-2 text-xs ${error ? 'text-rose' : 'text-quiet'}`} aria-live="polite">{error || '原型用路径模拟添加项目，不读取本机目录。'}</p>
      </form>
      <section className="mx-6 mb-5 mt-5 border-t border-line/65 pt-4" aria-label="已打开的项目">
        <h2 className="mb-2 text-xs font-medium text-muted">已打开的项目</h2>
        {!folders.length && <p className="py-2 text-sm text-quiet">还没有打开过项目。</p>}
        <ul className="divide-y divide-line/55">
          {folders.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => openFolder(item.id)} className="flex w-full items-center gap-3 rounded-control px-2.5 py-3 text-left hover:bg-raised">
                <span className="icon-[lucide--folder-open] size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-quiet" title={item.path}>{item.path}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-quiet">
                  {sessionCount(item.id)} 场会话
                  {item.id === folder?.id && <span className="text-primary">当前</span>}
                  <span className="icon-[lucide--chevron-right] size-3.5" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </dialog>
  );
}

export default function WorkspacePickerFrame() {
  const { hasSession, folder } = useWorkspace();
  return (
    <div className="relative h-full">
      <div className="h-full" inert>
        {hasSession || folder ? <Conversation /> : <Welcome />}
      </div>
      <WorkspacePicker />
    </div>
  );
}
