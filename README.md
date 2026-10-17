# DocStitch

DocStich is a Windows application designed to simplify document image arrangement and printing. It helps online service center operators combine the front and back sides of documents, such as Aadhaar cards and voter IDs, onto a single A4 page.

Built to solve everyday problems faced by shopkeepers, DocStich makes preparing documents for government portal uploads and customer photocopies faster, easier, and more convenient.

## Features

- Add multiple image files by browsing or dragging and dropping them.
- Choose a document type, including Aadhar, Voter ID, PAN, passport, driving licence, ration card, or a custom size.
- Preview and arrange images on A4 pages, with controls for card width, spacing, and items per page.
- Add blank A4 pages to the project and include them in exported PDFs.
- Edit, duplicate, reorder, and remove images; adjust individual image placement and size.
- Export PDFs with lossless, standard, balanced, or custom target-size compression.
- Automatically save the current project in browser storage and restore it on the next launch.
- Show the installed app version and check GitHub Releases for the latest published update.

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
tests before packaging the app. The desktop app shows the latest release
version and publication date when an update is available.

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
