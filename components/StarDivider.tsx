import React from 'react';

export default function StarDivider() {
  return (
    <div className="relative w-full my-12 py-4 overflow-hidden select-none pointer-events-none">
      {/* 隐藏的 SVG 图案定义 */}
      <svg className="hidden">
        <defs>
          <g id="pure-star">
            <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.446l-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
          </g>
        </defs>
      </svg>

      {/* 动画舞台容器 */}
      <div className="relative w-full h-10 max-w-4xl mx-auto">
        {/* 1. 尾巴 2 (最小，最后面) */}
        <div className="star-anim-s1-tail2">
          <div className="star-t1-x">
            <div className="star-t1-y">
              <div className="star-t1-z">
                <svg className="w-5 h-5 fill-[#dbe8ff] opacity-30 scale-50 blur-[0.5px]" viewBox="0 0 24 24">
                  <use href="#pure-star" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 尾巴 1 (中等，在中间) */}
        <div className="star-anim-s1-tail1">
          <div className="star-t1-x">
            <div className="star-t1-y">
              <div className="star-t1-z">
                <svg className="w-5 h-5 fill-[#b4d0ff] opacity-60 scale-75" viewBox="0 0 24 24">
                  <use href="#pure-star" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 领头羊 (最大，最前面) */}
        <div className="star-anim-s1-lead">
          <div className="star-t1-x">
            <div className="star-t1-y">
              <div className="star-t1-z">
                <svg className="w-5 h-5 fill-[#7fb2ff] opacity-100 scale-110 drop-shadow-[0_0_6px_rgba(255,255,255,1)]" viewBox="0 0 24 24">
                  <use href="#pure-star" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
