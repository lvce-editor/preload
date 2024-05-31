const { ipcRenderer, contextBridge, webUtils } = require('electron')

const channelName = 'port'

const handleElectronMessage = (event, message) => {
  window.postMessage(message, location.origin)
}

const handleWindowMessage = (event) => {
  const { data, ports } = event
  ipcRenderer.once(channelName, handleElectronMessage)
  ipcRenderer.postMessage(channelName, data, ports)
}

const electronGlobals = {
  getPathForFile(file) {
    return webUtils.getPathForFile(file)
  },
}

const main = () => {
  window.addEventListener('message', handleWindowMessage, { once: true })
  contextBridge.exposeInMainWorld('isElectron', true)
  contextBridge.exposeInMainWorld('electronGlobals', electronGlobals)
}

main()
