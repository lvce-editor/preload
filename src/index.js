const { ipcRenderer, contextBridge, webUtils } = require('electron')

const channelName = 'port'
const fromMainProperty = '__lvceElectronMainMessage'

const handleElectronMessage = (event, message) => {
  window.postMessage({ ...message, [fromMainProperty]: true }, location.origin)
}

const handleWindowMessage = (event) => {
  const { data, ports } = event
  if (data && data[fromMainProperty]) {
    return
  }
  ipcRenderer.postMessage(channelName, data, ports)
}

const electronGlobals = {
  getPathForFile(file) {
    return webUtils.getPathForFile(file)
  },
}

const main = () => {
  ipcRenderer.on(channelName, handleElectronMessage)
  window.addEventListener('message', handleWindowMessage)
  contextBridge.exposeInMainWorld('isElectron', true)
  contextBridge.exposeInMainWorld('electronGlobals', electronGlobals)
}

main()
