# How to Play Locally Without a Server

## The Issue
Modern browsers block ES6 modules when opened via `file://` protocol for security reasons.

## Solution 1: Browser Flag (Chrome/Edge)
You can launch Chrome/Edge with a special flag to allow local file access:

### For Chrome:
```batch
chrome.exe --allow-file-access-from-files "C:\Users\bmullins\Desktop\card-game\index-clean.html"
```

### For Edge:
```batch
msedge.exe --allow-file-access-from-files "C:\Users\bmullins\Desktop\card-game\index-clean.html"
```

Create a shortcut with this command for easy access!

## Solution 2: Use Firefox
Firefox is more lenient with local files. Just:
1. Open Firefox
2. Press Ctrl+O
3. Navigate to your index-clean.html
4. It should work!

## Solution 3: Browser Extension
Install "Web Server for Chrome" extension:
1. Install from Chrome Web Store
2. Point it to your card-game folder
3. Access via http://localhost:8887

## Solution 4: Python (if installed)
```bash
cd C:\Users\bmullins\Desktop\card-game
python -m http.server 8000
```
Then open http://localhost:8000/index-clean.html

## Recommended: GitHub Pages
See DEPLOY_TO_GITHUB.md for the permanent, free solution that works everywhere!