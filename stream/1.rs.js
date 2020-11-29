let ReadStream = require('./readStream')
let rs = new ReadStream('./log.txt', {
  flags: 'r',
  encoding: 'utf8', // 读取到的结果都是buffer类型
  autoClose: true, // fs.close
  start: 0,
  end: 200, // 包前又包后
  highWaterMark: 64
})
const arr = []

rs.on('error', function (err) {
  console.log(err)
})

rs.on('data', function (data) {
  console.log('data1: ', data)
  arr.push(data)
})

rs.on('end', function () {
  console.log(`读取完毕,共计读取${rs.bytesRead}个字节`)
})
