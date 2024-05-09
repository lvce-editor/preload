import { beforeAll, expect, jest, test } from '@jest/globals'
import { createRequire } from 'node:module'

class MockIpcRenderer {
  port1: MessagePort
  port2: MessagePort

  constructor() {
    const { port1, port2 } = new MessageChannel()
    this.port1 = port1
    this.port2 = port2
  }

  postMessage(message, transfer) {
    this.port1.postMessage(message, transfer)
  }

  once(channelName, listener) {
    this.port2.addEventListener('message', listener, { once: true })
  }
}


jest.mock('electron', () => {
  return {
    ipcRenderer: new MockIpcRenderer(),
    contextBridge: {
      exposeInMainWorld: jest.fn()
    }
  }
}, {
  virtual: true
})

class MockWindow extends EventTarget {
  port1: MessagePort
  port2: MessagePort

  constructor() {
    super()
    const { port1, port2 } = new MessageChannel()
    this.port1 = port1
    this.port2 = port2
  }

  postMessage(message, origin) {
    this.port1.postMessage(message)
  }

  addEventListener(type: string, callback: any, options?: boolean | AddEventListenerOptions | undefined): void {
    this.port2.addEventListener('message', callback, options)
  }

}

beforeAll(() => {
  globalThis.require = createRequire(import.meta.url)
  // @ts-ignore
  globalThis.window = new MockWindow()
  // @ts-ignore
  globalThis.location = {
    origin: ''
  }
})

const withResolvers = <T>() => {
  let _resolve
  let _reject
  const promise = new Promise<T>((resolve, reject) => {
    _resolve
      = resolve
    _reject = reject
  })
  return {
    resolve: _resolve, reject: _reject, promise
  }
}

test('preload', async () => {
  const { ipcRenderer, } = require('electron')
  let rendererListener: any
  const { resolve: resolve1, promise: promise1 } = withResolvers<MessageEvent>()
  jest.spyOn(ipcRenderer, 'once').mockImplementation((name, listener) => {
    rendererListener = listener

  })
  jest.spyOn(ipcRenderer, 'postMessage').mockImplementation(() => {
    window.addEventListener('message', resolve1, { once: true })
    rendererListener(null, {
      jsonrpc: '2.0',
      id: 1,
      result: null
    })
  })
  await import('../src/index.js')
  window.postMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: []
  }, location.origin)

  const result = await promise1
  expect(result.data).toEqual({
    jsonrpc: '2.0',
    id: 1,
    result: null
  })
})