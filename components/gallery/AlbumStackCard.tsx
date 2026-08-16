
'use client';

interface Album {
  id: string;
  title: string;
  cover_image_url: string | null;
  description: string | null;
}

export default function AlbumStackCard({ album }: { album: Album }) {
  return (
    <div className="group relative cursor-pointer">
      <div className="relative w-full aspect-[4/5]">
        {/* 底下两张错位旋转的白底卡片，营造照片堆叠感 */}
        <div
          className="absolute inset-0 bg-white rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:rotate-[-8deg]"
          style={{ transform: 'rotate(-6deg) translateY(4px)' }}
        />
        <div
          className="absolute inset-0 bg-white rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:rotate-[6deg]"
          style={{ transform: 'rotate(4deg) translateY(2px)' }}
        />

        {/* 最上层：真正的封面图，hover 时轻轻抬起+放大 */}
        <div className="absolute inset-0 bg-white p-2 rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]">
          <div className="relative w-full h-full overflow-hidden rounded-sm bg-black/5">
            {album.cover_image_url ? (
              <img
                src={album.cover_image_url}
                alt={album.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-black/20 text-xs">
                无封面
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 text-center">
        <h3 className="font-serif text-sm sm:text-base text-[#1a1a1a] tracking-wide">
          {album.title}
        </h3>
        {album.description && (
          <p className="text-xs text-black/40 mt-1 line-clamp-1">{album.description}</p>
        )}
      </div>
    </div>
  );
}
