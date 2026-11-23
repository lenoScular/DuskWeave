import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { area, primary, secondary } from './SettingsParts';
import { sampleId } from './workPreview';
import type { WorkTask } from './workPreview';

type Part = '整张画板' | '状态提示' | '重试按钮';
const reviewLabels = { making: '制作中', review: '待审阅', changes: '修订中', approved: '已通过' };

function ReviewCanvas({ task }: { task: WorkTask }) {
  const { work, selectSession } = useWorkspace();
  const sketch = task.design!;
  const [pickedVersion, setPickedVersion] = useState<number>();
  const [view, setView] = useState<'design' | 'preview'>('design');
  const [part, setPart] = useState<Part>('整张画板');
  const [note, setNote] = useState('');
  const [recovered, setRecovered] = useState(false);
  const [notice, setNotice] = useState('');
  const version = pickedVersion ?? sketch.version;
  const isLatest = version === sketch.version;
  const canReview = isLatest && !task.stopped && sketch.status === 'review';
  const visibleNotes = sketch.notes.filter((item) => item.version === version);
  const drafter = task.steps.find((step) => step.id === 'draft');

  function openVersion(next: number) {
    setPickedVersion(next === sketch.version ? undefined : next);
    setPart('整张画板');
    setRecovered(false);
    setNote('');
    setNotice('');
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line/70 px-6">
        <div className="flex min-w-0 items-center gap-2.5 text-sm">
          <Link to="/design" className="shrink-0 text-muted hover:text-primary">设计画布</Link>
          <span className="icon-[lucide--chevron-right] size-3.5 shrink-0 text-quiet" aria-hidden="true" />
          <span className="truncate">{task.title}</span>
        </div>
        <Link to={`/?task=${encodeURIComponent(task.id)}`} onClick={() => selectSession(task.sessionId)} className={`${secondary} shrink-0`}>
          <span className="icon-[lucide--messages-square] size-4" aria-hidden="true" />
          返回原会话
        </Link>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[192px_minmax(0,1fr)_292px]">
        <aside className="overflow-auto border-r border-line/65 bg-panel px-4 py-6" aria-label="版本历史">
          <h2 className="mb-3 px-2 font-semibold">版本记录</h2>
          {!sketch.version ? <p className="px-2 text-xs text-muted">提交初稿后会保留每次交付。</p> : (
            <ul className="space-y-1.5">
              {Array.from({ length: sketch.version }, (_, index) => sketch.version - index).map((item) => (
                <li key={item}>
                  <button type="button" onClick={() => openVersion(item)} aria-pressed={item === version} className={`flex w-full items-center justify-between gap-2 rounded-control px-2.5 py-2.5 text-left text-sm ${item === version ? 'bg-raised text-surface-foreground' : 'text-muted hover:bg-surface'}`}>
                    <span>版本 {item}</span>
                    <span className="shrink-0 text-xs text-quiet">{item === sketch.version ? '最新' : '历史'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-7 px-2">
            <h3 className="text-xs font-semibold">来源任务</h3>
            <p className="mt-2 break-words text-xs leading-relaxed text-muted">{task.sessionName}</p>
            <p className="mt-1 break-words text-xs text-quiet">负责人：{task.ownerName}</p>
            {drafter && <p className="mt-1 break-words text-xs text-quiet">设计：{drafter.who}</p>}
          </div>
        </aside>
        <main className="min-h-0 min-w-0 overflow-auto bg-surface px-6 pb-6 pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words font-display text-[30px] font-semibold leading-tight">{task.title}</h1>
              <p className="mt-1 text-xs text-quiet">{version ? `版本 ${version}` : '尚无可审阅版本'} · {task.stopped ? '任务已停止' : isLatest ? reviewLabels[sketch.status] : '历史画板'}</p>
            </div>
            {version > 0 && (
              <div className="flex rounded-control border border-line/75 p-0.5" aria-label="画布模式">
                <button type="button" onClick={() => setView('design')} aria-pressed={view === 'design'} className={`rounded-control px-2.5 py-1.5 text-xs ${view === 'design' ? 'bg-raised text-primary' : 'text-muted'}`}>审阅</button>
                <button type="button" onClick={() => { setView('preview'); setRecovered(false); }} aria-pressed={view === 'preview'} className={`rounded-control px-2.5 py-1.5 text-xs ${view === 'preview' ? 'bg-raised text-primary' : 'text-muted'}`}>交互预览</button>
              </div>
            )}
          </div>
          {version ? (
            <div className="flex min-h-[436px] items-center justify-center rounded-control border border-line/60 bg-rail p-5">
              <div className="w-full max-w-[480px] overflow-hidden rounded-control border border-line bg-panel">
                <div className="flex items-center justify-between gap-2 border-b border-line/65 px-4 py-3">
                  <span className="flex items-center gap-2 text-xs text-quiet"><span className="icon-[lucide--layout-template] size-4" aria-hidden="true" />示例画板 · 连接状态</span>
                  <span className="text-xs text-quiet">桌面</span>
                </div>
                <div className="px-5 pb-5 pt-5">
                  <h2 className="font-display text-[26px] font-semibold leading-tight">测试模型连接</h2>
                  <p className="mt-2 text-xs text-muted">检查「日常对话」是否可以连接。</p>
                  {view === 'design' ? (
                    <button type="button" aria-pressed={part === '状态提示'} onClick={() => setPart('状态提示')} className={`mt-5 block w-full rounded-control border bg-clay/75 px-3 py-3 text-left ${part === '状态提示' ? 'border-iris ring-2 ring-iris/30' : 'border-rose/25 hover:border-iris/60'}`}>
                      <span className="flex items-center gap-2 font-semibold text-rose"><span className="icon-[lucide--circle-alert] size-4" aria-hidden="true" />连接没有成功</span>
                      <span className="mt-1 block text-xs leading-relaxed text-surface-foreground">{version === 1 ? '没有收到服务响应。请检查地址或稍后重试。' : '服务未响应。已保留地址和模型配置，可以直接重试。'}</span>
                    </button>
                  ) : (
                    <div role="status" className={`mt-5 rounded-control border px-3 py-3 ${recovered ? 'border-cool/35 bg-pine/75' : 'border-rose/25 bg-clay/75'}`}>
                      <p className={`font-semibold ${recovered ? 'text-cool' : 'text-rose'}`}>{recovered ? '连接已恢复（演示）' : '连接没有成功'}</p>
                      <p className="mt-1 text-xs text-surface-foreground">{recovered ? '已收到模拟响应。配置没有丢失。' : version === 1 ? '没有收到服务响应。请检查地址或稍后重试。' : '服务未响应。已保留地址和模型配置，可以直接重试。'}</p>
                    </div>
                  )}
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <span className="text-xs text-quiet">{view === 'design' ? '选择元素可定位批注' : '不会发送网络请求'}</span>
                    <button type="button" aria-pressed={view === 'design' ? part === '重试按钮' : undefined} onClick={() => view === 'design' ? setPart('重试按钮') : setRecovered((value) => !value)} className={`${primary} ${view === 'design' && part === '重试按钮' ? 'ring-2 ring-iris ring-offset-2 ring-offset-panel' : ''}`}>{view === 'preview' && recovered ? '重新演示' : '重试连接'}</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-control border border-line/70 bg-panel p-6">
              <h2 className="text-lg font-semibold">等第一版画板</h2>
              <p className="mt-2 text-sm text-muted">{drafter?.who ?? '设计成员'}已接手。设计和其他步骤各自推进。</p>
              {!task.stopped && <button type="button" className={`${secondary} mt-4`} onClick={() => { setPickedVersion(undefined); work.finish(task.id, 'draft'); }}>提交初稿（演示）</button>}
            </div>
          )}
          <p className="mt-3 text-xs text-quiet">这是设计能力的演示画板，用于体验审阅和回流流程，并非现场生成。</p>
        </main>
        <aside className="min-h-0 overflow-y-auto border-l border-line/65 bg-panel px-5 py-6" aria-label="设计审阅">
          <h2 className="text-lg font-semibold">设计审阅</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">审阅结论会回到原任务，不打断其他集群。</p>
          {canReview && (
            <form className="mt-5" onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; work.review(task.id, part, note); setNote(''); setNotice('已将修改意见发回原任务。'); }}>
              <label className="block text-xs">批注位置
                <select value={part} onChange={(event) => setPart(event.target.value as Part)} className="mt-2 block h-9 w-full rounded-control border border-line bg-surface px-2.5 text-sm">
                  <option>整张画板</option>
                  <option>状态提示</option>
                  <option>重试按钮</option>
                </select>
              </label>
              <label className="mt-4 block text-xs">修改意见
                <textarea rows={3} className={area} maxLength={240} placeholder="例如：让用户知道配置还在。" value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
              <button type="submit" disabled={!note.trim()} className={`${secondary} mt-3 w-full`}>发送修改意见</button>
              <button type="button" onClick={() => { work.approve(task.id); setNotice('已通过此版本，并通知会话负责人。'); }} className={`${primary} mt-2 w-full`}>通过此版本</button>
            </form>
          )}
          {!task.stopped && isLatest && sketch.status === 'changes' && (
            <div className="mt-5">
              <p className="text-sm text-iris">设计方正在修订</p>
              <button type="button" className={`${secondary} mt-3 w-full`} onClick={() => { setPickedVersion(undefined); setNotice('已提交新版，旧版仍可查看。'); work.finish(task.id, 'draft'); }}>提交修订版（演示）</button>
            </div>
          )}
          {isLatest && sketch.status === 'approved' && <p className="mt-5 text-sm text-cool">当前版本已通过</p>}
          {!isLatest && <p className="mt-5 text-xs text-quiet">正在查看旧版，只能查看当时留下的批注。</p>}
          {notice && <p role="status" className="mt-3 text-xs text-cool">{notice}</p>}
          {version > 0 && (
            <div className="mt-6 border-t border-line/65 pt-4">
              <h3 className="text-sm font-semibold">版本批注</h3>
              {!visibleNotes.length && <p className="mt-2 text-xs text-quiet">此版本暂无批注。</p>}
              <ul className="mt-2 space-y-3">
                {visibleNotes.map((item) => (
                  <li key={item.id} className="border-b border-line/60 pb-3 text-xs">
                    <button type="button" className="text-iris hover:underline" onClick={() => { setView('design'); setPart(item.part as Part); }}>{item.part}</button>
                    <p className="mt-1 break-words leading-relaxed text-muted">{item.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export function DesignDesk() {
  const { work } = useWorkspace();
  const [params] = useSearchParams();
  const designs = work.tasks.filter((task) => task.design);
  const task = designs.find((item) => item.id === params.get('task'));
  const sample = designs.find((item) => item.id === sampleId);
  const listed = designs.length === 1 && sample && !params.get('task') ? sample : task;
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {listed ? <ReviewCanvas key={listed.id} task={listed} /> : (
        <main className="min-h-0 overflow-auto px-8 py-7">
          <h1 className="font-display text-[38px] font-semibold">设计画布</h1>
          <p className="mt-2 text-muted">从会话发起设计任务，稿件、版本和批注在这里汇合。</p>
          <ul className="mt-5 max-w-3xl divide-y divide-line/70">
            {designs.map((item) => (
              <li key={item.id}>
                <Link to={`/design?task=${encodeURIComponent(item.id)}`} className="flex items-center justify-between gap-4 rounded-control px-3 py-4 hover:bg-panel">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-quiet">{item.sessionName} · {item.ownerName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-iris">{item.stopped ? '已停止' : reviewLabels[item.design!.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </main>
      )}
    </div>
  );
}
