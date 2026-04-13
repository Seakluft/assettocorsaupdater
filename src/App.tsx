import { useState, useEffect } from 'react'
import { FolderOpen, CheckCircle, AlertCircle, Download, Package, Settings, Car, Map } from 'lucide-react'

type Step = 'idle' | 'downloading' | 'extracting' | 'installing' | 'completed' | 'error'

function App() {
  const [acPath, setAcPath] = useState<string>(localStorage.getItem('acPath') || '')
  const [isValidPath, setIsValidPath] = useState<boolean>(false)
  const [status, setStatus] = useState<Step>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Placeholder URL for the zip (user will need to change this)
  const ZIP_URL = 'https://example.com/seasonal_mods.zip' 

  useEffect(() => {
    if (acPath) {
      verifyPath(acPath)
    }
  }, [])

  const verifyPath = async (path: string) => {
    const valid = await window.electronAPI.verifyFolder(path)
    setIsValidPath(valid)
    if (valid) {
      localStorage.setItem('acPath', path)
    }
  }

  const handleSelectFolder = async () => {
    const path = await window.electronAPI.selectFolder()
    if (path) {
      setAcPath(path)
      verifyPath(path)
    }
  }

  const startUpdate = async () => {
    if (!isValidPath) return
    
    setErrorMessage('')
    setStatus('downloading')
    setProgress(0)

    const unsubscribe = window.electronAPI.onUpdateStatus((statusUpdate) => {
      setStatus(statusUpdate.step as Step)
      setProgress(statusUpdate.progress)
      if (statusUpdate.step === 'error') {
        setErrorMessage(statusUpdate.message || 'Une erreur inconnue est survenue.')
      }
    })

    const result = await window.electronAPI.startUpdate({ acPath, zipUrl: ZIP_URL })
    
    if (!result.success) {
      setStatus('error')
      setErrorMessage(result.error || 'Échec de la mise à jour.')
    }

    unsubscribe()
  }

  const getStatusText = () => {
    switch (status) {
      case 'downloading': return 'Téléchargement des mods...'
      case 'extracting': return 'Extraction des fichiers...'
      case 'installing': return 'Installation dans Assetto Corsa...'
      case 'completed': return 'Mise à jour terminée avec succès !'
      case 'error': return 'Erreur lors de la mise à jour'
      default: return 'Prêt à mettre à jour'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-8 bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white flex items-center justify-center gap-3">
            <Settings className="text-blue-500 animate-spin-slow" />
            AC Mod Updater
          </h1>
          <p className="text-gray-400">Gérez vos mods de saison en un clic</p>
        </div>

        {/* Path Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-400">
            Dossier d'installation Assetto Corsa
          </label>
          <div className="flex gap-2">
            <div className={`flex-1 p-3 rounded-lg bg-gray-950 border ${isValidPath ? 'border-green-500/50' : 'border-red-500/50'} text-sm truncate`}>
              {acPath || "Aucun dossier sélectionné"}
            </div>
            <button 
              onClick={handleSelectFolder}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <FolderOpen size={18} />
              Parcourir
            </button>
          </div>
          {!isValidPath && acPath && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle size={12} /> Dossier invalide. Sélectionnez le dossier racine contenant AssettoCorsa.exe
            </p>
          )}
          {isValidPath && (
            <p className="text-green-400 text-xs flex items-center gap-1">
              <CheckCircle size={12} /> Dossier valide trouvé
            </p>
          )}
        </div>

        {/* Progress Section */}
        {status !== 'idle' && (
          <div className="space-y-4 p-6 bg-gray-950/50 rounded-xl border border-gray-700">
            <div className="flex justify-between items-end">
              <span className={`text-sm font-medium ${status === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                {getStatusText()}
              </span>
              <span className="text-xs text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {status === 'error' && (
              <p className="text-red-400 text-sm italic">{errorMessage}</p>
            )}
            {status === 'completed' && (
              <div className="flex justify-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Car size={14} /> Voitures installées
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Map size={14} /> Circuits installés
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          disabled={!isValidPath || (status !== 'idle' && status !== 'completed' && status !== 'error')}
          onClick={startUpdate}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95
            ${!isValidPath 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : status === 'completed'
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }
          `}
        >
          {status === 'idle' && <Download size={22} />}
          {status === 'completed' && <CheckCircle size={22} />}
          {(status !== 'idle' && status !== 'completed' && status !== 'error') && <Package className="animate-bounce" size={22} />}
          {status === 'idle' ? 'Lancer la mise à jour' : status === 'completed' ? 'Mettre à jour à nouveau' : 'Traitement...'}
        </button>

        <p className="text-center text-xs text-gray-500">
          Cette opération va télécharger et extraire les derniers mods officiels de la saison.
        </p>
      </div>
    </div>
  )
}

export default App
