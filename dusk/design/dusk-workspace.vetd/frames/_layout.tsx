import { createContext, useContext, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { initialFolders, initialModels, initialParties, initialSessions, isBuiltInLegend } from '../components/demo';
import type { FolderSpace, Member, ModelConfig, Party, Session } from '../components/demo';
import { useReplyPreview } from '../components/replyPreview';
import { makeTask, useWorkPreview } from '../components/workPreview';
import { useImagePreview } from '../components/mediaPreview';
import type { ImageAsset, ImageRequest } from '../components/mediaPreview';
import type { WorkKind } from '../components/workPreview';
import { SessionSidebar } from '../components/SessionSidebar';
import { SessionHistoryDialog, type HistoryAction } from '../components/SessionHistoryActions';
import type { ChatChoice } from '../components/ComposerModel';
import type { Reasoning } from '../components/chat-models';

type Workspace = {
  session: Session;
  hasSession: boolean;
  folder?: FolderSpace;
  folders: FolderSpace[];
  sessionCount: (folderId: string) => number;
  createSession: () => void;
  createTemporarySession: () => void;
  openDemo: (navigateToExample?: boolean) => void;
  openFolder: (id: string) => void;
  openExamplePath: (path: string) => void;
  parties: Party[];
  removedLegends: Record<string, Party>;
  deleteLegend: (id: string) => boolean;
  leader?: Party;
  defaultLegend?: Party;
  setDefaultLegend: (id: string) => void;
  chatOptions: ChatChoice[];
  chooseChatModel: (key: string) => void;
  reasoningFor: (choice: ChatChoice) => Reasoning | undefined;
  chooseReasoning: (choice: ChatChoice, level: Reasoning) => void;
  chatModelFor: (party?: Party) => ChatChoice | undefined;
  chooseLeader: (id: string) => void;
  work: ReturnType<typeof useWorkPreview>;
  images: ReturnType<typeof useImagePreview>;
  postImage: (request: ImageRequest, target?: Party, attachment?: ImageAsset) => string | undefined;
  draftImage?: ImageAsset;
  setDraftImage: (asset?: ImageAsset) => void;
  dispatch: (text: string, target: Party, kind: WorkKind, routing: string, attachment?: ImageAsset) => void;
  selectSession: (id: string) => void;
  manageSession: (action: HistoryAction, id: string) => void;
  draft: string;
  setDraft: (value: string) => void;
  invite: (ids: string[]) => void;
  remove: (id: string) => void;
  send: (text: string, target: string, interrupt?: boolean, attachment?: ImageAsset) => boolean;
  stop: () => void;
  retry: (id: string) => void;
  models: ModelConfig[];
  defaultModel: string;
  setDefaultModel: (id: string) => void;
  saveModel: (model: ModelConfig) => void;
  modelFor: (party?: Party) => ModelConfig | undefined;
  saveParty: (party: Party) => void;
  saveMember: (id: string, member: Member, at?: number) => void;
  setLead: (id: string, at: number) => void;
};
const WorkspaceContext = createContext<Workspace | undefined>(undefined);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('当前会话未加载');
  return context;
}

export default function Layout() {
  const { pathname, search, state } = useLocation();
  // The root previews a clean launch; direct canvas captures of other routes use the existing demo.
  const [withDemo] = useState(() => pathname !== '/' && state?.fresh !== true);
  const [sessions, setSessions] = useState<Session[]>(() => withDemo ? initialSessions : []);
  const [parties, setParties] = useState(initialParties);
  const [removedLegends, setRemovedLegends] = useState<Record<string, Party>>({});
  const [folders, setFolders] = useState<FolderSpace[]>(() => withDemo ? initialFolders : []);
  const [folderId, setFolderId] = useState<string | null>(() => withDemo ? 'dusk' : null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(() => withDemo ? ['dusk', 'forest'] : []);
  const [lastSession, setLastSession] = useState<Record<string, string>>(() => withDemo ? { dusk: 'bridge' } : {});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftImages, setDraftImages] = useState<Record<string, ImageAsset | undefined>>({});
  const [models, setModels] = useState<ModelConfig[]>(() => withDemo ? initialModels : []);
  const [defaultModel, setDefaultModel] = useState(() => withDemo ? 'daily' : '');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyDialog, setHistoryDialog] = useState<{ action: HistoryAction; id: string }>();
  const [historyStatus, setHistoryStatus] = useState('');
  const removedSessions = useRef(new Set<string>());
  const editedSession = sessions.find((entry) => entry.id === historyDialog?.id);
  const [defaultLegendId, setDefaultLegendId] = useState('yun');
  const [chatSelections, setChatSelections] = useState<Record<string, string>>({});
  const [reasoning, setReasoning] = useState<Record<string, Record<string, Reasoning>>>({});
  const [leaders, setLeaders] = useState<Record<string, string>>({ bridge: 'yun' });
  const work = useWorkPreview(withDemo);
  const images = useImagePreview(withDemo);
  const navigate = useNavigate();
  const folder = folders.find((entry) => entry.id === folderId);
  const scope = folderId ?? 'temporary';
  const scopedSessions = sessions.filter((entry) => entry.folderId === folderId);
  const selected = scopedSessions.find((entry) => entry.id === lastSession[scope]) ?? scopedSessions[0];
  const session: Session = selected ?? { id: '', folderId, name: '尚未创建会话', snippet: '', when: '', party: [], messages: [] };
  const invited = parties.filter((party) => session.party.includes(party.id));
  const leader = invited.find((party) => party.id === leaders[session.id] && party.kind === 'legend');
  const defaultLegend = parties.find((party) => party.id === defaultLegendId && party.kind === 'legend');
  const chatOptions = models.flatMap((service) => service.enabled.map((entry) => ({ ...entry, service: service.id, serviceName: service.name, key: `${service.id}/${entry.identifier}` })));
  const currentChat = ['/', '/session-preview', '/session-model', '/invite', '/image-compose', '/workspace-picker'].includes(pathname);
  const rosterPage = ['/roster', '/legends', '/agent-editor', '/member-card', '/design-cluster', '/design-role', '/crew-portraits'].includes(pathname);
  const modelsPage = ['/models', '/image-models'].includes(pathname);

  function updateSessionById(id: string, apply: (entry: Session) => Session) {
    setSessions((all) => all.map((entry) => entry.id === id ? apply(entry) : entry));
  }

  const replies = useReplyPreview(updateSessionById);
  function modelFor(party?: Party) {
    const id = party?.kind === 'cluster' ? party.members[0]?.modelId : party?.modelId;
    return models.find((model) => model.id === id) ?? models.find((model) => model.id === defaultModel);
  }

  function chatModelFor(party?: Party) {
    const preferred = modelFor(party);
    return chatOptions.find((entry) => entry.key === chatSelections[session.id])
      ?? (preferred && chatOptions.find((entry) => entry.service === preferred.id && entry.identifier === preferred.identifier))
      ?? chatOptions[0];
  }

  function reasoningFor(choice: ChatChoice) {
    const remembered = reasoning[session.id]?.[choice.key];
    return remembered && choice.levels.includes(remembered) ? remembered : choice.defaultLevel;
  }

  function selectSession(id: string) {
    const entry = sessions.find((item) => item.id === id);
    if (!entry) return;
    setFolderId(entry.folderId);
    setLastSession((all) => ({ ...all, [entry.folderId ?? 'temporary']: id }));
    if (entry.folderId) expandFolder(entry.folderId);
  }

  function expandFolder(id: string) {
    setExpandedFolders((all) => all.includes(id) ? all : [...all, id]);
  }

  function createSession(inFolder: string | null = folderId) {
    const id = crypto.randomUUID();
    const added: Session = { id, folderId: inFolder, name: inFolder ? '未命名会话' : '新的临时会话', snippet: '等待第一条消息', when: '刚刚', party: defaultLegend ? [defaultLegend.id] : [], messages: [] };
    if (defaultLegend) setLeaders((all) => ({ ...all, [id]: defaultLegend.id }));
    setSessions((all) => [added, ...all]);
    setLastSession((all) => ({ ...all, [inFolder ?? 'temporary']: id }));
    setFolderId(inFolder);
    if (inFolder) expandFolder(inFolder);
    setHistoryQuery('');
    navigate('/');
  }

  function finishHistory(action: HistoryAction, current: Session, name: string) {
    const id = current.id;
    setHistoryDialog(undefined);
    if (action === 'rename') {
      if (!name) return;
      updateSessionById(id, (entry) => ({ ...entry, name, namePinned: true }));
      work.renameSession(id, name);
      if (historyQuery.trim()) setHistoryQuery('');
      setHistoryStatus(`会话已重命名为「${name}」。`);
      return;
    }
    removedSessions.current.add(id);
    replies.stop(id);
    work.removeSession(id);
    setSessions((all) => all.filter((entry) => entry.id !== id));
    setLastSession((all) => Object.fromEntries(Object.entries(all).filter(([, value]) => value !== id)));
    const forget = <T,>(all: Record<string, T>) => Object.fromEntries(Object.entries(all).filter(([key]) => key !== id));
    setDrafts(forget);
    setDraftImages(forget);
    setLeaders(forget);
    setChatSelections(forget);
    setReasoning(forget);
    if (session.id === id && currentChat && pathname !== '/') navigate('/');
    setHistoryStatus(`已删除会话「${current.name}」。`);
  }

  function openSpace(id: string | null) {
    setFolderId(id);
    if (id) expandFolder(id);
    setHistoryQuery('');
    navigate('/');
  }


  function openExamplePath(input: string) {
    const path = input.trim().replaceAll('\\', '/').replace(/\/+$/, '') || '/';
    const existing = folders.find((entry) => entry.path === path);
    if (existing) { openSpace(existing.id); return; }
    const id = crypto.randomUUID();
    const name = path.split('/').at(-1) || path;
    setFolders((all) => [{ id, path, name }, ...all]);
    openSpace(id);
  }

  function openDemo(navigateToExample = true) {
    setFolders((all) => [...all, ...initialFolders.filter((item) => !all.some((entry) => entry.id === item.id))]);
    setSessions((all) => [...all, ...initialSessions.filter((item) => !removedSessions.current.has(item.id) && !all.some((entry) => entry.id === item.id))]);
    setModels((all) => [...all, ...initialModels.filter((item) => !all.some((entry) => entry.id === item.id))]);
    setDefaultModel((current) => current || 'daily');
    if (!removedSessions.current.has('bridge')) work.loadDemo();
    images.loadDemo();
    setExpandedFolders((all) => [...new Set([...all, 'dusk', 'forest'])]);
    if (!removedSessions.current.has('bridge')) setLastSession((all) => ({ ...all, dusk: 'bridge' }));
    setFolderId('dusk');
    setHistoryQuery('');
    if (navigateToExample) navigate(removedSessions.current.has('bridge') ? '/' : '/session-preview');
  }

  const workspace: Workspace = {
    openDemo,
    createTemporarySession: () => createSession(null),
    folder,
    folders,
    hasSession: Boolean(selected),
    sessionCount: (id) => sessions.filter((entry) => entry.folderId === id).length,
    createSession: () => createSession(),
    openFolder: (id) => openSpace(id),
    openExamplePath,
    images,
    draftImage: draftImages[session.id],
    setDraftImage: (asset) => setDraftImages((all) => ({ ...all, [session.id]: asset })),
    postImage: (request, target, attachment) => {
      if (!selected) return undefined;
      const output = images.create(request);
      if (!output) return undefined;
      const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      updateSessionById(session.id, (entry) => ({
        ...entry,
        when: '刚刚',
        name: entry.namePinned || entry.messages.length ? entry.name : '图片 · ' + Array.from(request.prompt).slice(0, 12).join(''),
        snippet: `${target?.name ?? '暮色'}：${output.name}`,
        messages: [...entry.messages,
          { author: 'self', time, text: request.prompt.trim(), attachment },
          { id: output.id, author: target?.id ?? 'image-service', speaker: target?.kind === 'cluster' ? target.members[0]?.name : undefined, time, text: request.mode === 'edit' ? '按你的描述改了这张图。' : '这是按你的描述生成的图片。', image: output },
        ],
      }));
      return output.id;
    },
    session,
    parties,
    removedLegends,
    deleteLegend: (id) => {
      const party = parties.find((entry) => entry.id === id);
      if (!party || party.kind !== 'legend' || isBuiltInLegend(party)) return false;
      const { name, mark, tone, avatar } = party;
      setRemovedLegends((all) => ({ ...all, [id]: { id, kind: 'legend', name, mark, tone, avatar, role: '', note: '', members: [] } }));
      setParties((all) => all.filter((entry) => entry.id !== id));
      setSessions((all) => all.map((entry) => entry.party.includes(id) ? { ...entry, party: entry.party.filter((item) => item !== id) } : entry));
      setDefaultLegendId((current) => current === id ? '' : current);
      setLeaders((all) => Object.fromEntries(Object.entries(all).filter(([, leaderId]) => leaderId !== id)));
      return true;
    },
    leader,
    defaultLegend,
    setDefaultLegend: (id) => {
      if (!id || parties.some((party) => party.kind === 'legend' && party.id === id)) setDefaultLegendId(id);
    },
    chatOptions,
    chooseChatModel: (key) => setChatSelections((all) => ({ ...all, [session.id]: key })),
    reasoningFor,
    chooseReasoning: (choice, level) => {
      if (choice.levels.includes(level)) setReasoning((all) => ({ ...all, [session.id]: { ...all[session.id], [choice.key]: level } }));
    },
    chatModelFor,
    chooseLeader: (id) => {
      if (!selected || (id && !parties.some((party) => party.id === id && party.kind === 'legend'))) return;
      if (id && !session.party.includes(id)) updateSessionById(session.id, (entry) => ({ ...entry, party: [...entry.party, id] }));
      setLeaders((all) => ({ ...all, [session.id]: id }));
    },
    work,
    selectSession,
    manageSession: (action, id) => setHistoryDialog({ action, id }),
    dispatch: (text, target, kind, routing, attachment) => {
      const name = session.namePinned || session.messages.length ? session.name : Array.from(text).slice(0, 16).join('');
      const task = makeTask({ ...session, name }, target, routing, invited, text, kind);
      work.add(task);
      const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      updateSessionById(session.id, (entry) => ({ ...entry, when: '刚刚', name, snippet: `${task.ownerName}：已接单`, messages: [...entry.messages, { author: 'self', time, text, taskId: task.id, attachment }] }));
    },
    draft: drafts[session.id] ?? '',
    setDraft: (value) => setDrafts((all) => ({ ...all, [session.id]: value })),
    invite: (ids) => updateSessionById(session.id, (entry) => ({ ...entry, party: Array.from(new Set([...entry.party, ...ids])) })),
    remove: (id) => {
      if (leader?.id === id) setLeaders((all) => ({ ...all, [session.id]: '' }));
      updateSessionById(session.id, (entry) => ({ ...entry, party: entry.party.filter((item) => item !== id) }));
    },
    send: (text, target, interrupt, attachment) => {
      const party = parties.find((item) => item.id === target && session.party.includes(target));
      const choice = chatModelFor(party);
      return replies.send(session, text, party, choice, interrupt, attachment, choice ? reasoningFor(choice) : undefined);
    },
    stop: () => replies.stop(session.id),
    retry: (id) => {
      const messages = session.messages;
      if (messages.some((item) => item.id === id && !removedLegends[item.author])) replies.retry(session, id);
    },
    models,
    defaultModel,
    setDefaultModel,
    saveModel: (model) => {
      setModels((all) => all.some((item) => item.id === model.id) ? all.map((item) => item.id === model.id ? model : item) : [...all, model]);
      if (model.enabled.length) setDefaultModel((current) => current || model.id);
    },
    modelFor,
    saveParty: (party) => setParties((all) => all.some((item) => item.id === party.id) ? all.map((item) => item.id === party.id ? party : item) : [...all, party]),
    saveMember: (id, member, at) => setParties((all) => all.map((party) => party.id === id ? { ...party, members: at === undefined ? [...party.members, member] : party.members.map((item, index) => index === at ? member : item) } : party)),
    setLead: (id, at) => setParties((all) => all.map((party) => party.id === id && party.members[at] ? { ...party, members: [party.members[at], ...party.members.filter((_, index) => index !== at)] } : party)),
  };

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="grid h-full grid-cols-[228px_minmax(0,1fr)] overflow-hidden bg-surface font-sans text-sm text-surface-foreground">
        <aside className="flex min-h-0 flex-col border-r border-line/65 bg-rail px-4 pb-4 pt-6">
          <div className="mb-8 flex items-center gap-3 px-2">
            <span className="grid size-10 place-items-center rounded-control border border-primary/30 bg-stamp text-primary" aria-hidden="true">
              <span className="icon-[lucide--trees] size-5" />
            </span>
            <div>
              <div className="font-display text-[26px] leading-none">暮色</div>
              <div className="mt-1 text-xs text-quiet">智能体工作台</div>
            </div>
          </div>
          <nav className="space-y-1" aria-label="工作台导航">
            <Link to="/" className={`flex h-10 items-center gap-3 rounded-control px-3 ${currentChat ? 'bg-raised text-surface-foreground' : 'text-muted hover:bg-panel'}`} aria-current={currentChat ? 'page' : undefined}>
              <span className="icon-[lucide--messages-square] size-4" aria-hidden="true" />
              会话
            </Link>
            <Link to="/roster" className={`flex h-10 items-center gap-3 rounded-control px-3 ${rosterPage ? 'bg-raised text-surface-foreground' : 'text-muted hover:bg-panel'}`} aria-current={rosterPage ? 'page' : undefined}>
              <span className="icon-[lucide--library-big] size-4" aria-hidden="true" />
              智能体名册
            </Link>
            <Link to="/models" className={`flex h-10 items-center gap-3 rounded-control px-3 ${modelsPage ? 'bg-raised text-surface-foreground' : 'text-muted hover:bg-panel'}`} aria-current={modelsPage ? 'page' : undefined}>
              <span className="icon-[lucide--sliders-horizontal] size-4" aria-hidden="true" />
              模型设置
            </Link>
            <Link to="/design" className={`flex h-10 items-center gap-3 rounded-control px-3 ${pathname === '/design' ? 'bg-raised text-surface-foreground' : 'text-muted hover:bg-panel'}`} aria-current={pathname === '/design' ? 'page' : undefined}>
              <span className="icon-[lucide--panels-top-left] size-4" aria-hidden="true" />
              设计画布
            </Link>
          </nav>
          <SessionSidebar folders={folders} expanded={expandedFolders} sessions={sessions} active={currentChat ? session.id : ''} query={historyQuery} setQuery={setHistoryQuery} onToggle={(id) => setExpandedFolders((all) => all.includes(id) ? all.filter((item) => item !== id) : [...all, id])} onSelect={(id) => { selectSession(id); navigate('/'); }} onNew={createSession} onManage={workspace.manageSession} returnTo={`${pathname}${search}`} />
          <div className="flex items-center gap-3 border-t border-line/65 px-2 pt-4">
            <span className="grid size-8 place-items-center rounded-full bg-raised text-xs text-muted" aria-hidden="true">{sessions.some((item) => item.id === 'bridge') ? '杨' : '暮'}</span>
            <div>
              <div>{sessions.some((item) => item.id === 'bridge') ? '杨杨杨' : '本地工作区'}</div>
              <div className="mt-1 text-xs text-quiet">桌面原型</div>
            </div>
          </div>
        </aside>
        <div className="min-h-0 min-w-0">
          <Outlet />
        </div>
        <p role="status" className="sr-only">{historyStatus}</p>
        {historyDialog && editedSession && <SessionHistoryDialog
          key={`${historyDialog.action}:${editedSession.id}`}
          action={historyDialog.action}
          session={editedSession}
          scope={folders.find((entry) => entry.id === editedSession.folderId)?.name ?? '临时会话 · 不绑定项目'}
          cancel={() => setHistoryDialog(undefined)}
          confirm={(name) => finishHistory(historyDialog.action, editedSession, name)}
        />}
      </div>
    </WorkspaceContext.Provider>
  );
}
