import { useState } from 'react';
import type { Member, Party, Session } from './demo';

export type WorkKind = 'task' | 'design';
type StepStatus = 'active' | 'waiting' | 'review' | 'done' | 'stopped';
export type Step = { id: string; who: string; team: string; from: string; role?: string; work: string; status: StepStatus; needs?: string[] };
export type ReviewNote = { id: string; part: string; text: string; version: number };
export type WorkTask = { id: string; sessionId: string; sessionName: string; title: string; owner: string; ownerName: string; ownerMode: string; steps: Step[]; design?: { version: number; status: 'making' | 'review' | 'changes' | 'approved'; notes: ReviewNote[] }; stopped?: boolean };

export const sampleId = 'bridge-design';
const sample: WorkTask = {
  id: sampleId, sessionId: 'bridge', sessionName: '桥边初会', title: '模型连接失败与恢复', owner: 'yun', ownerName: '云深', ownerMode: '会话主控',
  steps: [
    { id: 'draft', who: '微澜', role: '交互设计师', team: '设计集群', from: 'design', work: '交付失败提示与重试画板，待审阅', status: 'review' },
    { id: 'tokens', who: '流萤', role: '视觉设计师', team: '设计集群', from: 'design', work: '复核错误标识及小尺寸反馈', status: 'done' },
    { id: 'build', who: '松锚', role: '后端工程师', team: '开发集群', from: 'dev', work: '梳理不同模型网关的连接错误类型', status: 'active' },
    { id: 'transport', who: '山弦', role: '后端工程师', team: '开发集群', from: 'dev', work: '核对流式连接断开及结束信号', status: 'active' },
    { id: 'form', who: '折羽', role: '前端工程师', team: '开发集群', from: 'dev', work: '梳理草稿保留和重试交互约束', status: 'active' },
    { id: 'check', who: '照径', role: '质量工程师', team: '开发集群', from: 'dev', work: '综合验证失败、草稿保留和恢复流程', status: 'waiting', needs: ['draft', 'build', 'transport', 'form'] },
  ],
  design: { version: 1, status: 'review', notes: [] },
};

export function taskState(task: WorkTask) {
  return task.stopped ? '已停止' : task.steps.every((item) => item.status === 'done') ? '已完成' : task.steps.some((item) => item.status === 'active') ? '进行中' : '待审阅';
}

function settle(steps: Step[]) {
  return steps.map((step) => step.status === 'waiting' && (step.needs ?? []).every((id) => steps.some((item) => item.id === id && item.status === 'done')) ? { ...step, status: 'active' as const } : step);
}

function actor(party: Party, assignment?: Member['assignment']) {
  const member = (assignment ? party.members.find((item) => item.assignment === assignment) : undefined) ?? party.members[0];
  return { who: party.kind === 'cluster' ? member?.name ?? party.name : party.name, team: party.kind === 'cluster' ? party.name : '传奇', from: party.id, role: party.kind === 'cluster' ? member?.role : undefined };
}

export function makeTask(session: Session, owner: Party, ownerMode: string, invited: Party[], title: string, kind: WorkKind): WorkTask {
  const ownerCanDelegate = owner.kind === 'legend';
  const designTeam = ownerCanDelegate ? invited.find((party) => party.id === 'design') ?? owner : owner;
  const devTeam = ownerCanDelegate ? invited.find((party) => party.id === 'dev') : owner.id === 'dev' ? owner : undefined;
  const steps: Step[] = kind === 'design' ? [{ id: 'draft', ...actor(designTeam, 'interaction'), work: '制作可审阅的设计画板', status: 'active' }] : [];
  if (devTeam && (kind === 'task' || devTeam.id !== designTeam.id)) {
    steps.push({ id: 'build', ...actor(devTeam, 'backend'), work: kind === 'design' ? '独立梳理实现约束' : '执行并记录交付结果', status: 'active' });
    const verifier = devTeam.members.some((member) => member.assignment === 'verification');
    if (verifier) steps.push({ id: 'check', ...actor(devTeam, 'verification'), work: '检查交付与原始指令是否一致', status: 'waiting', needs: steps.map((step) => step.id) });
  }
  if (!steps.length) steps.push({ id: 'work', ...actor(owner), work: '执行并记录交付结果', status: 'active' });
  const speaker = owner.kind === 'cluster' ? `${owner.members[0]?.name ?? '代表'} · ${owner.name}` : owner.name;
  return { id: crypto.randomUUID(), sessionId: session.id, sessionName: session.name, title, owner: owner.id, ownerName: speaker, ownerMode, steps, design: kind === 'design' ? { version: 0, status: 'making', notes: [] } : undefined };
}

export function useWorkPreview(withDemo = true) {
  const [tasks, setTasks] = useState<WorkTask[]>(() => withDemo ? [sample] : []);
  function patch(id: string, apply: (task: WorkTask) => WorkTask) {
    setTasks((all) => all.map((task) => task.id === id && !task.stopped ? apply(task) : task));
  }
  return {
    tasks,
    loadDemo: () => setTasks((all) => all.some((item) => item.id === sampleId) ? all : [...all, sample]),
    add: (task: WorkTask) => setTasks((all) => [...all, task]),
    renameSession: (id: string, name: string) => setTasks((all) => all.map((task) => task.sessionId === id ? { ...task, sessionName: name } : task)),
    removeSession: (id: string) => setTasks((all) => all.filter((task) => task.sessionId !== id)),
    finish: (id: string, stepId: string) => patch(id, (task) => {
      if (!task.steps.some((step) => step.id === stepId && step.status === 'active')) return task;
      if (stepId === 'draft' && task.design) {
        return { ...task, design: { ...task.design, version: task.design.version + 1, status: 'review' }, steps: task.steps.map((step) => step.id === stepId ? { ...step, status: 'review' } : step) };
      }
      return { ...task, steps: settle(task.steps.map((step) => step.id === stepId ? { ...step, status: 'done' } : step)) };
    }),
    stop: (id: string) => patch(id, (task) => ({ ...task, stopped: true, steps: task.steps.map((step) => step.status === 'done' ? step : { ...step, status: 'stopped' }) })),
    review: (id: string, part: string, text: string) => {
      const noteId = crypto.randomUUID();
      patch(id, (task) => {
        if (!task.design || task.design.status !== 'review' || !text.trim()) return task;
        const note = { id: noteId, part, text: text.trim(), version: task.design.version };
        return { ...task, design: { ...task.design, status: 'changes', notes: [...task.design.notes, note] }, steps: task.steps.map((step) => step.id === 'draft' ? { ...step, status: 'active' } : step) };
      });
    },
    approve: (id: string) => patch(id, (task) => {
      if (!task.design || task.design.status !== 'review') return task;
      return { ...task, design: { ...task.design, status: 'approved' }, steps: settle(task.steps.map((step) => step.id === 'draft' ? { ...step, status: 'done' } : step)) };
    }),
  };
}
