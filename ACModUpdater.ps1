Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# --- Configuration ---
$DefaultZipUrl = "https://example.com/seasonal_mods.zip" # À remplacer par l'URL réelle
$Title = "Assetto Corsa Mod Updater"
$AccentColor = "#3b82f6" # Bleu
$BgColor = "#111827" # Gris très sombre
$CardColor = "#1f2937" # Gris sombre
$TextColor = "#f9fafb" # Blanc cassé

# --- État de l'application ---
$Global:ACPath = ""
$Global:IsUpdating = $false

# --- Création de la Fenêtre ---
$Form = New-Object System.Windows.Forms.Form
$Form.Text = $Title
$Form.Size = New-Object System.Drawing.Size(600, 450)
$Form.StartPosition = "CenterScreen"
$Form.BackColor = [System.Drawing.ColorTranslator]::FromHtml($BgColor)
$Form.FormBorderStyle = "FixedDialog"
$Form.MaximizeBox = $false

# --- Police ---
$FontTitle = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$FontRegular = New-Object System.Drawing.Font("Segoe UI", 10)
$FontSmall = New-Object System.Drawing.Font("Segoe UI", 9)

# --- Composants Graphiques ---

# Titre
$LblTitle = New-Object System.Windows.Forms.Label
$LblTitle.Text = "AC Mod Updater"
$LblTitle.Font = $FontTitle
$LblTitle.ForeColor = [System.Drawing.ColorTranslator]::FromHtml($TextColor)
$LblTitle.Location = New-Object System.Drawing.Point(0, 30)
$LblTitle.Size = New-Object System.Drawing.Size(600, 40)
$LblTitle.TextAlign = "MiddleCenter"
$Form.Controls.Add($LblTitle)

# Sous-titre
$LblSub = New-Object System.Windows.Forms.Label
$LblSub.Text = "Gérez vos mods de saison simplement"
$LblSub.Font = $FontSmall
$LblSub.ForeColor = [System.Drawing.Color]::Gray
$LblSub.Location = New-Object System.Drawing.Point(0, 70)
$LblSub.Size = New-Object System.Drawing.Size(600, 20)
$LblSub.TextAlign = "MiddleCenter"
$Form.Controls.Add($LblSub)

# Zone de sélection du dossier
$GrpPath = New-Object System.Windows.Forms.Panel
$GrpPath.Size = New-Object System.Drawing.Size(500, 100)
$GrpPath.Location = New-Object New-Object System.Drawing.Point(50, 110)
$GrpPath.BackColor = [System.Drawing.ColorTranslator]::FromHtml($CardColor)
$Form.Controls.Add($GrpPath)

$LblPathHeader = New-Object System.Windows.Forms.Label
$LblPathHeader.Text = "Dossier d'installation Assetto Corsa :"
$LblPathHeader.ForeColor = [System.Drawing.Color]::LightGray
$LblPathHeader.Location = New-Object System.Drawing.Point(15, 15)
$LblPathHeader.Size = New-Object System.Drawing.Size(300, 20)
$GrpPath.Controls.Add($LblPathHeader)

$TxtPath = New-Object System.Windows.Forms.TextBox
$TxtPath.Location = New-Object System.Drawing.Point(15, 40)
$TxtPath.Size = New-Object System.Drawing.Size(350, 25)
$TxtPath.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#030712")
$TxtPath.ForeColor = [System.Drawing.Color]::White
$TxtPath.ReadOnly = $true
$GrpPath.Controls.Add($TxtPath)

$BtnBrowse = New-Object System.Windows.Forms.Button
$BtnBrowse.Text = "Parcourir"
$BtnBrowse.Location = New-Object System.Drawing.Point(375, 38)
$BtnBrowse.Size = New-Object System.Drawing.Size(110, 30)
$BtnBrowse.FlatStyle = "Flat"
$BtnBrowse.BackColor = [System.Drawing.Color]::FromArgb(75, 85, 99)
$BtnBrowse.ForeColor = [System.Drawing.Color]::White
$GrpPath.Controls.Add($BtnBrowse)

$LblStatusIcon = New-Object System.Windows.Forms.Label
$LblStatusIcon.Text = "⚠ Dossier non sélectionné"
$LblStatusIcon.ForeColor = [System.Drawing.Color]::Orange
$LblStatusIcon.Location = New-Object System.Drawing.Point(15, 70)
$LblStatusIcon.Size = New-Object System.Drawing.Size(400, 20)
$GrpPath.Controls.Add($LblStatusIcon)

# Section Progrès
$LblStatusText = New-Object System.Windows.Forms.Label
$LblStatusText.Text = "Prêt"
$LblStatusText.ForeColor = [System.Drawing.ColorTranslator]::FromHtml($TextColor)
$LblStatusText.Location = New-Object System.Drawing.Point(50, 230)
$LblStatusText.Size = New-Object System.Drawing.Size(400, 20)
$Form.Controls.Add($LblStatusText)

$ProgressBar = New-Object System.Windows.Forms.ProgressBar
$ProgressBar.Location = New-Object System.Drawing.Point(50, 255)
$ProgressBar.Size = New-Object System.Drawing.Size(500, 15)
$ProgressBar.Style = "Continuous"
$Form.Controls.Add($ProgressBar)

# Bouton Action
$BtnUpdate = New-Object System.Windows.Forms.Button
$BtnUpdate.Text = "Lancer la mise à jour"
$BtnUpdate.Location = New-Object System.Drawing.Point(50, 300)
$BtnUpdate.Size = New-Object System.Drawing.Size(500, 50)
$BtnUpdate.FlatStyle = "Flat"
$BtnUpdate.BackColor = [System.Drawing.ColorTranslator]::FromHtml($AccentColor)
$BtnUpdate.ForeColor = [System.Drawing.Color]::White
$BtnUpdate.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$BtnUpdate.Enabled = $false
$Form.Controls.Add($BtnUpdate)

# --- Logique ---

# Charger le chemin sauvegardé (si existant)
$ConfigPath = Join-Path $env:LOCALAPPDATA "ACModUpdater.conf"
if (Test-Path $ConfigPath) {
    $Global:ACPath = Get-Content $ConfigPath
    $TxtPath.Text = $Global:ACPath
}

function Verify-ACPath($path) {
    if ($null -eq $path -or $path -eq "") { return $false }
    $exePath = Join-Path $path "AssettoCorsa.exe"
    return Test-Path $exePath
}

function Update-UI-Status {
    if (Verify-ACPath $Global:ACPath) {
        $LblStatusIcon.Text = "✔ Dossier valide"
        $LblStatusIcon.ForeColor = [System.Drawing.Color]::SpringGreen
        $BtnUpdate.Enabled = -not $Global:IsUpdating
    } else {
        if ($Global:ACPath -ne "") {
            $LblStatusIcon.Text = "❌ AssettoCorsa.exe non trouvé"
            $LblStatusIcon.ForeColor = [System.Drawing.Color]::LightCoral
        }
        $BtnUpdate.Enabled = $false
    }
}

$BtnBrowse.Add_Click({
    $Browser = New-Object System.Windows.Forms.FolderBrowserDialog
    $Browser.Description = "Sélectionnez le dossier racine d'Assetto Corsa"
    if ($Browser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $Global:ACPath = $Browser.SelectedPath
        $TxtPath.Text = $Global:ACPath
        $Global:ACPath | Out-File $ConfigPath
        Update-UI-Status
    }
})

function Start-UpdateProcess {
    $Global:IsUpdating = $true
    $BtnUpdate.Enabled = $false
    $BtnBrowse.Enabled = $false
    
    try {
        $TempDir = Join-Path $env:TEMP "ACUpdaterTemp"
        if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
        New-Item -ItemType Directory -Path $TempDir | Out-Null
        
        $ZipPath = Join-Path $TempDir "mods.zip"
        
        # 1. Téléchargement
        $LblStatusText.Text = "Téléchargement des mods..."
        $ProgressBar.Value = 10
        
        # Téléchargement avec .NET pour avoir une expérience propre (Powershell 5.1 n'aime pas trop l'async UI)
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($DefaultZipUrl, $ZipPath)
        
        $ProgressBar.Value = 50
        
        # 2. Extraction
        $LblStatusText.Text = "Extraction des fichiers..."
        $ExtractPath = Join-Path $TempDir "extracted"
        Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
        
        $ProgressBar.Value = 75
        
        # 3. Installation
        $LblStatusText.Text = "Installation dans Assetto Corsa..."
        $ContentPath = Join-Path $Global:ACPath "content"
        
        # Fonction récursive pour trouver et déplacer cars/tracks
        function Install-Folders($source) {
            $items = Get-ChildItem $source -Directory
            foreach ($item in $items) {
                if ($item.Name -ieq "cars" -or $item.Name -ieq "tracks") {
                    $targetBase = Join-Path $ContentPath $item.Name
                    if (-not (Test-Path $targetBase)) { New-Item -ItemType Directory -Path $targetBase | Out-Null }
                    
                    Get-ChildItem $item.FullName -Directory | ForEach-Object {
                        $dest = Join-Path $targetBase $_.Name
                        if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
                        Move-Item $_.FullName $dest -Force
                    }
                } else {
                    Install-Folders $item.FullName
                }
            }
        }
        
        Install-Folders $ExtractPath
        
        # Nettoyage
        Remove-Item $TempDir -Recurse -Force
        
        $ProgressBar.Value = 100
        $LblStatusText.Text = "Mise à jour terminée avec succès !"
        [System.Windows.Forms.MessageBox]::Show("La mise à jour a été installée avec succès.", "Terminé", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        
    } catch {
        $LblStatusText.Text = "Erreur : $($_.Exception.Message)"
        [System.Windows.Forms.MessageBox]::Show("Une erreur est survenue :`n$($_.Exception.Message)", "Erreur", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    } finally {
        $Global:IsUpdating = $false
        Update-UI-Status
        $BtnBrowse.Enabled = $true
    }
}

$BtnUpdate.Add_Click({
    Start-UpdateProcess
})

# Initialisation de l'UI
Update-UI-Status

# Affichage
$Form.ShowDialog() | Out-Null
