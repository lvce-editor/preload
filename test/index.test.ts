import { beforeAll, expect, jest, test } from '@jest/globals'
import { createRequire } from 'node:module'

class MockIpcRenderer {
  listener: ((event: unknown, message: any) => void) | undefined
  on = jest.fn(
    (
      _channelName: string,
      listener: (event: unknown, message: any) => void,
    ) => {
      this.listener = listener
    },
  )
  postMessage = jest.fn()

  emitFromMain(message: any) {
    this.listener?.(undefined, message)
  }
}

const ipcRenderer = new MockIpcRenderer()
const exposeInMainWorld = jest.fn()

jest.mock(
  'electron',
  () => ({
    ipcRenderer,
    contextBridge: {
      exposeInMainWorld,
    },
    webUtils: {
      getPathForFile: jest.fn(),
    },
  }),
  {
    virtual: true,
  },
)

class MockWindow extends EventTarget {
  postMessage(
    message: any,
    _origin?: string,
    ports: readonly MessagePort[] = [],
  ) {
    this.dispatchEvent(
      new MessageEvent('message', {
        data: message,
        ports,
      }),
    )
  }
}

beforeAll(async () => {
  globalThis.require = createRequire(import.meta.url)
  // @ts-ignore
  globalThis.window = new MockWindow()
  // @ts-ignore
  globalThis.location = {
    origin: 'test://test',
  }
  await import('../src/index.js')
})

test('forwards repeated renderer messages to the main process', () => {
  const first = {
    id: 1,
    jsonrpc: '2.0',
    method: 'initialize',
    params: [],
  }
  const second = {
    id: 2,
    jsonrpc: '2.0',
    method: 'second',
    params: [],
  }

  window.postMessage(first, location.origin)
  window.postMessage(second, location.origin)

  expect(ipcRenderer.postMessage).toHaveBeenNthCalledWith(1, 'port', first, [])
  expect(ipcRenderer.postMessage).toHaveBeenNthCalledWith(2, 'port', second, [])
})

test('forwards a main-process request and its renderer response without echoing the request', () => {
  ipcRenderer.postMessage.mockClear()
  const messages: any[] = []
  window.addEventListener('message', (event) => {
    messages.push((event as MessageEvent).data)
  })
  const request = {
    id: 3,
    jsonrpc: '2.0',
    method: 'Window.prepareClose',
    params: [],
  }

  ipcRenderer.emitFromMain(request)

  expect(messages).toEqual([{ ...request, __lvceElectronMainMessage: true }])
  expect(ipcRenderer.postMessage).not.toHaveBeenCalled()

  const response = {
    id: 3,
    jsonrpc: '2.0',
    result: null,
  }
  window.postMessage(response, location.origin)

  expect(ipcRenderer.postMessage).toHaveBeenCalledWith('port', response, [])
})

test('exposes Electron globals once', () => {
  expect(ipcRenderer.on).toHaveBeenCalledWith('port', expect.any(Function))
  expect(exposeInMainWorld).toHaveBeenCalledWith('isElectron', true)
  expect(exposeInMainWorld).toHaveBeenCalledWith(
    'electronGlobals',
    expect.objectContaining({
      getPathForFile: expect.any(Function),
    }),
  )
})
