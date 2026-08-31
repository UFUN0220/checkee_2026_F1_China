import React from 'react'

const Curve = () => {
  // 定义七种显示器主色调作为渐变颜色
  const gradientColors = [
    '#94D3A2', // 浅绿色（对应最左侧显示器颜色）
    '#F7DC6F', // 浅黄色
    '#F0B27A', // 浅橙色
    '#F9CAD0', // 浅粉色
    '#B49ACA', // 浅紫色
    '#85C1E9', // 浅蓝色
    '#D0D3D4', // 浅灰色
  ]

  return (
    <div className="hidden md:block mt-6 w-full overflow-hidden">
      {/* SVG曲线容器，占满整个屏幕宽度 */}
      <svg className="h-64 w-full" viewBox="0 0 1440 100" preserveAspectRatio="none">
        {/* 定义渐变 */}
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientColors.map((color, index) => (
              <stop
                key={index}
                offset={`${(index / (gradientColors.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>
        </defs>

        {/* 曲线路径 - 使用贝塞尔控制点创建大曲率 */}
        <path
          d="M0,50 
             C360,10   540,90   720,50 
             C900,10   1080,90  1440,50"
          fill="none"
          stroke="url(#curveGradient)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export default Curve
