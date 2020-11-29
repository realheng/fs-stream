const fs = require('fs')
const path = require('path')

// 由于readFile和writeFile都是全部读入内存之后再全部写入
// 这样如果文件过大的话会造成资源占用过高
// 所以采用buffer的方式,读一点写一点.
function copy (sourceFilename, targetFilename, callback) {
  fs.open(sourceFilename, 'r', function (err, rfd) {
    if (err) throw err
    fs.open(targetFilename, 'w', function (err, wfd) {
      if (err) throw err
      // 声明一个3个字节大小的缓存池
      const buf = Buffer.alloc(3)
      let roffset = 0
      let woffset = 0
      // 异步和回调的迭代都是用递归来实现的,因为不知道什么时候继续下一步.
      const next = () => {
        // buffer写入的套路就是设置源头的读取位置和读取字节数,设置目标的写入位置
        fs.read(rfd, buf, 0, 3, roffset, function (err, bytesRead) {
          if (err) throw err
          if (bytesRead === 0) {
            fs.close(wfd, () => {})
            fs.close(rfd, () => {})
            typeof callback === 'function' && callback()
          } else {
            roffset += bytesRead
            fs.write(wfd, buf, 0, 3, woffset, function (err, bytesWritten) {
              if (err) throw err
              woffset += bytesWritten
              next()
            })
          }
        })
      }

      // 手动触发第一次next
      next()
    })
  })
}

copy(path.resolve('./a.txt'), path.resolve('./b.txt'), () => {
  console.log('复制完毕')
})
