import React from 'react';

export default function StarDivider() {
  return (
    <div className="star-trail-box">
      {/* 1. 隐藏的标准五角星 SVG 路径 */}
      <svg style={{ display: 'none' }}>
        <defs>
          <g id="pure-star">
            <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.446l-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
          </g>
        </defs>
      </svg>

      {/* 2. 经典破风拖尾动画舞台 */}
      <div className="anim-container">
        {/* 尾巴 2 (最小，最后面) */}
        <div className="s1-tail2">
          <div className="t1-x">
            <div className="t1-y">
              <div className="t1-z">
                <svg className="star-svg" viewBox="0 0 24 24">
                  <use href="#pure-star" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 尾巴 1 (中等，在中间) */}
        <div className="s1-tail1">
          <div className="t1-x">
            <div className="t1-y">
              <div className="t1-z">
                <svg className="star-svg" viewBox="0 0 24 24">
                  <use href="#pure-star" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 领头羊 (最大，最前面) */}
        <div className="s1-lead">
          <div className="t1-x">
            <div className="t1-y">
              <div className="t1-z">
                <svg className="star-svg" viewBox="0 0 24 24">
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
