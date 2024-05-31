declare module 'electron' {
  import type { EventEmitter } from 'node:events'

  interface IpcRenderer extends EventEmitter {
    readonly postMessage: (
      channelName: string,
      data: any,
      ports: Transferable[],
    ) => void
  }

  interface ContextBridge {
    readonly exposeInMainWorld: (key: string, value: any) => void
  }

  interface WebUtils {
    readonly getPathForFile: (file: File) => string
  }

  export const ipcRenderer: IpcRenderer

  export const contextBridge: ContextBridge

  export const webUtils: WebUtils
}
