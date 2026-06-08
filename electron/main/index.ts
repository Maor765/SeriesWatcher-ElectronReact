import { app, BrowserWindow, shell } from 'electron'
import { join, dirname } from 'path'
import { initDb } from './dbService'
import { registerIpc } from './ipc'
import { tryAutoImport } from './importer'

function getDbPath()  { return app.isPackaged ? join(dirname(app.getPath('exe')), 'series.db')    : join(process.cwd(), 'series.db') }
function getLogPath() { return app.isPackaged ? join(dirname(app.getPath('exe')), 'mutations.log') : join(process.cwd(), 'mutations.log') }
function getMdfPath() { return app.isPackaged ? join(dirname(app.getPath('exe')), 'dbSeries.mdf') : join(process.cwd(), 'dbSeries.mdf') }

function createWindow(): void {
  const preload = join(__dirname, '../preload/index.js')
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'resources/icon.png')
    : join(process.cwd(), 'resources/icon.png')
  const win = new BrowserWindow({
    width: 1100, height: 700,
    minWidth: 800, minHeight: 500,
    icon: iconPath,
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false }
  })
  // Redirect all window.open() calls to the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (!app.isPackaged) win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  const logPath = getLogPath()
  const nativeBinding = app.isPackaged
    ? join(process.resourcesPath, 'better_sqlite3.node')
    : undefined
  initDb(getDbPath(), logPath, nativeBinding)
  tryAutoImport(getMdfPath(), logPath)
  registerIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
