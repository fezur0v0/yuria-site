'use client';

interface Album {
  id: string;
  title: string;
  cover_image_url: string | null;
  description: string | null;
  gallery_images?: { image_url: string; sort_order: number }[];
}

export default function AlbumStackCard({ album }: { album: Album }) {
  const stackPhotos = [...(album.gallery_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(1, 3);

  const behindLeft = stackPhotos[0];
  const behindRight = stackPhotos[1];

  return (
    <div className="group relative cursor-pointer">
      <div className="relative w-full aspect-[4/5]">
        <div
          className="absolute inset-0 bg-white p-1.5 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:rotate-[-8deg]"
          style={{ transform: 'rotate(-6deg) translateY(4px)' }}
        >
          <div className="w-full h-full overflow-hidden rounded-sm bg-black/5">
            {behindLeft && <img src={behindLeft.image_url} alt="" className="w-full h-full object-cover" />}
          </div>
        </div>
        <div
          className="absolute inset-0 bg-white p-1.5 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:rotate-[6deg]"
          style={{ transform: 'rotate(4deg) translateY(2px)' }}
        >
          <div className="w-full h-full overflow-hidden rounded-sm bg-black/5">
            {behindRight && <img src={behindRight.image_url} alt="" className="w-full h-full object-cover" />}
          </div>
        </div>
        <div className="absolute inset-0 bg-white p-2 rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]">
          <div className="relative w-full h-full overflow-hidden rounded-sm bg-black/5">
            {album.cover_image_url ? (
              <img src={album.cover_image_url} alt={album.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-black/20 text-xs">无封面</div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <h3 className="font-serif text-sm sm:text-base text-[#1a1a1a] tracking-wide">{album.title}</h3>
        {album.description && <p className="text-xs text-black/40 mt-1 line-clamp-1">{album.description}</p>}
      </div>
    </div>
  );
}
