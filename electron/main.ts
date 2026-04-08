import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { execFile } from 'child_process'
import { readFileSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import Store from 'electron-store'

const store = new Store()

let mainWindow: BrowserWindow | null = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Snap AI'
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// macOS: 내장 screencapture 사용 (영역 선택)
function captureMac(): Promise<string | null> {
  return new Promise((resolve) => {
    const tmpPath = path.join(tmpdir(), `snap-ai-capture-${Date.now()}.png`)

    // -i: 영역 선택 모드, -s: selection only
    execFile('screencapture', ['-i', tmpPath], (error) => {
      if (error || !existsSync(tmpPath)) {
        // 사용자가 ESC로 취소했거나 오류
        resolve(null)
        return
      }

      try {
        const buffer = readFileSync(tmpPath)
        const base64 = buffer.toString('base64')
        unlinkSync(tmpPath) // 임시 파일 삭제
        resolve(base64)
      } catch {
        resolve(null)
      }
    })
  })
}

// Windows: SnippingTool 영역 선택 캡처
function captureWindows(): Promise<string | null> {
  return new Promise((resolve) => {
    const tmpPath = path.join(tmpdir(), `snap-ai-capture-${Date.now()}.png`)
    const escapedPath = tmpPath.replace(/\\/g, '\\\\')

    const ps = `
      Add-Type -AssemblyName System.Windows.Forms
      # 클립보드 비우기
      [System.Windows.Forms.Clipboard]::Clear()
      # Win+Shift+S (영역 선택 캡처)
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class KeySender {
          [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
          public const byte VK_LWIN = 0x5B;
          public const byte VK_SHIFT = 0x10;
          public const byte VK_S = 0x53;
          public const uint KEYEVENTF_KEYUP = 0x2;
          public static void WinShiftS() {
            keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
            keybd_event(VK_SHIFT, 0, 0, UIntPtr.Zero);
            keybd_event(VK_S, 0, 0, UIntPtr.Zero);
            keybd_event(VK_S, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
          }
        }
"@
      [KeySender]::WinShiftS()
      # 사용자가 영역 선택할 때까지 대기 (최대 30초)
      $timeout = 30
      $elapsed = 0
      while ($elapsed -lt $timeout) {
        Start-Sleep -Milliseconds 500
        $elapsed += 0.5
        if ([System.Windows.Forms.Clipboard]::ContainsImage()) { break }
      }
      $img = [System.Windows.Forms.Clipboard]::GetImage()
      if ($img) { $img.Save('${escapedPath}') }
    `

    execFile('powershell', ['-Command', ps], { timeout: 35000 }, (error) => {
      if (error || !existsSync(tmpPath)) {
        resolve(null)
        return
      }

      try {
        const buffer = readFileSync(tmpPath)
        const base64 = buffer.toString('base64')
        unlinkSync(tmpPath)
        resolve(base64)
      } catch {
        resolve(null)
      }
    })
  })
}

// IPC 핸들러
ipcMain.handle('start-capture', async () => {
  if (!mainWindow) return

  // 메인 윈도우 숨기기
  mainWindow.hide()
  await new Promise(r => setTimeout(r, 200))

  let base64: string | null = null

  if (process.platform === 'darwin') {
    base64 = await captureMac()
  } else {
    base64 = await captureWindows()
  }

  mainWindow.show()

  if (base64) {
    mainWindow.webContents.send('capture-result', base64)
  }
})

// 설정 관련 IPC
ipcMain.handle('get-api-key', () => {
  return store.get('geminiApiKey', '') as string
})

ipcMain.handle('set-api-key', (_event, key: string) => {
  store.set('geminiApiKey', key)
})

// 파일 저장 다이얼로그
ipcMain.handle('save-file-dialog', async () => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Excel 파일 저장',
    defaultPath: 'snap-ai-export.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  })
  return result.canceled ? null : result.filePath
})

// 파일 쓰기
ipcMain.handle('write-file', async (_event, filePath: string, data: number[]) => {
  const { writeFileSync } = await import('fs')
  writeFileSync(filePath, Buffer.from(data))
})

app.whenReady().then(createMainWindow)

app.on('window-all-closed', () => {
  app.quit()
})
