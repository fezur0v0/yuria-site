import HandwritingIcon from '@/components/HandwritingIcon'

export default function Loading() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#fafaf8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <HandwritingIcon size={100} />
    </div>
  )
}
