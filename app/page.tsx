export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="flex justify-between items-center px-12 py-6 border-b border-gray-100">
        <span className="text-xl font-light tracking-widest text-gray-800">Yuria</span>
        <div className="flex gap-8 text-sm text-gray-400 tracking-widest uppercase">
          <a href="/portfolio" className="hover:text-blue-500 transition-colors">Portfolio</a>
          <a href="/notes" className="hover:text-blue-500 transition-colors">Notes</a>
          <a href="/gallery" className="hover:text-blue-500 transition-colors">Gallery</a>
        </div>
      </nav>

      {/* 主界面三个模块 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 min-h-screen">

        {/* 模块1 作品集 */}
        <a href="/portfolio" className="group relative flex flex-col justify-end p-10 bg-blue-50 hover:bg-blue-100 transition-colors duration-500 min-h-96 border-r border-gray-100">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-9xl font-thin text-blue-300">01</span>
          </div>
          <div className="relative">
            <p className="text-xs tracking-widest uppercase text-blue-400 mb-3">Portfolio</p>
            <h2 className="text-2xl font-light text-gray-800 mb-2">作品集</h2>
            <p className="text-sm text-gray-400 leading-relaxed">图片、音乐与创作</p>
          </div>
        </a>

        {/* 模块2 短文本 */}
        <a href="/notes" className="group relative flex flex-col justify-end p-10 bg-white hover:bg-gray-50 transition-colors duration-500 min-h-96 border-r border-gray-100">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-9xl font-thin text-gray-300">02</span>
          </div>
          <div className="relative">
            <p className="text-xs tracking-widest uppercase text-blue-400 mb-3">Notes</p>
            <h2 className="text-2xl font-light text-gray-800 mb-2">短文本</h2>
            <p className="text-sm text-gray-400 leading-relaxed">想法、标签与记录</p>
          </div>
        </a>

        {/* 模块3 图集 */}
        <a href="/gallery" className="group relative flex flex-col justify-end p-10 bg-blue-50 hover:bg-blue-100 transition-colors duration-500 min-h-96">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-9xl font-thin text-blue-300">03</span>
          </div>
          <div className="relative">
            <p className="text-xs tracking-widest uppercase text-blue-400 mb-3">Gallery</p>
            <h2 className="text-2xl font-light text-gray-800 mb-2">图集</h2>
            <p className="text-sm text-gray-400 leading-relaxed">上传、注释与收藏</p>
          </div>
        </a>

      </div>

      {/* 底部 */}
      <footer className="text-center py-8 text-xs text-gray-300 tracking-widest">
        © 2026 Yuria · yuria.xin
      </footer>
    </main>
  );
}