'use client'

import { useRef } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FiMenu, FiMusic } from 'react-icons/fi'
import { useMusic, type MusicTrack } from './MusicProvider'

function QueueTrack({ track, current, onSelect }: { track: MusicTrack; current: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: track.id })
  return <div ref={setNodeRef} className={`music-float__track${current ? ' is-current' : ''}${isDragging ? ' is-dragging' : ''}`}
    style={{ transform: CSS.Transform.toString(transform), transition }}>
    <button type="button" className="music-float__track-select" onClick={onSelect} aria-current={current ? 'true' : undefined}>
      <span className="music-float__thumbnail">{track.cover_url ? <img src={track.cover_url} alt="" loading="lazy" draggable={false} /> : <FiMusic size={16} aria-hidden="true" />}</span>
      <span className="music-float__track-name"><strong>{track.title}</strong><small>{track.artist}</small></span>
    </button>
    <button ref={setActivatorNodeRef} type="button" className="music-float__track-handle" {...attributes} {...listeners}
      aria-label={`调整顺序：${track.title}`} aria-describedby="music-queue-help" title="长按拖动调整顺序"><FiMenu size={19} aria-hidden="true" /></button>
  </div>
}

export default function MusicQueue({ onSortingChange }: { onSortingChange: (sorting: boolean) => void }) {
  const { tracks, current, select, reorder } = useMusic()
  const scrollRef = useRef<HTMLDivElement>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 280, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return <>
    <div className="music-float__list-heading">In the wings</div>
    <span id="music-queue-help" className="music-float__sr">长按拖动调整顺序。键盘可按空格拿起，再用上下方向键移动，空格放下，Escape 取消。</span>
    <div ref={scrollRef} className="music-float__queue-scroll">
      <DndContext sensors={sensors} collisionDetection={closestCenter}
        autoScroll={{ canScroll: element => element === scrollRef.current }}
        accessibility={{ screenReaderInstructions: { draggable: '按空格拿起歌曲，用上下方向键移动，再按空格放下，Escape 取消。' },
          announcements: {
            onDragStart: () => '已拿起歌曲，可以上下调整顺序。',
            onDragOver: ({ over }) => over ? `移至第 ${tracks.findIndex(track => track.id === over.id) + 1} 首的位置。` : undefined,
            onDragEnd: ({ over }) => over ? '歌曲顺序已调整。' : '歌曲顺序未改变。',
            onDragCancel: () => '已取消调整顺序。',
          } }}
        onDragStart={() => onSortingChange(true)} onDragCancel={() => onSortingChange(false)}
        onDragEnd={({ active, over }) => {
          onSortingChange(false)
          if (over && active.id !== over.id) reorder(Number(active.id), Number(over.id))
        }}>
        <SortableContext items={tracks.map(track => track.id)} strategy={verticalListSortingStrategy}>
          {tracks.map((track, index) => <QueueTrack key={track.id} track={track} current={track.id === current?.id} onSelect={() => select(index)} />)}
        </SortableContext>
      </DndContext>
    </div>
  </>
}
