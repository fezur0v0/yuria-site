export interface FriendLink {
  name: string;
  url: string;
  description: string;
  image: string;
}

export const FRIEND_LINKS: FriendLink[] = [
  {
    name: '易安',
    url: 'https://iliyian.com/',
    description: '魂梦任悠扬，睡起杨花满绣床。',
    image: '/images/links/iliyian-avatar.jpg',
  },
];

export function friendLinkHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
