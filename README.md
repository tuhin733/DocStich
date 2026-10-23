# DocStitch

DocStich is a Windows application designed to simplify document image arrangement and printing. It helps online service center operators combine the front and back sides of documents, such as Aadhaar cards and voter IDs, onto a single A4 page.

Built to solve everyday problems faced by shopkeepers, DocStich makes preparing documents for government portal uploads and customer photocopies faster, easier, and more convenient.

## Features

- Add multiple image files by browsing or dragging and dropping them.
- Scan documents from WIA-compatible scanners and printers using the Windows scan dialog; DocStitch detects, crops, and perspective-corrects the document automatically when it can identify its edges.
- Choose a document type, including Aadhar, Voter ID, PAN, passport, driving licence, ration card, or a custom size.
- Preview and arrange images on A4 pages, with controls for card width, spacing, and items per page.
- Add blank A4 pages to the project and include them in exported PDFs.
- Edit, duplicate, reorder, and remove images; adjust individual image placement and size.
- Export PDFs with lossless, standard, balanced, or custom target-size compression.
- Automatically save the current project in browser storage and restore it on the next launch.
- Show the installed app version and check GitHub Releases for the latest published update.

### Scanner troubleshooting

Scanning requires Windows to detect a WIA-compatible scanner. If DocStitch cannot connect, make sure the printer is turned on and connected, install its WIA-compatible driver, and confirm it can scan in Windows Scan or Windows Fax and Scan before trying again. For automatic document detection, place the document against a scanner bed that contrasts with its edges. If detection is uncertain, DocStitch asks you to rescan instead of importing the full scanner page.

## Requirements

- Node.js and npm
- Windows for running or packaging the Electron desktop app

## Getting started

Install dependencies:

```sh
npm install
```

Start the desktop app in development mode:

```sh
npm run start
```

To run only the Vite web development server:

```sh
npm run dev
```

## Build and checks

Create a production web build:

```sh
npm run build
```

Package the Windows desktop installer (NSIS):

```sh
npm run electron:build
```

## GitHub releases

Push a version tag such as `v1.0.0` to build the Windows installer and publish
it as a GitHub release. The release workflow runs the type-check, lint, and
tests before packaging the app. The desktop app shows an update notification on the home screen and provides a
download link both there and in the About dialog when a newer release is available.

```sh
git tag v1.0.0
git push origin v1.0.0
```

Run the project's checks:

```sh
npm run typecheck
npm run lint
npm test
```

## Keyboard shortcuts

- `Ctrl+O` — open the image file picker
- `Ctrl+S` — open PDF export options
