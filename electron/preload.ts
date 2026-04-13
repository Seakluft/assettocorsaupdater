import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  verifyFolder: (path: string) => ipcRenderer.invoke('verify-folder', path),
  startUpdate: (data: { acPath: string, zipUrl: string }) => ipcRenderer.invoke('start-update', data),
  onUpdateStatus: (callback: (status: any) => void) => {
    const subscription = (_event: any, status: any) => callback(status)
    ipcRenderer.on('update-status', subscription)
    return () => ipcRenderer.removeListener('update-status', subscription)
  }
})
