import { jest, test, beforeAll, expect } from '@jest/globals'
import { createRequire } from 'node:module'

jest.mock('electron', () => {
  return {
    ipcRenderer: {
      once: jest.fn(),
      postMessage: jest.fn()
    },
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


test('preload', async () => {
  const { ipcRenderer, } = require('electron')
  let rendererListener
  jest.spyOn(ipcRenderer, 'once').mockImplementation((name, listener) => {
    rendererListener = listener
  })
  jest.spyOn(ipcRenderer, 'postMessage').mockImplementation(() => {
    rendererListener({
      jsonrpc: '2.0',
      id: 1, result: null
    })

  })
  await import('../src/index.js')
  const listener = jest.fn()
  window.addEventListener('message', listener)
  window.postMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: []
  }, location.origin)
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener).toHaveBeenCalledWith({
    jsonrpc: '2.0',
    id: 1,
    result: null
  })
})