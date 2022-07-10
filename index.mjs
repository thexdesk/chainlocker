import EventEmitter from 'events'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import Pair from './pair.js'
import { lzObject } from 'lz-object'
import os from 'os'

/**
 * Were gonna work some magic with this info. Probably wont use them all
 */
const sys = {
  platform: os.platform(),
  arch: os.arch(),
  cpus: os.cpus(),
  totalmem: os.totalmem(),
  freemem: os.freemem(),
  loadavg: os.loadavg(),
  networkInterfaces: os.networkInterfaces(),
  EOL: os.EOL,
  tmpdir: os.tmpdir(),
  homedir: os.homedir(),
  endianness: os.endianness(),
  release: os.release(),
  user: os.user(),
}
/**
 * sea.works all our system info for node keys
 * @returns {Promise<typeof sys>}
 */
async function sysWorked(encryptionkey) {
  const entries = Object.entries(sys)
  let obj = {}
  for (let i = 0; i < entries.length; i += 1) {
    const [objectKey, objectValue] = entries[i]

    if (encryptionkey && checkIfThis.isString(objectValue)) {
      let encrypted = await Gun.SEA.work(objectValue, encryptionkey)
      obj[objectKey] = encrypted
    }
    if (checkIfThis.isObject(objectValue)) {
      await sysWorked(objectValue)
    }
  }
  return obj
}

try {
  let w = await sysWorked()
  sys = w
} catch (error) {}

async function rsvEncryptCompress(object, encryptionkey) {
  if (!object) {
    console.error(`cannot encrypt and compress object as it is undefined`)
    // throw new Error(`cannot encrypt and compress object as it is undefined`);
  }
  if (object && checkIfThis.isObject(object)) {
    const entries = Object.entries(object)
    let obj = {}
    for (let i = 0; i < entries.length; i += 1) {
      const [objectKey, objectValue] = entries[i]

      if (encryptionkey && checkIfThis.isString(objectValue)) {
        try {
          let encrypted = await Gun.SEA.encrypt(objectValue, encryptionkey)
          obj[objectKey] = encrypted
        } catch (error) {
          throw new Error(error)
        }
      }
      if (checkIfThis.isObject(objectValue)) {
        await rsvEncryptCompress(objectValue, encryptionkey)
      }
    }
    return lzObject.compress(obj, { output: 'utf16' })
  }
}
async function rsvDecryptDcompress(object, encryptionkey) {
  if (!object) {
    console.error('cannot decrypt and decompress object as it is undefined')
    // throw new Error('cannot decrypt and decompress object as it is undefined');
  }
  if (checkIfThis.isObject(object)) {
    const entries = Object.entries(lzObject.decompress(object, { output: 'utf16' }))
    let obj = {}
    for (let i = 0; i < entries.length; i += 1) {
      const [objectKey, objectValue] = entries[i]

      if (encryptionkey && checkIfThis.isString(objectValue)) {
        let encrypted = await Gun.SEA.encrypt(objectValue, encryptionkey)
        obj[objectKey] = encrypted
      }
      if (checkIfThis.isObject(objectValue)) {
        await rsvDecryptDcompress(objectValue, encryptionkey)
      }
    }
    return obj
  }
}
Gun.chain.gunsafe = function (opts) {
  const gun = this

  const events = new EventEmitter()
  events.on('error', function (err) {
    console.error(err)
  })

  let pair
  gun.gunsafe = {
    name: async (key, name) => {
      pair = await Pair(key, name)
      gun.user().auth(pair, (ack) => {
        if (ack.err) {
          events.emit('error', ack.err)
        }
      })
    },
    put: async (name, data) => {
      if (checkIfThis.isObject(data)) {
        data = await rsvEncryptCompress(data, pair)
        data = lzObject.compress(data, {})
      }
      if (checkIfThis.isString(data)) data = await SEA.encrypt(data, pair)
      gun.user().get('gunsafe').get('items').get(name).put(data)
      gun.user().get('gunsafe').get('list').set(name)
    },
    get: async (name, run, global, cb) => {
      gun
        .user()
        .get('gunsafe')
        .get('items')
        .get(name)
        .once(async (data) => {
          if (!data) return cb('Record not found')
          data = await SEA.decrypt(data, pair)
          try {
            data = data.join(' ')
            if (!run) cb(data)
          } catch {}
          try {
            data = JSON.parse(data)
          } catch {}

          if (typeof data === 'object') {
            let index = Object.keys(data)
            let str
            for (let i in index) {
              if (data[index[i]]) {
                str = str + data[index[i]]
              }
            }

            str = str.substring(9)
            data = str
          }

          if (run) {
            try {
              if (global === false) {
                console.log('Running Function')
                let fn = new Function(data)
                fn()
              } else eval(data)
            } catch {
              cb(data)
            }
          } else {
            cb(data)
          }
          gun.user().get('gunsafe').get('items').get(name).off()
        })
    },
    list: async (del, cb) => {
      let last = []
      last.length = 0
      gun
        .user()
        .get('gunsafe')
        .get('list')
        .map()
        .once((data) => {
          if (last.includes(data)) return
          gun
            .user()
            .get('gunsafe')
            .get('items')
            .get(data)
            .once((d) => {
              if (d === null && del) {
                cb('[ deleted ] ' + data)
              } else if (d !== null && !del) {
                cb(data)
              }
            })
          last.push(data)
        })
    },
    delete: async (name) => {
      if (!name) {
        gun.user().get('gunsafe').put(null)
        gun
          .user()
          .get('gunsafe')
          .get('list')
          .map()
          .once((data) => {
            gun.user().get('gunsafe').get('items').get(data).put(null)
            gun.user().get('gunsafe').get('list').put(null)
          })
      } else {
        gun.user().get('gunsafe').get('items').get(name).put(null)
      }
    },
    peers: (peers) => {
      if (peers && typeof peers === 'object') gun.opt({ peers: peers })
      if (peers === false) {
        gun.back('opt.peers')
        gun._.opt.peers = {}
      }
      if (!peers) return gun._.opt.peers
    },
    key: () => {
      return pair
    },
    pair: async (epriv) => {
      if (!epriv) {
        let keys = await SEA.pair()
        let encryptedKeys = await SEA.encrypt(pair, keys.epriv)
        gun.get('gunsafe').get('pair').put(encryptedKeys)
        return keys.epriv
      } else {
        gun
          .get('gunsafe')
          .get('pair')
          .once(async (data) => {
            gun.user().leave()
            data = await SEA.decrypt(data, epriv)
            gun.user().auth(data, (ack) => {})
            gun.on('auth', (ack) => {
              pair = ack.sea
            })
          })
      }
    },
  }
  return gun
}