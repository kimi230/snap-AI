export interface ElectronAPI {
  startCapture: () => Promise<void>
  getApiKey: () => Promise<string>
  setApiKey: (key: string) => Promise<void>
  saveFileDialog: () => Promise<string | null>
  writeFile: (filePath: string, data: number[]) => Promise<void>
  onCaptureResult: (callback: (base64: string) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
