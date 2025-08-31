# Git Workflow for Future Updates

## How Claude Code Can Help

When you make updates to your game, just ask me to:
1. Make the code changes
2. Commit and push to GitHub
3. Your game will automatically update at your GitHub Pages URL!

## Example Commands You Can Give Me:

### After making changes:
- "Commit and push these changes to GitHub"
- "Update the game on GitHub"
- "Push to GitHub with message 'Added new cards'"

### What I'll Do:
```bash
# 1. Stage all changes
git add .

# 2. Create a commit
git commit -m "Your update message"

# 3. Push to GitHub
git push origin main
```

### Your game updates automatically!
- Changes appear at your GitHub Pages URL in 1-2 minutes
- No need to run any servers
- Test immediately at: https://[your-username].github.io/[repo-name]/index-clean.html

## Common Scenarios:

### "Add a new feature and update GitHub"
I'll:
1. Write the code
2. Test it locally if needed
3. Commit with a descriptive message
4. Push to GitHub
5. Tell you when it's ready to test online

### "Fix a bug and deploy"
I'll:
1. Find and fix the bug
2. Commit the fix
3. Push to GitHub
4. Your live game is fixed!

## Important Notes:
- Always tell me if you want changes pushed to GitHub
- I'll never push without your explicit request
- Each push updates your live game
- You can always review changes before I push