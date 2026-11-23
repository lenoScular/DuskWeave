import { parseHTML } from 'linkedom';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuskWelcome } from './DuskWelcome';

const fakes = vi.hoisted(() => ({
  projects: [] as { id: string; name: string; path: string; kind?: 'scratch' }[],
  activeId: null as string | null,
  conversations: {} as Record<string, { id: string; projectId: string; title: string }>,
  selectDirectory: vi.fn(),
  openSettings: vi.fn(),
  addLocalProject: vi.fn(),
  newConversation: vi.fn(),
  selectConversation: vi.fn(),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: (select: (state: unknown) => unknown) =>
    select({ projects: fakes.projects, scratchSessionsEnabled: true, defaultModel: null }),
}));
vi.mock('@/stores/sessions', () => {
  const state = () => ({ ...fakes, order: Object.keys(fakes.conversations) });
  return {
    useSessionsStore: Object.assign((select: (state: unknown) => unknown) => select(state()), {
      getState: state,
    }),
  };
});
vi.mock('@/lib/importLocalProject', () => ({ addLocalProject: fakes.addLocalProject }));
vi.mock('@/stores/settings/sidebarOrderStorage', () => ({
  ARCHIVED_PROJECTS_KEY: 'archived',
  readSidebarOrder: () => [],
}));
vi.mock('@/stores/settings/storage', () => ({ flushElectronPersist: vi.fn() }));
vi.mock('@/components/chat/ChatView', () => ({ ChatView: () => '原型会话主体' }));
vi.mock('./WindowChrome', () => ({ WindowControls: () => null }));

let root: Root;
let container: HTMLElement;

async function click(label: string, scope = 'main') {
  const target = [...container.querySelectorAll<HTMLButtonElement>(`${scope} button`)].find(
    (button) => button.textContent?.trim() === label
  );
  if (!target) throw new Error(`找不到按钮：${label}`);
  await act(async () => target.click());
}

beforeEach(async () => {
  vi.resetAllMocks();
  fakes.projects.length = 0;
  fakes.activeId = null;
  fakes.conversations = {};
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', window.document);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.assign(window, {
    electronAPI: {
      dialog: { selectDirectory: fakes.selectDirectory },
      window: { openSettings: fakes.openSettings },
    },
  });
  container = window.document.getElementById('root') as unknown as HTMLElement;
  root = createRoot(container);
  await act(async () => root.render(createElement(DuskWelcome, { chromeKind: 'mac' })));
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('暮色原型首屏', () => {
  it('保留原图的文案与两个入口，不自行加入传奇选择或演示历史', () => {
    expect(container.querySelector('#dusk-welcome-title')?.textContent).toBe('欢迎来到暮色');
    expect(container.textContent).toContain('传奇与集群可以在你需要时加入。');
    expect(container.textContent).toContain('还没有临时会话');
    expect(container.textContent).toContain('还没有打开项目');
    expect(container.querySelector('input[type="radio"]')).toBeNull();
  });

  it('恢复已有会话仍显示暮色侧栏和原型会话主体', async () => {
    fakes.activeId = 'saved';
    fakes.conversations = { saved: { id: 'saved', projectId: 'scratch', title: '已保存的会话' } };
    await act(async () => root.render(createElement(DuskWelcome, { chromeKind: 'mac' })));
    expect(container.textContent).toContain('原型会话主体');
    expect(container.querySelector('.dusk-start-sidebar')?.textContent).toContain('智能体名册');
    expect(container.querySelector('#dusk-welcome-title')).toBeNull();
  });

  it('新目录只加入项目树并显示空态，不自动建立会话', async () => {
    const project = { id: 'local', name: '林地', path: '/workspace/林地' };
    fakes.selectDirectory.mockResolvedValue(project.path);
    fakes.addLocalProject.mockImplementation(async () => {
      fakes.projects.push(project);
      return { project, focus: { kind: 'new' } };
    });
    await click('打开项目目录');
    expect(container.querySelector('.dusk-folder-hero h1')?.textContent).toBe('林地');
    expect(container.textContent).toContain('这里还没有会话');
    expect(fakes.newConversation).not.toHaveBeenCalled();
  });

  it('重新打开有历史的目录时恢复原会话，取消不会写入', async () => {
    const project = { id: 'local', name: '林地', path: '/workspace/林地' };
    fakes.selectDirectory.mockResolvedValueOnce(undefined).mockResolvedValueOnce(project.path);
    fakes.addLocalProject.mockResolvedValue({
      project,
      focus: { kind: 'select', conversationId: 'saved' },
    });
    await click('打开项目目录');
    expect(fakes.addLocalProject).not.toHaveBeenCalled();
    await click('打开项目目录');
    expect(fakes.selectConversation).toHaveBeenCalledExactlyOnceWith('saved');
    expect(fakes.newConversation).not.toHaveBeenCalled();
  });

  it('桥边初会只打开隔离交互预览，返回不会改变真实会话', async () => {
    await click('体验示例：桥边初会');
    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toMatch(/#\/session-preview$/);
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts');
    await click('返回工作台', '.dusk-preview-strip');
    expect(container.querySelector('iframe')).toBeNull();
    expect(fakes.newConversation).not.toHaveBeenCalled();
  });
});
