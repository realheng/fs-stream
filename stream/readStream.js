const fs = require('fs')
const EventEmitter = require('events')

// 流的操作需要依靠事件的发布订阅来触发回调
class ReadStream extends EventEmitter {
  constructor (path, options = {}) {
    super()
    // 读取的文件夹路径
    this.path = path
    this.flags = options.flags || 'r'
    // 文件的编码格式
    this.encoding = options.encoding || null
    this.autoClose = options.autoClose == null ? true : options.autoClose
    // 文件读取的起始位置
    this.start = options.start || 0
    // 文件读取的终止位置
    this.end = options.end
    // 读取文件的缓存池大小
    this.highWaterMark = options.highWaterMark || 64 * 1024
    // 是否可以继续读取文件的标志位
    this.flowing = null
    this.close = false
    this.bytesRead = 0
    // 缓存池的偏移量
    this.pos = this.start
    // 初始化的时候就打开文件,获取文件描述符
    this.open()

    // 监听data事件,如果订阅data事件就开始读取
    this.on('newListener', type => {
      if (type === 'data') {
        // 当readStream订阅'data'事件,即rs.on('data',fn)的时候,就需要开始读取文件
        this.flowing = true
        this.read()
      }
    })
  }

  // 暂停读取
  pause () {
    this.flowing = false
  }

  // 继续读取
  resume () {
    if (!this.flowing) {
      this.flowing = true
      this.read()
    }
  }

  read () {
    // 读取文件,需要等待open完成
    if (typeof this.fd !== 'number') {
      // 如果open没有完成,那么就订阅open事件,注意是once,即只注册一次
      return this.once('open', () => {
        this.read()
      })
    }

    // 读取文件的逻辑梳理
    // 首先需要知道要读取多少字节,从哪里开始读
    // 读取的字节数需要从highWaterMark和剩余字节数两个中取最小
    // 从哪里开始读则是this.pos控制

    // 如果有结束位置,那么就需要判断到结束还剩多少个字节,和highwatermark做对比
    // 如果没有结束位置,那么直接读取highwatermark即可
    const howMuchToRead = this.end
      ? // 只有stream的读取是这样需要+1,一般都是this.end - this.start
        // 例如:this.end = 10, this.start = 0, 按照常规来说读取的字节数应该是this.end - this.start = 10
        // 但stream需要加1,不知道为啥~
        Math.min(this.end - this.start + 1 - this.pos, this.highWaterMark)
      : this.highWaterMark

    const buf = Buffer.alloc(howMuchToRead)
    // fs.read和fs.write参数的位置都是一样的
    // 先是fd,然后的buf,然后是buf的起始位置,读取或者写入的字节长度,读取或者写入的文件的位置
    // 无论是write还是read都是从源头的某一位置读取n个字节,从目标的某一个位置开始写入
    // 在fs.read中,源头是文件,目标是buf
    // 在fs.write中,源头是buf,目标是文件
    fs.read(this.fd, buf, 0, howMuchToRead, this.pos, (err, bytesRead) => {
      this.bytesRead += bytesRead
      if (err) {
        return this.emit('error', err)
      }
      if (bytesRead > 0) {
        this.pos += bytesRead
        console.log('emit!!')

        this.emit(
          'data',
          this.encoding
            ? buf.slice(0, bytesRead).toString(this.encoding)
            : buf.slice(0, bytesRead)
        )
        // 继续触发读取
        this.read()
      } else {
        // 如果读取完毕
        this.emit('end')
        if (this.autoClose) {
          fs.close(this.fd, () => {
            if (!this.close) {
              this.emit('close')
              this.close = true
            }
          })
        }
      }
    })
  }

  open () {
    fs.open(this.path, this.flags, (err, fd) => {
      if (err) {
        return this.emit('error', err)
      }
      this.fd = fd
      this.emit('open', fd)
    })
  }

  // 管道操作
  pipe (ws) {
    // 当文件读取的时候ws写入
    // 订阅data事件,当读取的时候写入
    this.on('data', data => {
      // 写入流的缓存池是否写满
      const flag = ws.write(data)
      // 如果写满了的话就暂停读取
      if (!flag) {
        this.pause()
      }
    })

    ws.on('drain', () => {
      // 当写入流的缓存池清空之后恢复读取
      this.resume()
    })
  }
}

module.exports = ReadStream
