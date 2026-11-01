'use client';

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiX } from 'react-icons/fi';
import { addMeTag } from '@/components/me/content';
import styles from './me-settings.module.css';

function Tag({ tag, remove }: { tag: string; remove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag });
  return <span ref={setNodeRef} className={styles.tagChip} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 }}>
    <button type="button" className={styles.tagHandle} {...attributes} {...listeners} aria-label={`移动标签「${tag}」`}>{tag}</button><button type="button" className={styles.tagRemove} aria-label={`删除标签「${tag}」`} onClick={remove}><FiX size={14} aria-hidden="true" /></button>
  </span>;
}

export default function MeTagsEditor({ tags, input, onInput, onChange, onError }: {
  tags: string[]; input: string; onInput: (value: string) => void; onChange: (tags: string[]) => void; onError: (message: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 180, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function add() {
    try { onChange(addMeTag(tags, input)); onInput(''); onError(''); }
    catch (error) { onError(error instanceof Error ? error.message : '请检查标签'); }
  }
  function reorder({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) onChange(arrayMove(tags, tags.indexOf(String(active.id)), tags.indexOf(String(over.id))));
  }
  return <div className={styles.tagsEditor}>
    <DndContext id="me-tags" sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
      <SortableContext items={tags} strategy={rectSortingStrategy}>
        <div className={styles.tagList}>{tags.map((tag, i) => <Tag key={tag} tag={tag} remove={() => onChange(tags.filter((_, index) => index !== i))} />)}</div>
      </SortableContext>
    </DndContext>
    <input aria-label="添加标签" placeholder="输入标签，按 Enter 添加" value={input} maxLength={24} onChange={event => onInput(event.target.value)} onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter') { event.preventDefault(); add(); }
      else if (event.key === 'Backspace' && !input) onChange(tags.slice(0, -1));
    }} />
  </div>;
}
