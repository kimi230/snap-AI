import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  startCapture: () => ipcRenderer.invoke('start-capture'),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  saveFileDialog: () => ipcRenderer.invoke('save-file-dialog'),
  writeFile: (filePath: string, data: number[]) => ipcRenderer.invoke('write-file', filePath, data),

  onCaptureResult: (callback: (base64: string) => void) => {
    ipcRenderer.removeAllListeners('capture-result')
    ipcRenderer.on('capture-result', (_event, base64) => callback(base64))
  }
})
