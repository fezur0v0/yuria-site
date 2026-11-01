import type { KeyboardEvent, MouseEvent } from 'react';
import type { MeContent } from './content';

export type DialoguePosition = { topicId?: string; pageIndex: number };
export type MeEditTarget =
  | { kind: 'text'; field: keyof MeContent['profile'] }
  | { kind: 'image'; field: 'avatarUrl' | 'portraitUrl' | 'backgroundUrl' }
  | { kind: 'album'; index?: number }
  | ({ kind: 'dialogue' } & DialoguePosition);

export type MeEditor = {
  busy: boolean;
  dirty: boolean;
  dialogue: DialoguePosition;
  onEdit: (target: MeEditTarget) => void;
  onPreviewDialogue: (position: DialoguePosition) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function editable(editor: MeEditor | undefined, target: MeEditTarget, label: string) {
  if (!editor) return {};
  const open = () => { if (!editor.busy) editor.onEdit(target); };
  return {
    'data-me-edit': label,
    role: 'button', tabIndex: editor.busy ? -1 : 0, 'aria-label': `编辑${label}`,
    onClick: (event: MouseEvent<HTMLElement>) => { event.preventDefault(); event.stopPropagation(); open(); },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); open(); }
    },
  };
}
