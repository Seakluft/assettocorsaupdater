# Assetto Corsa Mod Updater

Une application simple et moderne pour mettre à jour les mods d'une saison Assetto Corsa.

## Fonctionnement
1.  L'utilisateur sélectionne son dossier Assetto Corsa (celui qui contient `AssettoCorsa.exe`).
2.  L'application télécharge un pack ZIP contenant les dossiers de voitures et de circuits.
3.  L'application extrait automatiquement les fichiers et les déplace dans `content/cars` et `content/tracks`.

## Configuration
Avant de compiler l'application, assurez-vous de modifier l'URL du fichier ZIP dans `src/App.tsx` :

```typescript
// src/App.tsx
const ZIP_URL = 'https://votre-serveur.com/votre_pack_mods.zip'
```

## Structure du ZIP attendue
Pour que l'installation automatique fonctionne, votre fichier ZIP doit contenir (directement ou dans des sous-dossiers) :
*   Un dossier `cars` contenant les dossiers des voitures.
*   Un dossier `tracks` contenant les dossiers des circuits.

## Développement
```bash
npm install
npm run dev
```

## Compilation (.exe)
```bash
npm run build
```
L'exécutable se trouvera dans le dossier `dist_electron`.
