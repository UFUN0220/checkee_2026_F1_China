import React from 'react'

const Arrow = ({ width = 60, height = 60, className = '' }) => {
  return (
    <div className={`my-16 ${className}`}>
      {' '}
      {/* 添加上下间距 */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cursor-pointer transition-transform hover:scale-110"
      >
        {/* 箭头背景圆形 */}
        <circle
          cx="30"
          cy="30"
          r="22"
          fill="url(#arrowGradient)"
          stroke="white"
          strokeWidth="2"
          opacity="0.8"
        />

        {/* 箭头形状 */}
        <path d="M30 38L20 26H40L30 38Z" fill="white" />

        {/* 渐变定义 */}
        <defs>
          <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94D3A2" />
            <stop offset="16.6%" stopColor="#F7DC6F" />
            <stop offset="33.3%" stopColor="#F0B27A" />
            <stop offset="50%" stopColor="#F9CAD0" />
            <stop offset="66.6%" stopColor="#B49ACA" />
            <stop offset="83.3%" stopColor="#85C1E9" />
            <stop offset="100%" stopColor="#D0D3D4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export default Arrow
