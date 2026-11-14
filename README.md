# B.Tech Notes — Google Drive-powered Study Portal

Minimal, responsive React/Vite portal for **B.Tech 2019 Scheme**, Computer Science and Cyber Security, with S1 & S2 combined, plus S3–S8.

## Requirements

- Node.js **20.19+ or 22.12+** (compatible with Vite 6)
- npm
- A Google account that can access the notes folder
- Permission to expose folder and file **names/links** to website visitors if deploying publicly

## 1. Open in your Downloads/B.Tech Notes folder

1. Extract the ZIP.
2. Copy the **contents** of the `btech-notes-portal` folder into `~/Downloads/B.Tech Notes/` (Linux) or `Downloads\\B.Tech Notes\\` (Windows). Do not accidentally create a second nested project folder unless you want one.
3. In VS Code, open **B.Tech Notes** and launch **Terminal → New Terminal**.
4. Run:

```bash
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell: replace `cp .env.example .env` with `Copy-Item .env.example .env`.

Vite prints a local address, normally `http://localhost:5173/`. Open it in your browser.

**Before connecting Drive** the landing page/semester cards work, but subject lists cannot load. This is intentional, not an error.

## 2. Deploy the Google Apps Script backend

1. Go to https://script.google.com/ and create **New project**.
2. Open the supplied `google-apps-script/Code.gs` in VS Code. Paste its whole content into Apps Script's `Code.gs` file, replacing the default content.
3. Check `ROOT_FOLDER_ID` at the top. It is already set to the shared Drive folder ID: `1wls3_9Y_tgoV9Twq8bsiIo3wkrxkcoQ6`.
4. Click **Deploy → New deployment → Select type → Web app**.
5. Choose **Execute as: Me**. Choose **Who has access: Anyone** only if it is acceptable for the app to reveal the names/links of notes in this Drive folder to anyone who visits your website. Google may request authorization to read Drive folders.
6. Click **Deploy**, authorize your script, and copy the **Web app URL** ending in `/exec`.
7. In `B.Tech Notes/.env`, set:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_DRIVE_ROOT_URL=https://drive.google.com/drive/folders/1wls3_9Y_tgoV9Twq8bsiIo3wkrxkcoQ6
```

8. Restart `npm run dev` after changing `.env`.
9. Click **Refresh Drive** on the homepage.

**Important:** Apps Script cannot automatically grant users access to private PDFs. It can list file names and URLs when the script owner can access them, but Google Drive permissions still apply to PDF previews and downloads. To let anyone read notes, the respective files should be shared appropriately by their owners. A Google Workspace admin may forbid public Web App deployments.

## 3. How the folder mapping works

The backend scans folder **names**, starting at the shared root, and attempts to locate:

- `S1 & S2`, `S1 and S2`, `Semester 1 & 2` or `First Year`
- `S3`, `S4`, `S5`, `S6`, `S7`, `S8` (also `Sem 3`, `Semester 3`, etc.)

It searches up to `MAX_SCAN_DEPTH = 5` folder levels and `MAX_SCAN_FOLDERS = 600` folders. Both are adjustable at the top of `Code.gs`. It lists folders underneath each semester on demand, so subjects are never invented or hard-coded. If there are multiple branches (e.g. CS and Cyber Security), the app offers a branch/folder selection for that semester.

If your Drive has a different naming convention, update the `semesterKey_` function. If folders are deeper than 5 levels, increase `MAX_SCAN_DEPTH` cautiously. Apps Script execution quotas may limit very large folder scans.

## 4. Updating backend code

After editing Apps Script, create a new **version** of your existing web app deployment via **Deploy → Manage deployments → Edit → Version → New version → Deploy**. Then reload the site.

## 5. Troubleshooting

- **Folder not found:** Confirm names, depth, and that the Google account running Apps Script can access all parent folders. Inspect `semesterKey_`.
- **Could not connect:** Ensure your `.env` uses the `/exec` URL, access permits your audience, deployment is authorized, and the URL is from your own Apps Script.
- **Timeout:** Large Drive scans can take too long. Reduce scan depth, reorganize folders, or narrow the root. Apps Script quotas apply.
- **Preview asks for sign-in:** File sharing permissions do not allow the viewer to read it. The portal cannot bypass Drive permissions.
- **Cards visible but no notes:** You have not yet deployed the backend, or the `.env` URL is missing. Check the setup notice.
- **Page not updating:** Restart Vite after `.env` edits, click Refresh Drive, and redeploy Apps Script if its code changed.

## Security and privacy

This is a read-only catalog. It does **not** upload, delete, or modify Google Drive files. The backend executes with the deployer's Drive permissions and intentionally exposes **metadata (names, paths, links, sizes)** within the configured folder tree. Do not deploy `Who has access: Anyone` for confidential notes. For private or campus-only deployments, use a proper authenticated backend; JSONP is not suitable for protecting private metadata. Trust only your own Apps Script endpoint.

## Build

```bash
npm run build
npm run preview
```

The production build is generated in `dist/` and can be hosted on a static web host. Configure `VITE_APPS_SCRIPT_URL` before building.

## Project structure

```text
B.Tech Notes/
├── google-apps-script/
│   └── Code.gs           # Read-only Drive catalog API
├── src/
│   ├── api.js            # JSONP client
│   ├── App.jsx           # UI, semester navigation, folder browser
│   ├── main.jsx          # React entry point
│   └── styles.css        # Minimal black/white/orange design
├── .env.example
├── .gitignore
├── index.html
├── package.json
└── README.md
```
