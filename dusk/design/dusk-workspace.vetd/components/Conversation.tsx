import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { PartyStamp } from './PartyStamp';
import { TaskLedger } from './TaskLedger';
import { detectImageMode, exampleChatImage, exampleImagePrompt, loadLocalImage, modeName } from './mediaPreview';
import type { ImageAsset } from './mediaPreview';
import type { Message } from './demo';
import { ComposerModel } from './ComposerModel';
import { reasoningLabels } from './chat-models';
import duskForest from '../assets/dusk-forest.svg';

function ScopeLabel({ name }: { name?: string }) {
  return (
    <span className={`flex min-w-0 items-center gap-2 text-sm ${name ? 'text-muted' : 'text-iris'}`}>
      <span className={`${name ? 'icon-[lucide--folder-open]' : 'icon-[lucide--message-square-dashed]'} size-4 shrink-0`} aria-hidden="true" />
      <span className="truncate">{name ?? '临时会话'}</span>
    </span>
  );
}

const imageExample: Message[] = [
  { id: 'forest-request', author: 'self', time: '21:08', text: exampleImagePrompt },
  { id: 'forest-in-chat', author: 'yun', time: '21:08', text: '这是按你的描述生成的图片。可以接着说想改哪里。', image: exampleChatImage },
];

export function Conversation({ showImageExample = false, showModelMenu = false }: { showImageExample?: boolean; showModelMenu?: boolean }) {
  const { session, hasSession, folder, createSession, manageSession, parties, removedLegends, leader, defaultLegend, chooseLeader, work, dispatch, draft, setDraft, send, stop, retry, chatOptions, chatModelFor, chooseChatModel, chooseReasoning, reasoningFor, remove, images, postImage, draftImage, setDraftImage } = useWorkspace();
  const invited = session.party.map((id) => parties.find((party) => party.id === id)!).filter(Boolean);
  const [hideMentions, setHideMentions] = useState(false);
  const [params] = useSearchParams();
  const [imageNotice, setImageNotice] = useState<'reference' | 'model' | 'failed' | ''>('');
  const [attachmentError, setAttachmentError] = useState('');
  const composer = useRef<HTMLTextAreaElement>(null);
  const attachmentPicker = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState('');
  const [demoMode, setDemoMode] = useState<'normal' | 'interrupt'>('normal');
  const scrollBox = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef(false);
  const mention = draft.trim().match(/^[@＠]([^\s，：:,]+)/u)?.[1];
  const named = mention ? invited.find((party) => party.name === mention) : undefined;
  const direct = named;
  const partialMention = draft.match(/^[@＠]([^\s，：:,]*)$/u)?.[1];
  const suggestions = !hideMentions && partialMention !== undefined ? invited.filter((party) => party.name.includes(partialMention)) : [];
  const recipient = direct ?? leader ?? (invited.length === 1 ? invited[0] : undefined);
  const content = mention && named ? draft.trim().replace(/^[@＠][^\s，：:,]+[\s，：:,]*/u, '') : draft.trim();
  const messages = showImageExample && session.id === 'bridge' ? [...imageExample, ...session.messages.filter((message) => !message.taskId)] : session.messages;
  const previousImage = messages.slice().reverse().find((message) => message.image || message.attachment);
  const refersBack = Boolean(previousImage && /这张|上一张|上张|刚才那张|^(?:再)?(?:改成|调亮|提亮|调暗)|(?:背景|色调|树冠|构图).{0,6}(?:改|换|调)/u.test(content));
  const imageMode = detectImageMode(content, Boolean(draftImage) || refersBack);
  const effectiveMode = imageMode ? 'image' : /[？?]$|^(为什么|怎么|如何|你觉得)/u.test(content) ? 'chat' : /设计稿|画板|原型|出.{0,4}设计/u.test(content) ? 'design' : /^(请|把|帮我|做|改|执行|验证|整理|检查)/u.test(content) ? 'task' : 'chat';
  const taskIndex = new Map(work.tasks.filter((task) => task.sessionId === session.id).map((task) => [task.id, task]));
  const needsLeader = !recipient && invited.length > 1;
  const blocked = (mention && !named) || (effectiveMode !== 'image' && (needsLeader || (!recipient && effectiveMode !== 'chat')));
  const running = session.messages.some((message) => message.status === 'streaming');
  const model = chatModelFor(recipient);
  const level = model && reasoningFor(model);
  const missingModel = Boolean(recipient && !model && effectiveMode !== 'image');

  useEffect(() => {
    setHideMentions(false);
    setRemoving('');
    setDemoMode('normal');
    setImageNotice('');
    setAttachmentError('');
    if (scrollBox.current) scrollBox.current.scrollTop = 0;
  }, [session.id]);

  useEffect(() => {
    const node = scrollBox.current;
    if (node && (pendingScroll.current || node.scrollHeight - node.clientHeight - node.scrollTop < 72)) node.scrollTop = node.scrollHeight;
    pendingScroll.current = false;
  }, [session.messages]);

  const returnTask = params.get('task');
  useEffect(() => {
    if (returnTask) document.getElementById(`task-${returnTask}`)?.scrollIntoView({ block: 'nearest' });
  }, [returnTask, session.id]);

  function attach(asset?: ImageAsset) {
    setDraftImage(asset);
    setImageNotice('');
    setAttachmentError('');
    composer.current?.focus();
  }

  async function upload(file?: File) {
    if (!file) return;
    try {
      attach(await loadLocalImage(file));
    } catch (error) {
      setAttachmentError((error as Error).message);
    }
  }

  function insertMention(name: string) {
    setDraft(`@${name} `);
    setHideMentions(true);
    composer.current?.focus();
  }

  function submit() {
    if (!hasSession || !content || blocked || missingModel || (running && effectiveMode === 'chat')) return;
    if (imageMode) {
      const reference = imageMode === 'edit' ? draftImage ?? previousImage?.image ?? previousImage?.attachment : undefined;
      if (imageMode === 'edit' && !reference) { setImageNotice('reference'); return; }
      const options = images.available(imageMode);
      const chosen = options.find((item) => item.id === images.defaults[imageMode]) ?? options[0];
      if (!chosen) { setImageNotice('model'); return; }
      const ratio = /4\s*[:：]\s*5/u.test(content) ? '4:5' : /1\s*[:：]\s*1|正方形/u.test(content) ? '1:1' : /16\s*[:：]\s*9/u.test(content) ? '16:9' : reference?.ratio ?? '16:9';
      pendingScroll.current = true;
      if (!postImage({ mode: imageMode, prompt: content, model: chosen.id, ratio, reference }, recipient, draftImage)) {
        pendingScroll.current = false;
        setImageNotice('failed');
        return;
      }
      setDraft('');
      setDraftImage();
      setImageNotice('');
      setAttachmentError('');
      return;
    }
    pendingScroll.current = true;
    if ((effectiveMode === 'task' || effectiveMode === 'design') && recipient) {
      dispatch(content, recipient, effectiveMode, direct ? '直接指派' : leader ? '会话主控' : '唯一在场对象', draftImage);
      setDraft('');
      setDraftImage();
    } else if (send(content, recipient?.id ?? '', demoMode === 'interrupt', draftImage)) {
      setDraft('');
      setDraftImage();
      setDemoMode('normal');
    }
    setAttachmentError('');
  }

  if (!hasSession) {
    return (
      <main className="flex h-full min-h-0 flex-col overflow-auto" aria-label="空目录空间">
        <header className="flex h-16 shrink-0 items-center border-b border-line/65 px-8">
          <ScopeLabel name={folder?.name} />
        </header>
        <div className="px-8 pb-8 pt-7">
          <section className="relative isolate flex min-h-52 items-end overflow-hidden rounded-control border border-line p-7">
            <img src={duskForest} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <h1 className="max-w-[55%] break-words font-display text-[38px] font-semibold leading-tight">{folder?.name ?? '临时会话'}</h1>
          </section>
          <section className="mt-8" aria-label="尚未创建会话">
            <h2 className="text-lg font-semibold">这里还没有会话</h2>
            <p className="mt-2 text-sm text-muted">可以围绕同一个目录开多个会话，每场分别邀请伙伴、设置首领。</p>
            <button type="button" onClick={createSession} className="mt-4 inline-flex h-9 items-center gap-2 rounded-control bg-primary px-3.5 font-semibold text-primary-foreground">
              <span className="icon-[lucide--plus] size-4" aria-hidden="true" />
              {folder ? '在本目录新建会话' : '新建临时会话'}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_292px]">
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line/65 px-8">
          <div className="flex min-w-0 items-center gap-3">
            <ScopeLabel name={folder?.name} />
            <span className="icon-[lucide--chevron-right] size-3.5 shrink-0 text-quiet" aria-hidden="true" />
            <button type="button" aria-label="重命名当前会话" title="重命名会话" onClick={() => manageSession('rename', session.id)} className="flex min-w-0 items-center gap-2 rounded-control px-1.5 py-1 hover:bg-raised">
              <span className="truncate">{session.name}</span>
              <span className="icon-[lucide--pencil] size-3.5 shrink-0 text-quiet" aria-hidden="true" />
            </button>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs text-quiet">
            <span className="icon-[lucide--flask-conical] size-3.5" aria-hidden="true" />
            演示
            <select aria-label="回复演示场景" value={demoMode} onChange={(event) => setDemoMode(event.target.value === 'interrupt' ? 'interrupt' : 'normal')} className="rounded-control bg-panel py-1.5 pl-2 text-xs text-muted">
              <option value="normal">正常回复</option>
              <option value="interrupt">下次连接中断</option>
            </select>
          </label>
        </header>
        <div ref={scrollBox} className="min-h-0 flex-1 overflow-y-auto px-8 pt-7">
          <section className="relative isolate flex min-h-36 items-end overflow-hidden rounded-control border border-line p-5" aria-label="会话封面">
            <img src={duskForest} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
            <div className="max-w-[55%]">
              <h1 className="font-display text-[38px] font-semibold leading-[1.14]">{session.name}</h1>
              <p className="mt-3 leading-relaxed text-surface-foreground/90">{!folder ? '这场会话未关联目录，不会使用项目文件。' : session.id === 'bridge' ? '在暮色森林的桥边，开启第一场协作。' : '这场会话属于当前目录。'}</p>
            </div>
          </section>
          {messages.length ? (
            <section className="pb-6 pt-6" aria-label="对话记录">
              <div className="mb-4 flex items-center gap-4 text-xs text-quiet">
                <span className="h-px flex-1 bg-line/65" />
                {session.id === 'bridge' ? '第一天 · 会话开始' : '会话开始'}
                <span className="h-px flex-1 bg-line/65" />
              </div>
              <div className="space-y-6">
                {messages.map((message, index) => {
                  const removedAuthor = removedLegends[message.author];
                  const author = parties.find((party) => party.id === message.author) ?? removedAuthor;
                  const task = message.taskId ? taskIndex.get(message.taskId) : undefined;
                  const attachment = message.attachment && (
                    <figure className="mt-2 flex w-fit max-w-full items-center gap-2 rounded-control border border-line/65 px-2 py-1.5 text-xs text-muted">
                      <img src={message.attachment.src} alt="" className="size-8 shrink-0 rounded object-cover" />
                      <figcaption className="truncate">{message.attachment.name}</figcaption>
                    </figure>
                  );
                  if (message.author === 'self') {
                    return (
                      <article key={message.id ?? `self-${index}`} data-message-side="outgoing">
                        <div className="flex items-start justify-end gap-3.5">
                          <div className="min-w-0 max-w-[min(78%,44rem)] pt-0.5">
                            <div className="flex flex-wrap items-baseline justify-end gap-x-2.5 gap-y-0.5">
                              <time className="text-xs tabular-nums text-quiet">{message.time}</time>
                              <h2 className="font-semibold">杨杨杨</h2>
                            </div>
                            <div className="mt-1.5 rounded-control rounded-tr-sm bg-stamp/65 px-3.5 py-2.5">
                              {message.text && <p className="whitespace-pre-wrap leading-[1.75] text-surface-foreground [overflow-wrap:anywhere]">{message.text}</p>}
                              {attachment}
                            </div>
                          </div>
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-muted" aria-hidden="true">杨</span>
                        </div>
                        {task && <TaskLedger task={task} />}
                      </article>
                    );
                  }
                  return (
                    <article key={message.id ?? `${message.author}-${index}`} id={message.image ? `image-${message.image.id}` : undefined} data-message-side="incoming" data-reply-status={message.status} className="flex items-start gap-3.5">
                      {author ? <PartyStamp party={author} /> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-muted" aria-hidden="true">{message.image ? <span className="icon-[lucide--image] size-4 text-iris" /> : '杨'}</span>}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                          <h2 className="font-semibold">{author?.name ?? (message.image ? '暮色' : '杨杨杨')}</h2>
                          {author && <span className="text-xs text-muted">{removedAuthor ? '传奇 · 已删除' : message.speaker ? `${message.speaker} · 会话代表` : author.kind === 'legend' ? '传奇' : '集群'}</span>}
                          {message.fromModel && <span className="text-xs text-quiet">{message.fromModel}{message.reasoning ? ` · ${reasoningLabels[message.reasoning]}推理` : ''}</span>}
                          <time className="text-xs tabular-nums text-quiet">{message.time}</time>
                        </div>
                        <p className="mt-1.5 break-words whitespace-pre-wrap leading-[1.75] text-surface-foreground/90">{message.text}</p>
                        {attachment}
                        {task && <TaskLedger task={task} />}
                        {message.image && (
                          <figure className="mt-3 max-w-md overflow-hidden rounded-control border border-line/70 bg-panel">
                            <img src={message.image.src} alt={message.image.name} className={`block max-h-72 w-full object-cover ${message.image.mode === 'edit' ? 'hue-rotate-15 saturate-125' : ''}`} style={{ aspectRatio: message.image.ratio.replace(':', ' / ') }} />
                            <figcaption className="px-3 py-3 text-xs text-muted">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span>{modeName[message.image.mode]} · {message.image.modelName} · {message.image.ratio}</span>
                                <button type="button" onClick={() => attach(message.image)} className="text-primary hover:underline">引用此图</button>
                              </div>
                              {message.image.reference && <p className="mt-1 break-words text-quiet">参考图：{message.image.reference.name}</p>}
                            </figcaption>
                          </figure>
                        )}
                        {message.status === 'streaming' && <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs text-primary"><span className="icon-[lucide--loader-circle] size-3.5" aria-hidden="true" />正在生成回复</p>}
                        {(message.status === 'failed' || message.status === 'stopped') && (
                          <div role="status" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className={message.status === 'failed' ? 'text-rose' : 'text-pollen'}>{message.status === 'failed' ? '连接中断（演示）。已保留收到的内容。' : '回复已停止。已保留收到的内容。'}</span>
                            {message.id && !removedAuthor && <button type="button" disabled={running} onClick={() => retry(message.id!)} className="rounded-control py-1 text-primary hover:underline disabled:opacity-55">重试回复</button>}
                          </div>
                        )}
                        {message.points && (
                          <div className="mt-3 text-sm leading-[1.75]">
                            <p className="font-semibold text-primary">{message.heading}</p>
                            <ol className="mt-1 list-decimal pl-5 text-surface-foreground/90">
                              {message.points.map((point) => <li key={point}>{point}</li>)}
                            </ol>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="py-12">
              <h2 className="text-lg font-semibold">从一条消息开始</h2>
              <p className="mt-2 text-muted">{leader ? `${leader.name}已到场。直接说你想做什么，或用 @ 点名其他伙伴。` : '邀请一位传奇或一支集群，再把你想做的事告诉他们。'}</p>
              <Link to="/invite" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
                <span className="icon-[lucide--plus] size-4" aria-hidden="true" />
                邀请参与者
              </Link>
            </section>
          )}
        </div>
        <div className="shrink-0 px-8 pb-5 pt-3">
          <form className="rounded-control border border-line bg-panel p-3.5 focus-within:border-primary/45" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            {draftImage && (
              <div className="mb-2 flex w-fit max-w-full items-center gap-2 rounded-control border border-line/70 bg-raised px-2 py-1.5 text-xs text-muted" aria-label="待发送附件">
                <img src={draftImage.src} alt="" className="size-7 shrink-0 rounded object-cover" />
                <span className="max-w-44 truncate">{draftImage.name}</span>
                <button type="button" onClick={() => attach()} aria-label="移除图片附件" className="grid size-6 shrink-0 place-items-center rounded-control text-quiet hover:bg-panel hover:text-surface-foreground">
                  <span className="icon-[lucide--x] size-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="relative">
              <textarea ref={composer} aria-label="消息" className="block h-12 w-full resize-none bg-transparent px-1 py-1 text-sm leading-relaxed outline-none placeholder:text-quiet focus-visible:outline-none" placeholder={leader ? `和${leader.name}说点什么，或用 @ 点名…` : '写消息，或用 @ 点名伙伴…'} value={draft} onChange={(event) => { setDraft(event.target.value); setHideMentions(false); setImageNotice(''); }} onKeyDown={(event) => {
                if (event.key === 'Escape') setHideMentions(true);
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (suggestions.length) insertMention(suggestions[0].name);
                  else submit();
                }
              }} />
              {!!suggestions.length && (
                <ul aria-label="点名在场伙伴" className="absolute bottom-full left-0 z-20 mb-2 w-52 rounded-control border border-line bg-panel p-1.5 shadow-xl">
                  {suggestions.map((party) => (
                    <li key={party.id}>
                      <button type="button" onClick={() => insertMention(party.name)} className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-xs hover:bg-raised">
                        <PartyStamp party={party} />
                        <span>{party.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="添加图片附件" title="添加图片附件" onClick={() => attachmentPicker.current?.click()} className="grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-raised hover:text-primary">
                <span className="icon-[lucide--paperclip] size-4" aria-hidden="true" />
              </button>
              <input ref={attachmentPicker} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label="选择图片文件" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
              <ComposerModel key={session.id} startOpen={showModelMenu} options={chatOptions} selected={model} level={level} pick={chooseChatModel} setLevel={(value) => { if (model) chooseReasoning(model, value); }} />
              <div className="ml-auto">
                {running && effectiveMode === 'chat' ? (
                  <button type="button" aria-label="停止生成" title="停止生成" onClick={stop} className="grid size-8 place-items-center rounded-control bg-bark text-pollen hover:bg-raised">
                    <span className="icon-[lucide--square] size-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button type="submit" aria-label="发送" title="发送" disabled={!content || Boolean(blocked) || missingModel} className="grid size-8 place-items-center rounded-control bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-55">
                    <span className="icon-[lucide--arrow-up] size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </form>
          {(attachmentError || imageNotice || (mention && !named && partialMention === undefined) || (needsLeader && draft.trim()) || (missingModel && draft.trim())) && (
            <p className="mt-2 px-1 text-xs text-quiet" aria-live="polite">
              {attachmentError || (imageNotice === 'reference' ? '请附上参考图，或在会话图片上点「引用此图」。' : imageNotice === 'model' ? <Link to="/image-models" className="text-primary hover:underline">还没有可用的{modeName[imageMode ?? 'text']}模型，前往配置</Link> : imageNotice === 'failed' ? '未能生成图片，描述和附件已保留。' : mention && !named && partialMention === undefined ? '点名对象还未加入会话。' : needsLeader ? '请在右侧指定主控，或用 @ 点名在场伙伴。' : <Link to="/models" className="text-primary hover:underline">先启用一个对话模型，草稿会保留。</Link>)}
            </p>
          )}
        </div>
      </main>
      <aside className="flex min-h-0 flex-col border-l border-line/65 bg-panel px-6 pb-6 pt-7" aria-label="会话参与者">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">在场伙伴</h2>
          <span className="text-xs tabular-nums text-quiet">{invited.length} 位 / 组</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">只显示已受邀进入本会话的伙伴。</p>
        <label className="mt-5 block rounded-control border border-primary/25 bg-stamp/40 px-3 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary"><span className="icon-[lucide--flag] size-4" aria-hidden="true" />会话主控</span>
          <select aria-label="本会话主控" value={leader?.id ?? ''} onChange={(event) => chooseLeader(event.target.value)} className="mt-2 block w-full rounded-control bg-panel px-2 py-1.5 text-xs text-surface-foreground">
            <option value="">未指定</option>
            {parties.filter((party) => party.kind === 'legend').map((party) => <option value={party.id} key={party.id}>{party.name}{invited.includes(party) ? '' : ' · 设为主控并邀请'}</option>)}
          </select>
          <span className="mt-2 block text-xs text-muted">{leader?.id === defaultLegend?.id && leader ? '与工作区默认相同。' : '只影响本会话。'} 未点名时由主控接手。</span>
        </label>
        <div className="mt-6 min-h-0 overflow-y-auto">
          {invited.length ? (
            <ul className="relative space-y-6 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-line">
              {invited.map((party) => (
                <li key={party.id} className="relative">
                  <div className="group flex items-center gap-3">
                    <PartyStamp party={party} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{party.name}</div>
                      <p className="mt-1 truncate text-xs text-quiet">{party.kind === 'legend' ? (party.id === leader?.id ? '传奇 · 会话主控' : '传奇 · 独立发言') : `集群 · ${party.members[0]?.name ?? '代表'}代为发言`}</p>
                    </div>
                    <button type="button" aria-label={`移出${party.name}`} onClick={() => setRemoving(removing === party.id ? '' : party.id)} className="grid size-7 shrink-0 place-items-center rounded-control text-quiet hover:bg-raised hover:text-surface-foreground">
                      <span className="icon-[lucide--ellipsis] size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {removing === party.id && (
                    <button type="button" onClick={() => { remove(party.id); setRemoving(''); }} className="ml-12 mt-1 rounded-control bg-raised px-2 py-1 text-xs text-rose hover:text-surface-foreground">移出当前会话</button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-muted">还没有邀请任何伙伴。</p>}
        </div>
        <Link to="/invite" className="mt-6 flex h-9 shrink-0 items-center justify-center gap-2 rounded-control border border-primary/35 text-primary hover:bg-stamp/70">
          <span className="icon-[lucide--user-plus] size-4" aria-hidden="true" />
          邀请参与者
        </Link>
        <div className="mt-8 border-t border-line/65 pt-5">
          <h3 className="text-xs font-medium text-muted">谁会发言？</h3>
          <p className="mt-2 text-xs leading-relaxed text-quiet">点名就直接交给对方。任务分工在原消息下更新，其他会话和任务可以继续。</p>
          <Link to="/roster" className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            查看智能体名册
            <span className="icon-[lucide--arrow-up-right] size-3" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
