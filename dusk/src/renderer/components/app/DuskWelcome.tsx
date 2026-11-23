import { projectDisplayName } from '@shared/projectName';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  LibraryBig,
  MessageSquare,
  MessageSquareDashed,
  MessagesSquare,
  PanelsTopLeft,
  Plus,
  Search,
  SlidersHorizontal,
  Trees,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import forest from '@/assets/dusk/dusk-forest.svg';
import { ChatView } from '@/components/chat/ChatView';
import { prepareDuskLegend } from '@/lib/duskLegends';
import { addLocalProject } from '@/lib/importLocalProject';
import { useSessionsStore } from '@/stores/sessions';
import { projectConversationIds } from '@/stores/sessions/pinned';
import { useSettingsStore } from '@/stores/settings';
import { ARCHIVED_PROJECTS_KEY, readSidebarOrder } from '@/stores/settings/sidebarOrderStorage';
import { flushElectronPersist } from '@/stores/settings/storage';
import prototypeUrl from '../../../../design/暮色-历史会话交互预览.html?url';
import { DuskModels } from './DuskModels';
import { type WindowChromeKind, WindowControls } from './WindowChrome';
import './duskWelcome.css';

export const OPEN_DUSK_MODELS = 'dusk:open-models';

type Preview = '/roster' | '/design' | '/session-preview' | '/invite' | '/image-models';
const previewTitle: Record<Preview, string> = {
  '/roster': '智能体名册',
  '/design': '设计画布',
  '/session-preview': '桥边初会',
  '/invite': '邀请参与者',
  '/image-models': '生图模型',
};

interface DuskWelcomeProps {
  chromeKind: WindowChromeKind;
  ready?: boolean;
}

export function DuskWelcome({ chromeKind, ready = true }: DuskWelcomeProps) {
  const projects = useSettingsStore((s) => s.projects);
  const scratchEnabled = useSettingsStore((s) => s.scratchSessionsEnabled);
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const order = useSessionsStore((s) => s.order);
  const activeId = useSessionsStore((s) => s.activeId);
  const conversations = useSessionsStore((s) => s.conversations);
  const [folderId, setFolderId] = useState<string>();
  const [showHome, setShowHome] = useState(false);
  const [showModels, setShowModels] = useState(false);

  useEffect(() => {
    const open = () => setShowModels(true);
    window.addEventListener(OPEN_DUSK_MODELS, open);
    return () => window.removeEventListener(OPEN_DUSK_MODELS, open);
  }, []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const term = query.trim().toLocaleLowerCase();
  const active = !showHome && !folderId && activeId ? conversations[activeId] : undefined;
  const [preview, setPreview] = useState<Preview>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const scratch = projects.find((p) => p.kind === 'scratch');
  const archived = new Set(readSidebarOrder(ARCHIVED_PROJECTS_KEY));
  const folders = projects.filter(
    (p) => p.kind !== 'scratch' && p.kind !== 'secretary' && !archived.has(p.id)
  );
  const folder = folders.find((p) => p.id === folderId);
  const scope = folder ? projectDisplayName(folder) : '暮色工作台';
  const icons = { size: 16, 'aria-hidden': true } as const;

  async function perform(action: () => Promise<void>, failure: string) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? `${failure}：${cause.message}` : failure);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  function openDirectory() {
    void perform(async () => {
      const path = await window.electronAPI.dialog.selectDirectory();
      if (!path) return;
      const imported = await addLocalProject(path);
      if (!imported) throw new Error('项目目录不可用');
      const { project, focus } = imported;
      if (focus.kind === 'select') {
        await useSessionsStore.getState().selectConversation(focus.conversationId);
        setFolderId(undefined);
        setShowHome(false);
        setShowModels(false);
        return;
      }
      setExpanded((ids) => ({ ...ids, [project.id]: true }));
      setFolderId(project.id);
      setShowModels(false);
    }, '打开项目失败');
  }

  function start(projectId?: string) {
    if (!projectId) return;
    void perform(async () => {
      const settings = useSettingsStore.getState();
      const presetId =
        settings.defaultPresetId !== 'default'
          ? settings.defaultPresetId
          : await prepareDuskLegend('yunshen', {
              getPresets: () => useSettingsStore.getState().presets,
              writePrompt: (id, content) =>
                window.electronAPI.presets.writeSystemPrompt(id, content),
              addPreset: (preset) => useSettingsStore.getState().addPreset(preset),
            });
      await flushElectronPersist();
      if (!(await useSessionsStore.getState().newConversation(projectId, { presetId }))) {
        throw new Error('暂时无法创建会话，请重试');
      }
      setFolderId(undefined);
      setShowHome(false);
      setShowModels(false);
    }, '新建会话失败');
  }

  function openModelSettings() {
    setShowModels(true);
  }

  function sessionRows(projectId: string, projectMatches = false) {
    const ids = projectConversationIds(order, conversations, projectId).filter(
      (id) =>
        !term ||
        projectMatches ||
        (conversations[id]?.title ?? '新会话').toLocaleLowerCase().includes(term)
    );
    return ids.map((id) => {
      const title = conversations[id]?.title || '新会话';
      return (
        <li key={id}>
          <button
            type="button"
            className="dusk-session-row"
            title={title}
            aria-current={active?.id === id ? 'true' : undefined}
            onClick={() =>
              void perform(async () => {
                await useSessionsStore.getState().selectConversation(id);
                setFolderId(undefined);
                setShowHome(false);
                setShowModels(false);
              }, '打开会话失败')
            }
          >
            <MessageSquare size={14} aria-hidden="true" />
            <span>{title}</span>
          </button>
        </li>
      );
    });
  }

  const temporary = scratch && scratchEnabled ? sessionRows(scratch.id) : [];

  return (
    <div className="dusk-start">
      <aside className="dusk-start-sidebar" inert={Boolean(preview)}>
        <div className="dusk-start-brand drag-region">
          <span className="dusk-start-mark">
            <Trees size={20} aria-hidden="true" />
          </span>
          <div>
            <div className="dusk-start-name">暮色</div>
            <div className="dusk-start-subtitle">智能体工作台</div>
          </div>
        </div>
        <nav className="dusk-start-nav" aria-label="工作台导航">
          <button
            type="button"
            aria-current={showModels ? undefined : 'page'}
            onClick={() => {
              if (!showModels) {
                setFolderId(undefined);
                setShowHome(true);
              }
              setShowModels(false);
            }}
          >
            <MessagesSquare {...icons} /> 会话
          </button>
          <button type="button" onClick={() => setPreview('/roster')}>
            <LibraryBig {...icons} /> 智能体名册
          </button>
          <button
            type="button"
            aria-current={showModels ? 'page' : undefined}
            onClick={openModelSettings}
          >
            <SlidersHorizontal {...icons} /> 模型设置
          </button>
          <button type="button" onClick={() => setPreview('/design')}>
            <PanelsTopLeft {...icons} /> 设计画布
          </button>
        </nav>
        <nav className="dusk-start-history" aria-label="项目与会话">
          <label className="dusk-start-search">
            <Search size={14} aria-hidden="true" />
            <input
              aria-label="搜索项目与会话"
              placeholder="搜索项目与会话"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <section aria-label="临时会话">
            <div className="dusk-history-heading">
              <h2>
                对话 <span>不绑定项目</span>
              </h2>
              <button
                type="button"
                className="dusk-history-tool"
                aria-label="新建临时会话"
                title="新建临时会话"
                disabled={!scratch || !scratchEnabled || pending}
                onClick={() => start(scratch?.id)}
              >
                <Plus {...icons} />
              </button>
            </div>
            {temporary.length ? (
              <ul>{temporary}</ul>
            ) : (
              <p className="dusk-history-empty">还没有临时会话</p>
            )}
          </section>
          <section className="dusk-start-projects" aria-label="项目列表">
            <div className="dusk-history-heading">
              <h2>项目</h2>
              <button
                type="button"
                className="dusk-history-tool"
                aria-label="打开项目目录"
                title="打开项目目录"
                disabled={pending}
                onClick={openDirectory}
              >
                <FolderPlus {...icons} />
              </button>
            </div>
            {!folders.length && <p className="dusk-history-empty">还没有打开项目</p>}
            <ul>
              {folders.map((project) => {
                const open =
                  Boolean(term) || (expanded[project.id] ?? project.id === active?.projectId);
                const name = projectDisplayName(project);
                const projectMatches = `${name} ${project.path}`.toLocaleLowerCase().includes(term);
                const rows = open ? sessionRows(project.id, projectMatches) : [];
                if (term && !projectMatches && rows.length === 0) return null;
                const Chevron = open ? ChevronDown : ChevronRight;
                const FolderIcon = open ? FolderOpen : Folder;
                return (
                  <li key={project.id}>
                    <div className="dusk-project-item">
                      <button
                        type="button"
                        className="dusk-session-row"
                        aria-expanded={open}
                        title={project.path}
                        onClick={() => setExpanded((ids) => ({ ...ids, [project.id]: !open }))}
                      >
                        <Chevron size={14} aria-hidden="true" />
                        <FolderIcon {...icons} /> <span>{name}</span>
                      </button>
                      <button
                        type="button"
                        className="dusk-history-tool"
                        aria-label={`在${name}新建会话`}
                        title={`在${name}新建会话`}
                        disabled={pending}
                        onClick={() => start(project.id)}
                      >
                        <Plus {...icons} />
                      </button>
                    </div>
                    {open && (
                      <ul className="dusk-project-sessions">
                        {rows.length ? rows : <li className="dusk-history-empty">还没有会话</li>}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </nav>
        <div className="dusk-start-footer">
          <span aria-hidden="true">暮</span>
          <div>
            本地工作区<div className="dusk-start-subtitle">桌面原型</div>
          </div>
        </div>
      </aside>
      <main className="dusk-start-main" inert={Boolean(preview)}>
        {showModels ? (
          <DuskModels
            chromeKind={chromeKind}
            onBack={() => setShowModels(false)}
            onImages={() => setPreview('/image-models')}
          />
        ) : ready && active ? (
          <ChatView
            dusk={{
              chromeKind,
              onInvite: () => setPreview('/invite'),
              onRoster: () => setPreview('/roster'),
              onModels: openModelSettings,
            }}
          />
        ) : ready ? (
          <>
            <header className="dusk-start-header drag-region" data-enso="title-bar">
              {folder ? <FolderOpen {...icons} /> : <Trees {...icons} />}
              <span>{scope}</span>
              <WindowControls kind={chromeKind} />
            </header>
            {folder ? (
              <div className="dusk-folder-content">
                <section className="dusk-folder-hero">
                  <img src={forest} alt="" />
                  <h1>{scope}</h1>
                </section>
                <section className="dusk-folder-empty" aria-label="尚未创建会话">
                  <h2>这里还没有会话</h2>
                  <p>可以围绕同一个目录开多个会话，每场分别邀请伙伴、设置首领。</p>
                  <button
                    type="button"
                    className="dusk-welcome-primary"
                    disabled={pending}
                    onClick={() => start(folder.id)}
                  >
                    <Plus {...icons} /> 在本目录新建会话
                  </button>
                </section>
                {error && (
                  <p role="alert" className="dusk-start-error">
                    {error}
                  </p>
                )}
              </div>
            ) : (
              <div className="dusk-start-content">
                <div className="dusk-start-inner">
                  <section className="dusk-welcome" aria-labelledby="dusk-welcome-title">
                    <img src={forest} alt="" />
                    <h1 id="dusk-welcome-title">欢迎来到暮色</h1>
                    <p>
                      打开一个项目，或者先聊一件事。
                      <br />
                      传奇与集群可以在你需要时加入。
                    </p>
                    <div className="dusk-welcome-actions">
                      <button
                        type="button"
                        className="dusk-welcome-primary"
                        disabled={pending}
                        onClick={openDirectory}
                      >
                        <FolderOpen {...icons} /> 打开项目目录
                      </button>
                      {scratchEnabled && (
                        <button
                          type="button"
                          className="dusk-welcome-quiet"
                          disabled={!scratch || pending}
                          onClick={() => start(scratch?.id)}
                        >
                          <MessageSquareDashed {...icons} /> 新建临时会话
                        </button>
                      )}
                    </div>
                  </section>
                  <dl className="dusk-welcome-details">
                    <div>
                      <dt>在目录里做事</dt>
                      <dd>一个项目能开多场会话，历史按目录归在一起。</dd>
                    </div>
                    <div>
                      <dt>不打开目录也能开始</dt>
                      <dd>临时会话不关联项目，不使用项目里的文件。</dd>
                    </div>
                  </dl>
                  <div className="dusk-welcome-links">
                    <p>
                      <SlidersHorizontal {...icons} />
                      {defaultModel
                        ? '可在设置中调整默认模型。'
                        : '还没配置对话模型。先建项目或会话，之后再配置也可以。'}
                      <button type="button" onClick={openModelSettings}>
                        模型设置
                      </button>
                    </p>
                    <button
                      type="button"
                      className="dusk-welcome-example"
                      onClick={() => setPreview('/session-preview')}
                    >
                      体验示例：桥边初会 <ArrowRight {...icons} />
                    </button>
                  </div>
                  {error && (
                    <p role="alert" className="dusk-start-error">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
      {preview && (
        <div
          className="dusk-start-preview"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewTitle[preview]} · 交互原型`}
          onKeyDown={(event) => event.key === 'Escape' && setPreview(undefined)}
        >
          <div className="dusk-preview-strip">
            <span>交互原型 · 仅供预览</span>
            <button type="button" onClick={() => setPreview(undefined)}>
              返回工作台
            </button>
          </div>
          <iframe
            title={previewTitle[preview]}
            sandbox="allow-scripts"
            src={`${prototypeUrl}#${preview}`}
          />
        </div>
      )}
    </div>
  );
}
