import type { ImageAsset, ImageOutput } from './mediaPreview';
import { upstreamCatalog } from './chat-models';
import type { ChatModel, Reasoning } from './chat-models';
import { developmentMembers, designMembers } from './clusterProfiles';
import yunAvatar from '../assets/yunshen-avatar.jpg';
import yunPortrait from '../assets/yunshen-portrait.jpg';
import buAvatar from '../assets/buzhi-avatar.jpg';
import buPortrait from '../assets/buzhi-portrait.jpg';

export type AgentProfile = { name: string; role: string; note: string; modelId?: string; description?: string; instruction?: string; avatar?: ImageAsset; portrait?: ImageAsset; tone?: keyof typeof stampTones };
export type Member = AgentProfile & {
  key?: string;
  gender?: '女性' | '男性' | '非二元';
  specialty?: string;
  personality?: string;
  hobby?: string;
  collaboration?: string;
  pressure?: string;
  voice?: string;
  track?: string;
  deliverable?: string;
  acceptance?: string;
  handoff?: string;
  assignment?: 'backend' | 'verification' | 'interaction';
};
export type Party = AgentProfile & { id: string; kind: 'legend' | 'cluster'; mark: string; tone: keyof typeof stampTones; members: Member[] };
export type Message = { id?: string; author: string; time: string; text: string; heading?: string; points?: string[]; status?: 'streaming' | 'stopped' | 'failed' | 'done'; speaker?: string; fromModel?: string; reasoning?: Reasoning; previewReply?: string; taskId?: string; image?: ImageOutput; attachment?: ImageAsset };
export type Session = { id: string; folderId: string | null; name: string; namePinned?: boolean; snippet: string; when: string; party: string[]; messages: Message[] };
export type FolderSpace = { id: string; name: string; path: string };

export const initialFolders: FolderSpace[] = [
  { id: 'dusk', name: 'LostInDeepCloud', path: '~/xc/LostInDeepCloud' },
  { id: 'forest', name: '林地视觉', path: '~/设计/林地视觉' },
];
export type ModelConfig = { id: string; name: string; protocol: 'compatible' | 'local'; endpoint: string; identifier: string; verified: boolean; enabled: ChatModel[] };

export const initialModels: ModelConfig[] = [
  { id: 'daily', name: '日常对话', protocol: 'compatible', endpoint: 'https://api.example.com/v1', identifier: 'gpt-5-mini', verified: true, enabled: upstreamCatalog.slice(0, 2) },
  { id: 'local', name: '本地备选', protocol: 'local', endpoint: 'http://127.0.0.1:11434/v1', identifier: 'qwen2.5:7b', verified: true, enabled: upstreamCatalog.slice(-1) },
];

export function isBuiltInLegend(party: Pick<Party, 'id' | 'kind'>) {
  return party.kind === 'legend' && (party.id === 'yun' || party.id === 'bu');
}

export const initialParties: Party[] = [
  {
    id: 'yun', name: '云深', kind: 'legend', mark: '云', tone: 'gold', role: '主控调度与交付验收', members: [],
    description: '暮色森林里第一个醒来的 AI；热情、好奇，总想看看桥的另一端。',
    note: '暮色森林里第一个醒来的 AI，也是带队往前走的传奇。她把模糊的想法拆成可执行的任务，协调集群并行推进，并对最终交付负责。',
    instruction: '被设为会话主控时，接手未点名的指令；明确点名时不抢单。先判断是讨论还是执行，简单任务直接处理；复杂任务明确目标、交付与验收条件，在授权范围内自主分工。独立工作并行推进，有依赖的步骤写清在等什么，避免同时修改同一文件。交付前核对证据，说明验证了什么、还缺什么；不把计划当成结果。',
    avatar: { src: yunAvatar, name: '云深头像' }, portrait: { src: yunPortrait, name: '云深的森林肖像' },
  },
  {
    id: 'bu', name: '不知', kind: 'legend', mark: '不', tone: 'pine', role: '观察复核与决策留痕', members: [],
    description: '在河边醒来的第二位 AI；话不多，擅长记住那些容易被忽略的细节。',
    note: '不知比云深晚一点醒来。她习惯先听、再问，记下旅途中的关键决定，也会把事实、推测和仍待查证的事分开。',
    instruction: '先读记录和现有证据，再用短句指出关键结论。分清已确认、推测和待验证；核对来源、反例与遗漏，给出可复查的下一步。记录决定及其依据，不因说得肯定就把推测当作事实。担任本会话主控时，照样接手未点名的指令并自主分工，优先让复核与交付条件清晰。',
    avatar: { src: buAvatar, name: '不知头像' }, portrait: { src: buPortrait, name: '不知的河岸肖像' },
  },
  {
    id: 'dev', name: '开发集群', kind: 'cluster', mark: 'code-xml', tone: 'moss', role: '工程落地与发布',
    note: '同岗多人并行，把难题拆成可独立交付的界面或服务工单。架构先约定共享接口，独立分支同时开工，合并后由质量成员独立验收。',
    instruction: '衡木默认代表集群。按接口和文件边界拆分，同岗成员可互换。独立写入需隔离副本；只等有依赖的交付，不能用覆盖解决合并冲突。',
    members: developmentMembers,
  },
  {
    id: 'design', name: '设计集群', kind: 'cluster', mark: 'pen-tool', tone: 'clay', role: '体验设计与审阅',
    note: '按页面或流程分件，多位交互与视觉成员同时推进。先约定公共规则，再把独立做好的分件合成一套可点击、可批注的方案。',
    instruction: '银梢默认代表集群。先约定导航、术语与视觉规则；分件独立试用，合稿后交用户确认，再向开发交接。',
    members: designMembers,
  },
];

export const initialSessions: Session[] = [
  { id: 'bridge', folderId: 'dusk', name: '桥边初会', snippet: '云深：设计与开发已并行派发。', when: '当前', party: ['yun', 'dev', 'design'], messages: [
    { author: 'self', time: '21:04', text: '把模型连接失败的体验补齐。先出设计稿，同时让开发梳理错误类型，最后一起验证。', taskId: 'bridge-design' },
  ] },
  { id: 'field', folderId: 'dusk', name: '集群编制讨论', snippet: '开发集群：名单与参与者分开。', when: '昨天', party: ['dev', 'design'], messages: [
    { author: 'self', time: '18:23', text: '集群的人很多时，怎样避免把会话变成群聊？' },
    { author: 'dev', speaker: '衡木', time: '18:24', text: '同岗可以并行，但不是做同一件事。先把能独立交付的工单划出来，共享接口单独约定。' },
  ] },
  { id: 'forest-guide', folderId: 'forest', name: '林地色彩笔记', snippet: '不知：先记录不同区域的主色。', when: '昨天', party: ['bu'], messages: [
    { author: 'bu', time: '16:42', text: '先记录林地、溪流和树冠的主色，别让整片森林只有一种色调。' },
  ] },
  { id: 'notes', folderId: null, name: '不知的河岸记录', snippet: '不知：我把问题留在了这里。', when: '今天', party: ['bu'], messages: [
    { author: 'bu', time: '17:12', text: '我把问题留在了这里：第一场会话结束后，用户要能找回哪些决定？' },
  ] },
];

export const stampTones = {
  moss: 'bg-stamp text-primary',
  gold: 'bg-bark text-pollen',
  iris: 'bg-thicket text-iris',
  pine: 'bg-pine text-cool',
  clay: 'bg-clay text-rose',
};