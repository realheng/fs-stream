const EventEmitter = require('events')
const fs = require('fs')

class WriteStream extends EventEmitter {
  constructor (path, options) {
    super()
    this.path = path
    this.flags = options.flage || 'w'
    // 设置写入文件的权限
    this.mode = options.mode || 0o666
    this.encoding = options.encoding || 'utf8'
    this.start = options.start || 0
    this.highWaterMark = options.highWaterMark || 16 * 1024
    this.autoClose =
      typeof options.autoClose === 'boolean' ? options.autoClose : true
    this.cache = []
    this.writing = false
    // 是否需要清空,只要当缓存池满了之后才会为true
    this.needDrain = false
    this.pos = this.start
    // 写入了多少个字符
    this.length = 0

    this.open()
  }

  write (chunk, encoding = this.encoding, callback) {
    chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    this.length += chunk.length
    // 判断要写入的内容是否超过水位线
    const flag = this.highWaterMark > this.length
    this.needDrain = !flag

    if (this.writing) {
      this.cache.push({
        chunk,
        encoding,
        callback
      })
    } else {
      this.writing = true
      this._write(chunk, encoding, callback)
    }

    return flag
  }

  clearBuffer () {
    const obj = this.cache.shift()
    if (!obj) {
      // 如果obj为空,则说明缓存区已经读完
      if (this.needDrain) {
        this.writing = false
        this.needDrain = false
        this.emit('drain')
      }
    } else {
      // _wirte会继续执行clearBuffer
      this._write(obj.chunk, obj.encoding, obj.callabck)
    }
  }

  _write (chunk, encoding, callabck) {
    if (typeof this.fd !== 'number') {
      return this.once('open', () => {
        this._write(chunk, encoding, callback)
      })
    }

    fs.write(this.fd, chunk, 0, chunk.length, this.pos, (err, bytesWritten) => {
      if (err) return this.emit('error', err)
      this.pos += bytesWritten
      this.length -= bytesWritten
      typeof callback === 'function' && callback()
      this.clearBuffer()
    })
  }

  open () {
    fs.open(this.path, this.flags, this.mode, (err, fd) => {
      if (err) return this.emit('err')
      this.fd = fd
      this.emit('open', fd)
    })
  }
}

module.exports = WriteStream
