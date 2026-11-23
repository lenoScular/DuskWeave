import { Link } from 'react-router';
import { useWorkspace } from '../frames/_layout';
import { PartyStamp } from './PartyStamp';
import { taskState } from './workPreview';
import type { Step, WorkTask } from './workPreview';

const stepState: Record<Step['status'], { text: string; style: string; icon: string }> = {
  active: { text: '执行中', style: 'text-primary', icon: 'icon-[lucide--circle-dot]' },
  review: { text: '待审阅', style: 'text-iris', icon: 'icon-[lucide--eye]' },
  waiting: { text: '等待依赖', style: 'text-quiet', icon: 'icon-[lucide--clock-3]' },
  done: { text: '已完成', style: 'text-cool', icon: 'icon-[lucide--check]' },
  stopped: { text: '已停止', style: 'text-pollen', icon: 'icon-[lucide--square]' },
};

export function TaskLedger({ task }: { task: WorkTask }) {
  const { parties, work } = useWorkspace();
  const owner = parties.find((party) => party.id === task.owner);
  const state = taskState(task);
  const teams = new Set(task.steps.filter((step) => !step.needs?.length).map((step) => step.from));
  const sketch = task.design;
  const latestNote = sketch?.notes.at(-1);
  const active = task.steps.filter((step) => step.status === 'active');

  return (
    <section id={`task-${task.id}`} aria-label={`任务：${task.title}`} className="mt-3 scroll-mt-3 rounded-control border border-line/70 bg-panel">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-3">
          {owner && <PartyStamp party={owner} />}
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-baseline gap-x-2 font-semibold">
              {task.ownerName}
              <span className="text-xs font-normal text-quiet">{task.ownerMode}</span>
            </h3>
            <p role="status" className="mt-0.5 text-xs text-muted">{state === '已完成' ? '已汇总交付，所有步骤完成。' : state === '已停止' ? '任务已停止，已完成的结果保留。' : teams.size > 1 ? '已接单。设计与开发独立推进，验证等待所需结果。' : '已接单，分工和进度如下。'}</p>
          </div>
        </div>
        <span className={`shrink-0 whitespace-nowrap text-xs ${state === '已完成' ? 'text-cool' : state === '已停止' ? 'text-pollen' : 'text-primary'}`}>{state}</span>
      </div>
      <div className="mx-4 mt-0.5 flex items-center justify-between gap-3 border-b border-line/70 pb-2 text-xs">
        <h4 className="font-semibold">执行分工</h4>
        {teams.size > 1 && <span className="flex items-center gap-1.5 text-cool"><span className="icon-[lucide--git-fork] size-3.5" aria-hidden="true" />跨集群异步</span>}
      </div>
      <ul className="mx-4 divide-y divide-line/50" aria-label="成员执行状态">
        {task.steps.map((step) => {
          const label = stepState[step.status];
          const member = parties.find((party) => party.id === step.from)?.members.find((entry) => entry.name === step.who);
          const pending = (step.needs ?? []).filter((id) => !task.steps.some((item) => item.id === id && item.status === 'done'));
          const waitingOn = task.steps.filter((item) => pending.includes(item.id)).map((item) => item.who);
          return (
            <li key={step.id} data-step={step.id} data-status={step.status} className="grid grid-cols-[minmax(0,144px)_minmax(0,1fr)_84px] items-start gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {member?.avatar && <img src={member.avatar.src} alt="" className="size-7 shrink-0 rounded-full object-cover" />}
                <p className="min-w-0 break-words font-medium">{step.who}<span className="mt-0.5 block text-xs font-normal text-quiet">{step.role ? `${step.team} · ${step.role}` : step.team}</span></p>
              </div>
              <p className="min-w-0 break-words text-xs leading-relaxed text-muted">{step.work}{step.status === 'waiting' && waitingOn.length > 0 && <span className="block text-quiet">等待：{waitingOn.join('、')}的结果</span>}</p>
              <span className={`flex items-center justify-end gap-1.5 whitespace-nowrap text-xs ${label.style}`}><span className={`${label.icon} size-3.5`} aria-hidden="true" />{label.text}</span>
            </li>
          );
        })}
      </ul>
      {sketch && (
        <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-control bg-raised px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="icon-[lucide--panels-top-left] size-4 shrink-0 text-iris" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{task.title}</p>
              <p className="mt-0.5 text-xs text-quiet">{sketch.version ? `版本 ${sketch.version} · ${sketch.status === 'approved' ? '已通过' : sketch.status === 'changes' ? '修订中' : '可预览与批注'}` : '画板制作中 · 尚无可审阅版本'}</p>
            </div>
          </div>
          <Link to={`/design?task=${encodeURIComponent(task.id)}`} className="whitespace-nowrap rounded-control border border-iris/35 px-2.5 py-1.5 text-xs text-iris hover:bg-thicket">打开设计画布</Link>
        </div>
      )}
      {latestNote && <p className="mx-4 mb-3 break-words text-xs text-muted">已收到「{latestNote.part}」的审阅反馈：{latestNote.text}</p>}
      {(active.length > 0 || (!task.stopped && state !== '已完成')) && (
        <div className="mx-4 flex flex-wrap items-start justify-between gap-2 border-t border-line/65 py-2.5 text-xs text-quiet">
          <details className="min-w-0 flex-1" onToggle={(event) => { if (event.currentTarget.open) event.currentTarget.scrollIntoView({ block: 'nearest' }); }}>
            <summary className="w-fit cursor-pointer hover:text-surface-foreground">推进演示</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {active.map((step) => (
                <button type="button" key={step.id} onClick={() => work.finish(task.id, step.id)} className="rounded-control border border-line px-2 py-1 text-muted hover:text-primary">{step.id === 'draft' ? '提交设计版本' : `${step.who}交付`}</button>
              ))}
              {!active.length && <p>当前没有可推进步骤，请先处理设计审阅。</p>}
            </div>
          </details>
          <button type="button" onClick={() => work.stop(task.id)} className="shrink-0 rounded-control text-muted hover:text-rose">停止此任务</button>
        </div>
      )}
    </section>
  );
}
