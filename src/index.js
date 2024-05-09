const { ipcRenderer, contextBridge } = require('electron')

const channelName = 'port'

const handleElectronMessage = (event, message) => {
  window.postMessage(message, location.origin)
}

const handleWindowMessage = (event) => {
  console.log('handle window message')
  const { data, ports } = event
  ipcRenderer.once(channelName, handleElectronMessage)
  ipcRenderer.postMessage(channelName, data, ports)
}

const main = () => {
  window.addEventListener('message', handleWindowMessage, { once: true })
  contextBridge.exposeInMainWorld('isElectron', true)
}

main()
