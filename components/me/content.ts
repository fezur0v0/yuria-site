// 自介和对白先作为可替换的草稿集中在这里，之后可以逐项补充。
export const profile = {
  name: 'yuria',
  alias: '悠里亜',
  quote: ['回首向来萧瑟处，', '也无风雨也无晴。'],
  bio: '把喜欢的片刻，慢慢收藏。',
  tags: ['自由', '特立独行', '理想主义'],
  note: '给喜欢的故事、角色，还有那些舍不得忘记的瞬间，留一个位置。',
};

export const greeting = ['……你好呀。', '叫我 yuria，或者悠里亜，都可以。', '难得来到这里，要聊点什么吗？'];

export const topics = [
  {
    id: 'myself', label: '想多认识你一点。',
    pages: [
      ['我大概是个很在意自由的人。', '比起被定义，更想按自己的步调生活。'],
      ['有时候安静，有时候会对喜欢的事说个不停。', '关于我的故事，也会跟着生活慢慢长大。'],
    ],
  },
  {
    id: 'favorites', label: '最近有什么喜欢的？',
    pages: [
      ['喜欢故事、音乐，还有那些会让人惦记很久的角色。', '能遇见一个喜欢的世界，本身就很开心。'],
      ['也喜欢把零散的灵感收藏起来。', '可能是一句话、一张图，也可能是忽然想记录下来的心情。'],
    ],
  },
  {
    id: 'world', label: '为什么建了这个小世界？',
    pages: [
      ['想有一个属于自己的地方。', '不用赶着表达，也不用急着变成谁。'],
      ['在这里写随笔、收藏图像，也给喜欢的故事留一个位置。', '如果你愿意，就慢慢逛一逛吧。'],
    ],
  },
] as const;

export type MeContent = {
  profile: {
    name: string; alias: string; quote: string[]; bio: string; tags: string[];
    note: string; noteReply: string; favorites: string; about: string;
  };
  avatarUrl: string;
  portraitUrl: string;
  backgroundUrl?: string;
  moments?: ({ kind: 'image'; value: string } | { kind: 'quote'; value: string })[];
  greeting: string[];
  topics: { id: string; label: string; pages: string[][] }[];
};

export const ME_CONFIG_KEY = 'me_page';
export const defaultMeContent: MeContent = {
  profile: { ...profile, noteReply: '收藏喜欢，也记录自己。',
    favorites: '故事、音乐、角色与创作。\n让人惦记很久的世界，和偶尔冒出来的一点灵感。',
    about: '想按自己的步调生活，也想好好保存那些喜欢的瞬间。\n关于我的故事，还在慢慢补完。' },
  avatarUrl: '/images/me/yuria-avatar.webp', portraitUrl: '/images/me/yuria-portrait.webp',
  greeting: [...greeting], topics: topics.map(topic => ({ ...topic, pages: topic.pages.map(page => [...page]) })),
};

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const lines = (value: unknown, max: number, length: number): value is string[] => Array.isArray(value) && value.length <= max && value.every(item => text(item, length));
function imageUrl(value: unknown): value is string {
  if (!text(value, 2048)) return false;
  if (/^\/(?!\/)[^\\\s]*$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

export function parseMeContent(raw: unknown): MeContent {
  if (raw == null) return structuredClone(defaultMeContent);
  let value: unknown = raw;
  if (typeof value === 'string') value = JSON.parse(value);
  if (!record(value) || !record(value.profile)) throw new Error('关于我内容格式无效');
  const p = value.profile;
  if (!text(p.name, 60) || !p.name.trim() || !text(p.alias, 60) || !p.alias.trim() ||
    !lines(p.quote, 4, 100) || !text(p.bio, 200) || !lines(p.tags, 8, 24) ||
    !text(p.note, 600) || !text(p.noteReply, 100) || !text(p.favorites, 1500) || !text(p.about, 1500) ||
    !imageUrl(value.avatarUrl) || !imageUrl(value.portraitUrl) || !lines(value.greeting, 5, 180) || !value.greeting.some(line => line.trim())) {
    throw new Error('请检查名称、文字长度和图片地址（使用 HTTPS 或站内路径）');
  }
  if (!Array.isArray(value.topics) || value.topics.length > 8) throw new Error('最多设置 8 个话题');
  const ids = new Set<string>();
  for (const topic of value.topics) {
    if (!record(topic) || !text(topic.id, 80) || !topic.id || ids.has(topic.id) || !text(topic.label, 80) || !topic.label.trim() ||
      !Array.isArray(topic.pages) || topic.pages.length < 1 || topic.pages.length > 8 ||
      topic.pages.some(page => !lines(page, 5, 180) || !page.some(line => line.trim()) || page.join('').length > 400)) {
      throw new Error('每个话题需要标题和 1–8 页对白，每页最多 400 字');
    }
    ids.add(topic.id);
  }
  if (value.backgroundUrl !== undefined && value.backgroundUrl !== '' && !imageUrl(value.backgroundUrl)) throw new Error('背景图片请使用 HTTPS 地址或站内路径');
  if (value.moments !== undefined && (!Array.isArray(value.moments) || value.moments.length > 12 || value.moments.some(item => !record(item) ||
    (item.kind === 'image' ? item.value !== '' && !imageUrl(item.value) : item.kind === 'quote' ? !text(item.value, 120) : true)))) throw new Error('相册最多放置 12 项，请检查图片地址和文字卡片');
  return structuredClone(value) as MeContent;
}

export function meMoments(content: MeContent): NonNullable<MeContent['moments']> {
  return content.moments ?? [
    { kind: 'image', value: content.avatarUrl },
    { kind: 'quote', value: content.profile.quote.at(-1) ?? '' },
    { kind: 'image', value: content.portraitUrl },
  ];
}

// Keep legacy content intact while showing a single row of three independent photos.
export function mePhotoSlots(content: MeContent): string[] {
  const photos = meMoments(content).filter(item => item.kind === 'image').slice(0, 3).map(item => item.value);
  return Array.from({ length: 3 }, (_, index) => photos[index] ?? '');
}
