import { join } from 'node:path'
import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'

/**
 * Standard-Speicherort für Instanzen (Owner-Entscheidung 2026-07-27):
 * %APPDATA%\KiritClient\instances
 *
 * `app.getPath('appData')` liefert unter Windows %APPDATA%. In den Einstellungen
 * wird der Ort später änderbar; einzelne Instanzen bleiben davon unabhängig
 * verschiebbar.
 */
function defaultInstancesDir(): string {
  return join(app.getPath('appData'), 'KiritClient', 'instances')
}

/**
 * Hintergrundfarbe = --bg0 aus dem Designsystem. Wird gesetzt, damit beim Start
 * kein weißes Aufblitzen entsteht, bevor der Renderer gezeichnet hat.
 */
const BACKGROUND = '#050b1c'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    backgroundColor: BACKGROUND,
    // Rahmenlos: die Titelleiste zeichnet der Renderer selbst.
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Erst zeigen, wenn wirklich gezeichnet wurde.
  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // Fenster-Zustand an den Renderer melden, damit das Maximieren-Icon stimmt.
  const emitState = (): void => {
    mainWindow?.webContents.send('window:state', {
      maximized: mainWindow.isMaximized()
    })
  }
  mainWindow.on('maximize', emitState)
  mainWindow.on('unmaximize', emitState)

  // Externe Links gehören in den Browser, nicht in ein Electron-Fenster.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Navigation aus der App heraus unterbinden — der Renderer bleibt auf seiner Seite.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devServer = process.env['ELECTRON_RENDERER_URL']
    if (!devServer || !url.startsWith(devServer)) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devServer) {
    void mainWindow.loadURL(devServer)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/** Fenstersteuerung für die eigene Titelleiste. */
function registerWindowControls(): void {
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:default-instances-dir', () => defaultInstancesDir())
}

// Nur eine Instanz — ein zweiter Start holt das vorhandene Fenster nach vorn.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    // Ohne diese ID zeigt Windows in Taskleiste und Benachrichtigungen "electron.app".
    app.setAppUserModelId('dev.imkirit.kiritclient')
    nativeTheme.themeSource = 'dark'

    registerWindowControls()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
