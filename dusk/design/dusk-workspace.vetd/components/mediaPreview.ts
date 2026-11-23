import { useState } from 'react';
import forest from '../assets/dusk-forest.svg';
import portrait from '../assets/leaf-keeper.svg';

export type ImageMode = 'text' | 'edit';
export type ImageModel = { id: string; name: string; identifier: string; endpoint: string; modes: ImageMode[]; checked: boolean };
type ImageRatio = '1:1' | '4:5' | '16:9';
export type ImageAsset = { src: string; name: string; ratio?: ImageRatio };
export type ImageRequest = { mode: ImageMode; prompt: string; model: string; ratio: ImageRatio; reference?: ImageAsset; purpose?: 'avatar' | 'portrait' };
export type ImageOutput = ImageRequest & ImageAsset & { id: string; modelName: string };

export const modeName: Record<ImageMode, string> = { text: '文生图', edit: '图生图' };
export const exampleForest = { src: forest, name: '暮色森林参考图' };
export const examplePortrait = { src: portrait, name: '角色肖像示例' };

export const exampleImagePrompt = '画一张暮色森林的桥：青蓝河水、紫色树冠，保留林间的小桥。';
export const exampleChatImage: ImageOutput = { ...exampleForest, id: 'forest-in-chat', mode: 'text', prompt: exampleImagePrompt, model: 'forest-studio', modelName: '森林图像服务', ratio: '16:9' };

export function detectImageMode(prompt: string, hasReference: boolean): ImageMode | undefined {
  if (/^(?:请问|为什么|怎么|如何|你觉得|能否解释)|(?:是什么|什么意思|有什么区别)[？?。]?$/u.test(prompt)) return undefined;
  if (/图生图|图改图|修图|改图|重绘|为.{0,10}换背景|(?:把|将|给|修改).{0,14}(?:这张|上张|上一张|参考|图片|图像|照片)|(?:这张图|这幅画|上一张|刚才那张).{0,12}(?:改|换|调|加|去掉|保留)/u.test(prompt)) return 'edit';
  if (hasReference && /^(?:(?:请|帮我|请帮我)\s*)?(?:把|改|换|调|去掉|保留|加上|移除|裁剪|提亮|变成|让)/u.test(prompt)) return 'edit';
  if (/(?:文生图|画(?:一|两|张|幅)|绘制.{0,12}(?:图|海报|插画|画)|(?:生成|做|画|制作|设计).{0,12}(?:图片|图像|插画|海报|头像|照片|风景图))/u.test(prompt)) return 'text';
  return undefined;
}
const seedModels: ImageModel[] = [
  { id: 'forest-studio', name: '森林图像服务', identifier: 'gpt-image-1', endpoint: 'https://images.example.com/v1', modes: ['text', 'edit'], checked: true },
  { id: 'sketch', name: '草图备选', identifier: 'image-preview', endpoint: 'https://sketch.example.com/v1', modes: ['text'], checked: false },
];

export function useImagePreview(withDemo = true) {
  const [models, setModels] = useState<ImageModel[]>(() => withDemo ? seedModels : []);
  const [defaults, setDefaults] = useState<Record<ImageMode, string>>(() => ({ text: withDemo ? 'forest-studio' : '', edit: withDemo ? 'forest-studio' : '' }));
  return {
    models, defaults,
    loadDemo: () => {
      setModels((all) => [...all, ...seedModels.filter((item) => !all.some((model) => model.id === item.id))]);
      setDefaults((current) => ({ text: current.text || 'forest-studio', edit: current.edit || 'forest-studio' }));
    },
    save: (entry: ImageModel) => setModels((all) => all.some((item) => item.id === entry.id) ? all.map((item) => item.id === entry.id ? entry : item) : [...all, entry]),
    setDefault: (mode: ImageMode, id: string) => {
      if (models.some((item) => item.id === id && item.checked && item.modes.includes(mode))) setDefaults((state) => ({ ...state, [mode]: id }));
    },
    available: (mode: ImageMode) => models.filter((item) => item.checked && item.modes.includes(mode)),
    create: (request: ImageRequest): ImageOutput | undefined => {
      const model = models.find((item) => item.id === request.model && item.checked && item.modes.includes(request.mode));
      if (!model || !request.prompt.trim() || (request.mode === 'edit' && !request.reference)) return undefined;
      const asset = request.purpose ? examplePortrait : request.mode === 'edit' && request.reference ? request.reference : exampleForest;
      return { ...request, src: asset.src, id: crypto.randomUUID(), name: request.mode === 'edit' ? '参考图改绘示例' : request.purpose ? '角色图片示例' : '暮色森林生图示例', modelName: model.name };
    },
  };
}

export function loadLocalImage(file: File): Promise<ImageAsset> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) return Promise.reject(new Error('请选择 8 MB 以内的 PNG、JPEG 或 WebP 图片。'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('无法读取图片，请重新选择。'));
    reader.onload = () => resolve({ src: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  });
}
