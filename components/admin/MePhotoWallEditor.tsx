'use client';

import { useRef } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiPlus } from 'react-icons/fi';
import { meFrameStyle, mePhotoSlots, type MeContent } from '@/components/me/content';
import type { MeEditor } from '@/components/me/editing';
import { siteAsset } from '@/utils/siteAssets';
import styles from '@/components/me/me.module.css';

function Photo({ content, index, url, editor, suppressClick }: { content: MeContent; index: number; url: string; editor: MeEditor; suppressClick: { current: boolean } }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: index + 1, disabled: editor.busy });
  return <button ref={setNodeRef} type="button" {...attributes} {...listeners} className={styles.editPhoto} data-me-edit={`相册第 ${index + 1} 项`} data-dragging={isDragging} style={{ transform: CSS.Transform.toString(transform), transition }} aria-label={`编辑相册第 ${index + 1} 项`} title="长按拖动排序，点击编辑" disabled={editor.busy} onClick={() => {
    if (suppressClick.current) return;
    editor.onEdit({ kind: 'album', index });
  }}>{url ? <img src={siteAsset(url)} alt={`相册影像 ${index + 1}`} draggable={false} style={meFrameStyle(content.frames?.photos?.[index])} className={url === content.portraitUrl ? styles.momentPortrait : undefined} /> : <FiPlus size={22} aria-hidden="true" />}</button>;
}

export default function MePhotoWallEditor({ content, editor }: { content: MeContent; editor: MeEditor }) {
  const suppressClick = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 280, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function finish() { setTimeout(() => { suppressClick.current = false; }, 150); }
  return <DndContext id="me-photos" sensors={sensors} collisionDetection={closestCenter} onDragStart={() => { suppressClick.current = true; }} onDragCancel={finish} onDragEnd={({ active, over }) => {
    if (over && active.id !== over.id) editor.onMovePhoto(Number(active.id) - 1, Number(over.id) - 1);
    finish();
  }}><SortableContext items={[1, 2, 3]} strategy={rectSortingStrategy}><div className={styles.moments}>{mePhotoSlots(content).map((url, i) => <Photo key={i} content={content} editor={editor} index={i} url={url} suppressClick={suppressClick} />)}</div></SortableContext></DndContext>;
}
