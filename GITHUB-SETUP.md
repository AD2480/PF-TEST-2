# Upload to AD2480/PF-TEST-2

This is a source-code package. Extract the ZIP before uploading. Keep frontend and backend directly at the repository root. Do not upload this ZIP itself.

## Recommended: GitHub Desktop (avoids browser file-count limits)
1. Sign in to GitHub Desktop and clone https://github.com/AD2480/PF-TEST-2.
2. Extract PF-TEST-2-GitHub-Ready.zip.
3. Copy the extracted contents into the cloned PF-TEST-2 folder, alongside its existing ZIP. Do not create an extra enclosing folder.
4. Include .gitignore (on macOS, Command+Shift+Period shows hidden files). Do not copy a .git folder.
5. Review changes, commit with the summary Add extracted ProjectFlow source, then Push origin.
6. GitHub should now show frontend/package.json and backend/pom.xml as ordinary files.

## Vercel demo deployment
Import AD2480/PF-TEST-2, branch main.
- Framework: Vite
- Root Directory: frontend
- Install Command: npm install
- Build Command: npm run build
- Output Directory: dist
- Environment variable: VITE_USE_MOCK_API=true

Refresh the Vercel import page after pushing. Select frontend in the Root Directory picker.
Demo data is saved separately in each browser. Real shared accounts and database persistence require deploying the backend and MySQL separately.

## Verification
The archive structure and configuration files were checked. Application source and the existing frontend/vercel.json were preserved. No npm/Maven build or deployment was performed as part of repackaging.
