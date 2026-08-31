import React from 'react'
import '~/css/ufunReadme.css'
import Curve from './curve'
import '~/css/homefont.css'
import IconGroup from './icon_fun'

export default function UfunReadme() {
  //const hello = '/static/images/hello.png'
  const chineseFont = '"heishenhua", cursive, sans-serif'

  return (
    <div className="relative">
      {/* 全屏部分 */}
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 text-center -mt-16">
        <div className="z-10 -mt-16 mb-10">
          <h1 className="text-3xl font-semibold bentodark md:text-4xl lg:text-5xl">uFun</h1>
          <p className="colorful-text mt-3 pt-4 text-3xl font-normal md:text-4xl lg:text-6xl">多色多出色</p>
          <div className="mt-10 flex justify-center gap-6">
            <IconGroup />
          </div>
        </div>
        
        <Curve />
        {/* <Arrow /> */}
      </div>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-center">
        <h2
          className="responsive-heading text-wrap text-center text-xs sm:text-sm md:text-sm lg:text-xl leading-relaxed sm:leading-2 md:leading-loose lg:leading-loose"
          style={{ fontFamily: chineseFont, color: 'ffffff' }}
        >
          <span className="block text-3xl md:text-4xl lg:text-6xl">
            👋 I'm Fang You, a Chinese developer.
          </span>
          
          <span className="block mt-4 text-3xl md:text-4xl lg:text-6xl">
            You can call me "Fang", it sounds like "fun".
          </span>

          <span className="block mt-4 text-3xl md:text-4xl lg:text-6xl">
            I find freedom and joy in creating,
          </span>
          
          <span className="block mt-4 text-3xl md:text-4xl lg:text-6xl">
            and pursue consistent impact through constant learning.
          </span>
        </h2>
      </div>
    </div>
  )
}
