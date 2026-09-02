const fs = require('fs')
const path = require('path')

console.log('------------------------------------------------')
console.log('🚀 脚本开始运行...')

// 1. 检查依赖
try {
  const Fontmin = require('fontmin')
  console.log('✅ 依赖库 fontmin 加载成功')
} catch (e) {
  console.error('❌ 错误：找不到 fontmin 库。请确认你在根目录运行了 yarn add -D fontmin')
  process.exit(1)
}

const Fontmin = require('fontmin')

// 2. 定义路径
const srcFile = 'HYBlackMythU.ttf' // 你的字体文件名
const textFile = 'words.txt' // 你的字符集文件
const destDir = 'dist'

// 3. 检查文件是否存在 (这是最容易出错的地方)
const currentDir = process.cwd()
console.log(`📂 当前工作目录: ${currentDir}`)

if (!fs.existsSync(path.join(currentDir, srcFile))) {
  console.error(`❌ 致命错误：找不到字体文件！`)
  console.error(`   期望路径: ${path.join(currentDir, srcFile)}`)
  console.error(`   请检查文件名是否完全一致 (注意大小写/后缀名)`)
  process.exit(1)
} else {
  console.log(`✅ 找到字体文件: ${srcFile}`)
}

if (!fs.existsSync(path.join(currentDir, textFile))) {
  console.error(`❌ 致命错误：找不到字符文件 ${textFile}`)
  process.exit(1)
} else {
  console.log(`✅ 找到字符文件: ${textFile}`)
}

// 4. 读取文字
const text = fs.readFileSync(textFile, 'utf8')
if (text.length === 0) {
  console.error('❌ 错误：words.txt 是空的！')
  process.exit(1)
}
console.log(`📝 读取到字符数: ${text.length} 个`)

// 5. 执行压缩
console.log('⏳ 正在处理中，请稍候 (大文件可能需要十几秒)...')

const fontmin = new Fontmin()
  .src(srcFile)
  .dest(destDir)
  .use(
    Fontmin.glyph({
      text: text,
      hinting: false,
    })
  )
  .use(Fontmin.ttf2woff2())

fontmin.run((err, files) => {
  if (err) {
    console.error('❌ Fontmin 内部报错:', err)
    return
  }

  if (files.length === 0) {
    console.error('❌ 警告：生成了 0 个文件。可能是源文件格式有问题。')
  } else {
    console.log('------------------------------------------------')
    console.log('🎉 成功！文件已生成到 dist 文件夹：')
    files.forEach((file) => {
      console.log(
        `   📄 ${path.basename(file.path)} (${(file.contents.length / 1024).toFixed(2)} KB)`
      )
    })
  }
})
