const fs = require('fs')
const fsPromises = require('fs').promises
const pathLib = require('path')
const dirPath1 = './c/f/g/h/a.js'
const dirPath2 = './c/d/e/f/b.js'

// 同步创建文件夹
// 将dirPath转换为绝对地址，用分隔符将其分开
// 循环依次拼接，判断地址是否存在，如果存在则继续拼接，如果不存在则创建，创建完成则继续循环拼接直至完成，完成之后调用callback
// function mkdir (dirPath, callback) {
//   const dirParts = pathLib
//     .resolve(dirPath)
//     .split(pathLib.sep)
//     .filter(dir => !!dir)

//   console.log('dirparts: ', dirParts)
//   let curPath = ''
//   for (let index = 0; index < dirParts.length; index++) {
//     curPath = pathLib.sep + dirParts.slice(0, index + 1).join(pathLib.sep)
//     console.log('curPath: ', curPath)
//     try {
//       fs.accessSync(curPath)
//     } catch (error) {
//       fs.mkdirSync(curPath)
//     }
//   }
//   typeof callback === 'function' && callback()
// }

// 串行异步创建文件夹
// function mkdir (dirPath, callback) {
//   // 先将路径转为绝对地址,然后再用'/'分隔开
//   const dirParts = pathLib
//     .resolve(dirPath)
//     .split('/')
//     .filter(dir => !!dir)
//   let index = 0
//   // 串行异步就不能使用for循环来遍历了，要使用递归回调
//   ;(function next (i) {
//     if (i >= dirParts.length) {
//       return typeof callback === 'function' && callback()
//     }
//     const curPath = pathLib.sep + dirParts.slice(0, i + 1).join(pathLib.sep)
//     fs.access(curPath, err => {
//       // 如果文件不存在则创建
//       if (err) {
//         return fs.mkdir(curPath, err => {
//           if (err) {
//             throw new Error(err.message)
//           }
//           next(i + 1)
//         })
//       }
//       // 如果存在，就进入下一个回调
//       next(i + 1)
//     })
//   })(index)
// }
async function mkFile (dirPath, callback) {
  // 使用promise来完成
  const dirParts = pathLib
    .resolve(dirPath)
    .split('/')
    .filter(dir => !!dir)

  for (let index = 0; index < dirParts.length; index++) {
    const curPath = pathLib.sep + dirParts.slice(0, index + 1).join(pathLib.sep)
    const isFile = pathLib.extname(dirParts[index])
    try {
      await fsPromises.access(curPath)
    } catch (error) {
      await (isFile
        ? fsPromises.writeFile(curPath, '')
        : fsPromises.mkFile(curPath))
    }
  }

  typeof callback === 'function' && callback()
}

mkFile(dirPath2, () => {
  console.log('创建成功')
})
