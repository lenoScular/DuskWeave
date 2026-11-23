import {
  ArrowUpRight,
  ChevronRight,
  Flag,
  FolderOpen,
  MessageSquareDashed,
  Pencil,
  Plus,
  UserPlus,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import buzhi from '@/assets/dusk/buzhi-avatar.jpg';
import forest from '@/assets/dusk/dusk-forest.svg';
import yunshen from '@/assets/dusk/yunshen-avatar.jpg';
import { type WindowChromeKind, WindowControls } from './WindowChrome';
import './duskConversation.css';

export interface DuskConversationActions {
  chromeKind: WindowChromeKind;
  onInvite: () => void;
  onRoster: () => void;
  onModels: () => void;
}

const avatars: Record<string, string> = { 云深: yunshen, 不知: buzhi };

export function DuskConversation({
  scope,
  title,
  legend,
  locked,
  children,
  actions,
  onRename,
  onLegend,
}: {
  scope?: string;
  title: string;
  legend?: string;
  locked: boolean;
  children: ReactNode;
  actions: DuskConversationActions;
  onRename: (name: string) => void;
  onLegend: (name: string) => Promise<void>;
}) {
  const rename = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(title);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const ScopeIcon = scope ? FolderOpen : MessageSquareDashed;
  const face = legend ? avatars[legend] : undefined;
  const legendNames = [...new Set([...(legend ? [legend] : []), '云深', '不知'])];

  useEffect(() => () => rename.current?.close(), []);

  async function changeLegend(value: string) {
    if (changing || locked || !value || value === legend) return;
    setChanging(true);
    setError('');
    try {
      await onLegend(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '暂时无法设置会话主控');
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="dusk-conversation" data-dusk="conversation">
      <section className="dusk-conversation-main" aria-label="会话">
        <header
          className="dusk-start-header dusk-conversation-header drag-region"
          data-enso="title-bar"
        >
          <span className={`dusk-conversation-scope${scope ? '' : ' dusk-scope-loose'}`}>
            <ScopeIcon size={16} aria-hidden="true" />
            {scope ?? '临时会话'}
          </span>
          <ChevronRight size={14} aria-hidden="true" />
          <button
            type="button"
            className="dusk-conversation-rename no-drag"
            aria-label="重命名当前会话"
            title="重命名会话"
            onClick={() => {
              setName(title);
              rename.current?.showModal();
            }}
          >
            <span>{title}</span>
            <Pencil size={14} aria-hidden="true" />
          </button>
        </header>
        <div className="dusk-conversation-cover-space">
          <section className="dusk-conversation-cover" aria-label="会话封面">
            <img src={forest} alt="" />
            <div>
              <h1>{title}</h1>
              <p>{scope ? '这场会话属于当前目录。' : '这场会话未关联目录，不会使用项目文件。'}</p>
            </div>
          </section>
        </div>
        {children}
      </section>
      <aside className="dusk-companions" aria-label="会话参与者">
        {actions.chromeKind !== 'mac' && actions.chromeKind !== 'mobile' && (
          <div className="dusk-companions-controls drag-region">
            <WindowControls kind={actions.chromeKind} />
          </div>
        )}
        <div className="dusk-companions-heading">
          <h2>在场伙伴</h2>
          <span>{legend ? 1 : 0} 位 / 组</span>
        </div>
        <p className="dusk-companions-caption">只显示已受邀进入本会话的伙伴。</p>
        <label className="dusk-conversation-leader">
          <span>
            <Flag size={16} aria-hidden="true" /> 会话主控
          </span>
          <select
            aria-label="本会话主控"
            value={legend ?? ''}
            disabled={locked || changing}
            onChange={(event) => void changeLegend(event.target.value)}
          >
            {!legend && <option value="">未指定</option>}
            {legendNames.map((value) => (
              <option key={value} value={value}>
                {value}
                {value !== legend ? ' · 设为主控并邀请' : ''}
              </option>
            ))}
          </select>
          <small>
            {legend === '云深' ? '与工作区默认相同。' : '只影响本会话。'} 未点名时由主控接手。
          </small>
        </label>
        {error && (
          <p role="alert" className="dusk-start-error">
            {error}
          </p>
        )}
        <div className="dusk-companions-list">
          {legend ? (
            <div className="dusk-companion-row">
              {face ? (
                <img src={face} alt="" />
              ) : (
                <span aria-hidden="true">{legend.slice(0, 1)}</span>
              )}
              <div>
                {legend}
                <small>传奇 · 会话主控</small>
              </div>
            </div>
          ) : (
            <p>还没有邀请任何伙伴。</p>
          )}
        </div>
        <button type="button" className="dusk-companions-invite" onClick={actions.onInvite}>
          <UserPlus size={16} aria-hidden="true" />
          邀请参与者
        </button>
        <div className="dusk-companions-note">
          <h3>谁会发言？</h3>
          <p>点名就直接交给对方。任务分工在原消息下更新，其他会话和任务可以继续。</p>
          <button type="button" onClick={actions.onRoster}>
            查看智能体名册
            <ArrowUpRight size={12} aria-hidden="true" />
          </button>
        </div>
      </aside>
      <dialog
        ref={rename}
        className="dusk-session-rename-dialog"
        aria-labelledby="dusk-rename-heading"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            onRename(name.trim());
            rename.current?.close();
          }}
        >
          <h2 id="dusk-rename-heading">重命名会话</h2>
          <label>
            会话名称
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <div>
            <button
              type="button"
              className="dusk-welcome-quiet"
              onClick={() => rename.current?.close()}
            >
              取消
            </button>
            <button type="submit" className="dusk-welcome-primary" disabled={!name.trim()}>
              保存
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export function DuskConversationEmpty({
  legend,
  onInvite,
}: {
  legend?: string;
  onInvite: () => void;
}) {
  return (
    <section className="dusk-conversation-empty">
      <h2>从一条消息开始</h2>
      <p>
        {legend
          ? `${legend}已到场。直接说你想做什么，或用 @ 点名其他伙伴。`
          : '邀请一位传奇或一支集群，再把你想做的事告诉他们。'}
      </p>
      <button type="button" onClick={onInvite}>
        <Plus size={16} aria-hidden="true" />
        邀请参与者
      </button>
    </section>
  );
}
