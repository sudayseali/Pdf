# SilentPDF

## How to build icons
To generate icons and sync them with the Android project, run:
```bash
npm run generate-icons
```
This runs `@capacitor/assets` using the images in the `assets/` folder, then calls `npx cap sync android`.
