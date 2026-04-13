import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs-extra'
import axios from 'axios'
import AdmZip from 'adm-zip'
import os from 'node:os'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.svg'),
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Assetto Corsa Mod Updater',
    backgroundColor: '#111827', // Tailwind dark gray
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
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

app.whenReady().then(createWindow)

// --- IPC Handlers ---

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('verify-folder', async (_event, folderPath: string) => {
  try {
    const exePath = path.join(folderPath, 'AssettoCorsa.exe')
    return await fs.pathExists(exePath)
  } catch (error) {
    return false
  }
})

ipcMain.handle('start-update', async (_event, { acPath, zipUrl }: { acPath: string, zipUrl: string }) => {
  try {
    const tempDir = path.join(os.tmpdir(), 'ac-updater-temp')
    await fs.ensureDir(tempDir)
    
    const zipPath = path.join(tempDir, 'mods.zip')
    
    // 1. Download
    win?.webContents.send('update-status', { step: 'downloading', progress: 0 })
    
    const response = await axios({
      url: zipUrl,
      method: 'GET',
      responseType: 'stream'
    })

    const totalLength = parseInt(response.headers['content-length'], 10)
    let downloadedLength = 0

    const writer = fs.createWriteStream(zipPath)

    response.data.on('data', (chunk: any) => {
      downloadedLength += chunk.length
      const progress = Math.round((downloadedLength / totalLength) * 100)
      win?.webContents.send('update-status', { step: 'downloading', progress })
    })

    response.data.pipe(writer)

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    // 2. Extract
    win?.webContents.send('update-status', { step: 'extracting', progress: 0 })
    
    const zip = new AdmZip(zipPath)
    const extractPath = path.join(tempDir, 'extracted')
    await fs.ensureDir(extractPath)
    
    // Extraction (AdmZip est synchrone, on simule une barre de progression si possible ou on passe directement)
    zip.extractAllTo(extractPath, true)
    win?.webContents.send('update-status', { step: 'extracting', progress: 100 })

    // 3. Move files
    win?.webContents.send('update-status', { step: 'installing', progress: 0 })
    
    // Structure attendue dans le zip : dossiers "cars" et "tracks"
    // Ou directement les dossiers de mods s'ils sont déjà classés.
    // On va chercher récursivement ou supposer une structure simple : 
    // extracted/cars/... -> acPath/content/cars/...
    // extracted/tracks/... -> acPath/content/tracks/...
    
    const contentPath = path.join(acPath, 'content')
    await fs.ensureDir(path.join(contentPath, 'cars'))
    await fs.ensureDir(path.join(contentPath, 'tracks'))

    const processFolder = async (folder: string) => {
      if (await fs.pathExists(folder)) {
        const items = await fs.readdir(folder)
        for (const item of items) {
          const itemPath = path.join(folder, item)
          const stats = await fs.stat(itemPath)
          
          if (stats.isDirectory()) {
            // Déterminer si c'est une voiture ou un circuit (simplification ou check de structure)
            // Pour l'instant on suppose que le ZIP respecte une structure "cars/..." et "tracks/..."
            if (folder.includes('cars')) {
              await fs.move(itemPath, path.join(contentPath, 'cars', item), { overwrite: true })
            } else if (folder.includes('tracks')) {
              await fs.move(itemPath, path.join(contentPath, 'tracks', item), { overwrite: true })
            }
          }
        }
      }
    }

    // On parcourt récursivement pour trouver "cars" et "tracks" au cas où ils sont dans un sous-dossier
    const findAndMove = async (dir: string) => {
      const items = await fs.readdir(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stats = await fs.stat(fullPath)
        if (stats.isDirectory()) {
          if (item.toLowerCase() === 'cars') {
            await processFolder(fullPath)
          } else if (item.toLowerCase() === 'tracks') {
            await processFolder(fullPath)
          } else {
            await findAndMove(fullPath)
          }
        }
      }
    }

    await findAndMove(extractPath)
    
    // Nettoyage
    await fs.remove(tempDir)
    
    win?.webContents.send('update-status', { step: 'completed', progress: 100 })
    return { success: true }

  } catch (error: any) {
    console.error('Update failed:', error)
    win?.webContents.send('update-status', { step: 'error', message: error.message })
    return { success: false, error: error.message }
  }
})
