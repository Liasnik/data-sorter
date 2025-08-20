import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
console.log('userData:', app.getPath('userData'))
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Disable scary security warnings in development (Vite dev server uses eval)
if (!app.isPackaged) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let currentLocale: 'en' | 'ru' | 'uk' = 'en'
let currentTheme: 'system' | 'light' | 'dark' = 'system'

// Path for persisted big-input buffer
const getBufferPath = () => path.join(app.getPath('userData'), 'buffer.txt')

function buildLanguageSubmenu(locale: 'en' | 'ru' | 'uk'): Electron.MenuItemConstructorOptions[] {
  return [
    {
      label: 'English', type: 'radio', checked: locale === 'en',
      click: () => { currentLocale = 'en'; win?.webContents.send('set-locale', 'en'); Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(currentLocale))) }
    },
    {
      label: 'Українська', type: 'radio', checked: locale === 'uk',
      click: () => { currentLocale = 'uk'; win?.webContents.send('set-locale', 'uk'); Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(currentLocale))) }
    },
    {
      label: 'Русский', type: 'radio', checked: locale === 'ru',
      click: () => { currentLocale = 'ru'; win?.webContents.send('set-locale', 'ru'); Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(currentLocale))) }
    },
  ]
}

function buildMenu(locale: 'en' | 'ru' | 'uk') {
  const isWin = process.platform === 'win32'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isWin ? [] : [{ role: 'appMenu' as const }]),
    { role: 'fileMenu' },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Language',
          submenu: buildLanguageSubmenu(locale)
        },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            { label: 'System', type: 'radio', checked: currentTheme === 'system', click: () => { currentTheme = 'system'; win?.webContents.send('set-theme', 'system') } },
            { label: 'Light', type: 'radio', checked: currentTheme === 'light', click: () => { currentTheme = 'light'; win?.webContents.send('set-theme', 'light') } },
            { label: 'Dark', type: 'radio', checked: currentTheme === 'dark', click: () => { currentTheme = 'dark'; win?.webContents.send('set-theme', 'dark') } }
          ]
        }
      ]
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { label: 'Language', submenu: buildLanguageSubmenu(locale) },
    { label: 'Theme', submenu: [
      { label: 'System', type: 'radio', checked: currentTheme === 'system', click: () => { currentTheme = 'system'; win?.webContents.send('set-theme', 'system') } },
      { label: 'Light', type: 'radio', checked: currentTheme === 'light', click: () => { currentTheme = 'light'; win?.webContents.send('set-theme', 'light') } },
      { label: 'Dark', type: 'radio', checked: currentTheme === 'dark', click: () => { currentTheme = 'dark'; win?.webContents.send('set-theme', 'dark') } }
    ] },
    { label: 'Actions', submenu: [
      { label: 'Clear input', click: () => { win?.webContents.send('clear-input'); fs.unlink(getBufferPath()).catch(() => {}) } },
      { label: 'Clear all data', click: async () => {
          try { win?.webContents.send('clear-all') } catch {}
          try { await fs.unlink(getBufferPath()) } catch {}
        }
      },
      { label: 'Open data folder', click: () => { shell.openPath(app.getPath('userData')) } },
      { role: 'reload', label: 'Restart' }
    ] }
  ]
  return template
}
const APP_TITLE = 'Sorter8'

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Prevent navigation/new-window (e.g., from drag&drop)
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Apply application menu
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(currentLocale)))

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Sync locale from renderer if it changes there (e.g., from localStorage on mount)
  ipcMain.on('locale-updated', (_evt, locale: 'en' | 'ru' | 'uk') => {
    if (locale && ['en','ru','uk'].includes(locale)) {
      currentLocale = locale
      Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(currentLocale)))
    }
  })

  ipcMain.on('theme-updated', (_evt, theme: 'system' | 'light' | 'dark') => {
    if (theme && ['system','light','dark'].includes(theme)) {
      currentTheme = theme
      Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(currentLocale)))
    }
  })

  // Persist big textarea buffer to disk and restore on load
  const bufferPath = getBufferPath()
  ipcMain.on('save-buffer', async (_evt, text: string) => {
    try { await fs.writeFile(bufferPath, text ?? '', 'utf8') } catch {}
  })
  win.webContents.on('did-finish-load', async () => {
    try {
      const data = await fs.readFile(bufferPath, 'utf8')
      if (data) win?.webContents.send('load-buffer', data)
    } catch {}
  })

  // Fix title
  win.on('page-title-updated', (event) => {
    event.preventDefault()
    win?.setTitle(APP_TITLE)
  })

  win.webContents.on('did-finish-load', () => {
    win?.setTitle(APP_TITLE)
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Ensure buffer is removed on app exit so the input is cleared next launch
app.on('before-quit', async () => {
  try { await fs.unlink(getBufferPath()) } catch {}
  const base = app.getPath('userData')
  try { await fs.rm(path.join(base, 'Local Storage'), { recursive: true, force: true }) } catch {}
  try { await fs.rm(path.join(base, 'IndexedDB'), { recursive: true, force: true }) } catch {}
})

app.whenReady().then(createWindow)
