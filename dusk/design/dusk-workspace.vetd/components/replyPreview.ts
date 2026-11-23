import { useEffect, useRef } from 'react';
import type { Message, Party, Session } from './demo';
import type { ChatModel, Reasoning } from './chat-models';
import type { ImageAsset } from './mediaPreview';

const sampleReplies: Record<string, string> = {
  yun: '我会先把目标拆成一个可以验证的步骤。接下来，我们可以明确什么样的结果才算走通，再把这个步骤交给最合适的伙伴。',
  bu: '我先记下这条。下一步我会把已经确认的事实和还没回答的问题分开，并检查这次讨论有没有遗漏约束。',
  dev: '我会先明确会话、参与者和消息的边界，再用一次完整对话验证这三个部分。这样可以在增加成员之前发现接口问题。',
  design: '我会先画出从发起会话到收到回复的路径，然后补邀请、空状态与结果反馈。先确认操作，再决定哪些信息要留在首屏。',
};

type Patch = (id: string, apply: (entry: Session) => Session) => void;

export function useReplyPreview(patch: Patch) {
  const jobs = useRef(new Map<string, { timer: number; messageId: string }>());
  useEffect(() => {
    const running = jobs.current;
    return () => { running.forEach(({ timer }) => window.clearInterval(timer)); running.clear(); };
  }, []);

  function change(sessionId: string, messageId: string, fields: Partial<Message>) {
    patch(sessionId, (entry) => ({ ...entry, messages: entry.messages.map((m) => m.id === messageId ? { ...m, ...fields } : m) }));
  }

  function run(sessionId: string, msg: Message, interrupt = false) {
    if (!msg.id || !msg.previewReply || jobs.current.has(sessionId)) return;
    const id = msg.id;
    const chars = Array.from(msg.previewReply);
    const end = interrupt ? Math.floor(chars.length / 2) : chars.length;
    let count = 0;
    const timer = window.setInterval(() => {
      count = Math.min(count + 4, end);
      const status = count < end ? 'streaming' : interrupt ? 'failed' : 'done';
      change(sessionId, id, { status, text: chars.slice(0, count).join('') });
      if (count >= end) {
        window.clearInterval(timer);
        jobs.current.delete(sessionId);
      }
    }, 145);
    jobs.current.set(sessionId, { timer, messageId: id });
  }

  return {
    send(session: Session, text: string, party?: Party, model?: ChatModel, interrupt?: boolean, attachment?: ImageAsset, reasoning?: Reasoning) {
      if (jobs.current.has(session.id)) return false;
      const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const reply: Message | undefined = party ? {
        id: crypto.randomUUID(), author: party.id, time, text: '', status: 'streaming',
        speaker: party.kind === 'cluster' ? party.members[0]?.name : undefined,
        fromModel: model?.name,
        reasoning,
        previewReply: sampleReplies[party.id] ?? `我是${party.name}。我会先确认你的目标、约束和预期交付，再按我的职责给出第一步建议。`,
      } : undefined;
      patch(session.id, (entry) => ({
        ...entry,
        when: '刚刚',
        name: entry.namePinned || entry.messages.length ? entry.name : Array.from(text).slice(0, 16).join(''),
        snippet: text,
        messages: [...entry.messages, { author: 'self', time, text, attachment }, ...(reply ? [reply] : [])],
      }));
      if (reply) run(session.id, reply, interrupt);
      return true;
    },
    stop(sessionId: string) {
      const job = jobs.current.get(sessionId);
      if (!job) return;
      window.clearInterval(job.timer);
      jobs.current.delete(sessionId);
      change(sessionId, job.messageId, { status: 'stopped' });
    },
    retry(session: Session, id: string) {
      const msg = session.messages.find((m) => m.id === id);
      if (!msg?.previewReply || (msg.status !== 'failed' && msg.status !== 'stopped') || jobs.current.has(session.id)) return;
      change(session.id, id, { status: 'streaming', text: '' });
      run(session.id, msg);
    },
  };
}
