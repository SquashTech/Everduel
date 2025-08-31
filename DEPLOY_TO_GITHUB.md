# Deploy Your Card Game to GitHub Pages (Free Hosting)

## Quick Setup (5 minutes)

### 1. Create GitHub Account (if you don't have one)
- Go to https://github.com and sign up (free)

### 2. Create New Repository
1. Click the green "New" button or go to https://github.com/new
2. Name it something like `card-game` 
3. Make it Public (required for free GitHub Pages)
4. Don't initialize with README (we'll upload your existing files)
5. Click "Create repository"

### 3. Upload Your Files
GitHub provides a simple drag-and-drop interface:
1. On your new repository page, click "uploading an existing file" link
2. Drag your entire `card-game` folder contents into the browser
3. Write a commit message like "Initial upload"
4. Click "Commit changes"

### 4. Enable GitHub Pages
1. In your repository, click "Settings" tab
2. Scroll down to "Pages" section (left sidebar)
3. Under "Source", select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

### 5. Access Your Game!
- Wait 2-3 minutes for deployment
- Your game will be live at: `https://[your-username].github.io/card-game/index-clean.html`
- No CORS errors, no server needed!

## Alternative Upload Method (Using Git)

If you prefer command line:

```bash
# Navigate to your card-game folder
cd C:\Users\bmullins\Desktop\card-game

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add your GitHub repository as origin (replace with your URL)
git remote add origin https://github.com/YOUR_USERNAME/card-game.git

# Push to GitHub
git push -u origin main
```

## Benefits
- ✅ Free forever (as long as GitHub exists)
- ✅ No CORS issues
- ✅ Automatic HTTPS
- ✅ Share link with anyone
- ✅ Updates automatically when you push changes
- ✅ No local server needed

## Updating Your Game
Once set up, updating is easy:
1. Make changes to your files locally
2. Upload the changed files through GitHub's web interface
3. OR use git commands: `git add .`, `git commit -m "Update"`, `git push`
4. Changes appear online in ~1 minute