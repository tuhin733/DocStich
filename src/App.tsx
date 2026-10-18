import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Github,
  Heart,
  Info,
  Download,
  Minus,
  Square,
  Copy,
  X,
} from "lucide-react";
import { DOC_CATEGORIES } from "./constants";
import { paginate } from "./lib/pagination";
import { useProjectState } from "./hooks/useProjectState";
import UploadZone from "./components/UploadZone";
import DocTray from "./components/DocTray";
import A4Page from "./components/A4Page";
import ControlPanel from "./components/ControlPanel";
import ImageEditor from "./components/ImageEditor";
import PdfExportDialog from "./components/PdfExportDialog";
import AboutDialog from "./components/AboutDialog";
import DonationDialog from "./components/DonationDialog";
import type { UpdateStatus } from "./types";

function App() {
  const {
    docs,
    blankPageCount,
    settings,
    busy,
    arrangeMode,
    defaultCategory,
    editingDocId,
    importError,
    actionError,
    showPdfExportDialog,
    showExportToast,
    setArrangeMode,
    setDefaultCategory,
    setEditingDocId,
    setImportError,
    addFiles,
    addPage,
    addPageAfter,
    duplicatePage,
    movePage,
    deletePage,
    removeDoc,
    duplicateDoc,
    reorderDoc,
    changeLabel,
    changeDocumentSize,
    changePlacement,
    resetPlacements,
    editDoc,
    handleEditSave,
    handleApplyEditToAll,
    updateSettings,
    clearAllDocs,
    handleExport,
    handleExportPDF,
    cancelPdfExport,
  } = useProjectState();

  const [isMaximized, setIsMaximized] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showDonationDialog, setShowDonationDialog] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    state: "checking",
  });
  const desktopAPI = window.desktopAPI;

  const checkForUpdates = useCallback(async () => {
    if (!desktopAPI) {
      setUpdateStatus({ state: "error" });
      return;
    }

    setUpdateStatus({ state: "checking" });
    try {
      const latestRelease = await desktopAPI.checkUpdates();
      const latestVersion = latestRelease.tag.replace(/^v/, "");
      const currentParts = __APP_VERSION__.split(".").map(Number);
      const latestParts = latestVersion.split(".").map(Number);
      const hasNewerVersion =
        latestParts.length === currentParts.length &&
        latestParts.every(Number.isInteger) &&
        latestParts.some(
          (part, index) =>
            part > currentParts[index] &&
            latestParts
              .slice(0, index)
              .every((previousPart, previousIndex) =>
                previousPart === currentParts[previousIndex],
              ),
        );

      setUpdateStatus({
        state: hasNewerVersion ? "available" : "current",
        tag: latestRelease.tag,
        publishedAt: latestRelease.publishedAt,
        downloadUrl: latestRelease.downloadUrl,
      });
    } catch (error) {
      console.error("Unable to check for updates", error);
      setUpdateStatus({ state: "error" });
    }
  }, [desktopAPI]);

  useEffect(() => {
    if (desktopAPI) void checkForUpdates();
  }, [checkForUpdates, desktopAPI]);

  useEffect(() => {
    if (!desktopAPI) return;

    let active = true;
    const unsubscribe = desktopAPI.onMaximizeChange(setIsMaximized);
    void desktopAPI
      .isMaximized()
      .then((maximized) => {
        if (active) setIsMaximized(maximized);
      })
      .catch((error: unknown) =>
        console.error("Unable to read window state", error),
      );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [desktopAPI]);

  const { pages } = useMemo(
    () => paginate(docs, settings, blankPageCount),
    [blankPageCount, docs, settings],
  );
  const pageCount = pages.length;

  useEffect(() => {
    setActivePageIndex((current) =>
      Math.min(current, Math.max(0, pageCount - 1)),
    );
  }, [pageCount]);

  const handleAddPage = () => {
    setActivePageIndex(pageCount);
    addPage();
  };

  const handleAddPageAfter = (pageIndex: number) => {
    addPageAfter(pageIndex);
    setActivePageIndex(pageIndex + 1);
  };

  const handleDuplicatePage = (pageIndex: number) => {
    duplicatePage(pageIndex);
    setActivePageIndex(pageIndex + 1);
  };

  const handleDeletePage = (pageIndex: number) => {
    deletePage(pageIndex);
    setActivePageIndex((current) =>
      current > pageIndex
        ? current - 1
        : Math.max(0, Math.min(current, pageCount - 2)),
    );
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      switch (event.key.toLowerCase()) {
        case "s":
          event.preventDefault();
          void handleExport();
          break;
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleExport]);

  return (
    <>
      <div className="screen-shell flex h-dvh flex-col overflow-hidden bg-slate-50">
        <header className="app-titlebar sticky top-0 z-30 flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 pl-3 backdrop-blur-lg">
          <div className="flex items-center gap-2">
            <img
              src="./docstitch.svg"
              alt=""
              className="h-5 w-5"
              aria-hidden="true"
            />
            <h1 className="text-sm font-bold tracking-tight text-slate-800">
              Doc<span className="text-teal-600">Stitch</span>
            </h1>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              v{__APP_VERSION__}
            </span>
          </div>
          <div className="flex h-full items-center">
            <button
              type="button"
              aria-label="Donate"
              aria-haspopup="dialog"
              title="Donate"
              className="group mx-2 flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"
              onClick={() => setShowDonationDialog(true)}
            >
              <Heart className="h-3.5 w-3.5 transition-all group-hover:fill-current" aria-hidden="true" />
              Donate
            </button>
            <a
              href="https://github.com/tuhin733/DocStich"
              target="_blank"
              rel="noreferrer"
              aria-label="Open the DocStich project repository on GitHub"
              title="Open project repository"
              className="group flex h-full w-10 items-center justify-center text-slate-500"
              onClick={(event) => {
                if (!desktopAPI) return;
                event.preventDefault();
                void desktopAPI
                  .openRepository()
                  .catch((error: unknown) =>
                    console.error("Unable to open project repository", error),
                  );
              }}
            >
              <Github
                className="h-4 w-4 transition-colors group-hover:text-slate-800"
                aria-hidden="true"
              />
            </a>
            {desktopAPI && (
              <div className="app-window-controls flex h-full">
                <button
                  type="button"
                  aria-label="Minimize window"
                  title="Minimize"
                  onClick={() => void desktopAPI.minimize()}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={isMaximized ? "Restore window" : "Maximize window"}
                  title={isMaximized ? "Restore" : "Maximize"}
                  onClick={() => void desktopAPI.toggleMaximize()}
                >
                  {isMaximized ? (
                    <Copy className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  className="close-control"
                  aria-label="Close window"
                  title="Close"
                  onClick={() => void desktopAPI.close()}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {updateStatus.state === "available" && (
            <div
              className="z-10 flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-teal-200 bg-teal-50 px-4 py-2 text-center text-sm text-teal-900"
              role="status"
              aria-live="polite"
            >
              <span>
                DocStitch {updateStatus.tag} is available.
              </span>
              <a
                href={updateStatus.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-3 py-1 font-semibold text-white transition-colors hover:bg-teal-800"
                onClick={(event) => {
                  if (!desktopAPI) return;
                  event.preventDefault();
                  void desktopAPI.openDownload(updateStatus.downloadUrl).catch(
                    (error: unknown) =>
                      console.error("Unable to open update download", error),
                  );
                }}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download update
              </a>
            </div>
          )}
          <div className="min-h-0 w-full max-w-7xl flex-1 self-center px-3 sm:px-4">
            <div className="grid h-full min-h-0 grid-cols-1 items-stretch gap-4 min-[900px]:grid-cols-[260px_minmax(0,1fr)_240px] lg:grid-cols-[300px_minmax(0,1fr)_260px]">
              <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden py-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 pb-1 block" htmlFor="default-category">
                    Document type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(DOC_CATEGORIES).map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={defaultCategory === category.id}
                        onClick={() => setDefaultCategory(category.id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          defaultCategory === category.id
                            ? "text-white shadow-sm"
                            : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                        }`}
                        style={
                          defaultCategory === category.id
                            ? { background: category.accent }
                            : undefined
                        }
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>

                <UploadZone
                  onFiles={(files) => addFiles(files, activePageIndex)}
                  documentMode={defaultCategory === "document"}
                  error={importError}
                  onError={setImportError}
                />

                {actionError && (
                  <p
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                    role="alert"
                  >
                    {actionError}
                  </p>
                )}

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-700">
                      Documents{" "}
                      <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {docs.length}
                      </span>
                    </h2>
                    {docs.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllDocs}
                        className="text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <DocTray
                    docs={docs}
                    onRemove={removeDoc}
                    onDuplicate={duplicateDoc}
                    onReorder={reorderDoc}
                    onLabelChange={changeLabel}
                    onDocumentSizeChange={changeDocumentSize}
                    onEdit={editDoc}
                  />
                </div>
              </div>

              <div className="relative h-full min-h-0 min-w-0 overflow-hidden">
                <A4Page
                  docs={docs}
                  settings={settings}
                  blankPageCount={blankPageCount}
                  onPlacementChange={changePlacement}
                  arrangeMode={arrangeMode}
                  onAddPage={handleAddPage}
                  onAddPageAfter={handleAddPageAfter}
                  onDuplicatePage={handleDuplicatePage}
                  onDeletePage={handleDeletePage}
                  onMovePage={movePage}
                  activePageIndex={activePageIndex}
                  onPageSelect={setActivePageIndex}
                />
              </div>

              <div className="h-full min-h-0 py-3">
                <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <ControlPanel
                    settings={settings}
                    onChange={updateSettings}
                    documentMode={defaultCategory === "document"}
                    onExport={handleExport}
                    busy={busy}
                    cardCount={docs.length}
                    pageCount={pageCount}
                    arrangeMode={arrangeMode}
                    onArrangeModeChange={setArrangeMode}
                    onResetPlacements={resetPlacements}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
        <footer className="relative z-10 flex h-9 shrink-0 items-center justify-end border-t border-slate-200 bg-white px-3 text-[11px] text-slate-500 shadow-[0_-2px_8px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            aria-label="About DocStitch"
            aria-haspopup="dialog"
            title="About DocStitch"
            className="group flex h-8 w-8 items-center justify-center rounded-md text-slate-500"
            onClick={() => setShowAboutDialog(true)}
          >
            <Info
              className="h-4 w-4 transition-colors group-hover:text-slate-800"
              aria-hidden="true"
            />
          </button>
        </footer>
      </div>

      {showExportToast && (
        <div
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-5 w-5 text-white" />
          Exported Successfully
        </div>
      )}

      {editingDocId && (
        <ImageEditor
          key={editingDocId}
          docs={docs}
          doc={docs.find((doc) => doc.id === editingDocId)!}
          onSave={handleEditSave}
          onSelectDoc={setEditingDocId}
          onApplyToAll={handleApplyEditToAll}
          onClose={() => setEditingDocId(null)}
        />
      )}

      {showPdfExportDialog && (
        <PdfExportDialog
          docs={docs}
          settings={settings}
          blankPageCount={blankPageCount}
          onExport={handleExportPDF}
          onCancel={cancelPdfExport}
        />
      )}

      {showAboutDialog && (
        <AboutDialog
          onClose={() => setShowAboutDialog(false)}
          updateStatus={updateStatus}
          hasDesktopAPI={Boolean(desktopAPI)}
          onCheckUpdates={() => void checkForUpdates()}
          onOpenDownload={(url) => {
            if (!desktopAPI) return;
            void desktopAPI.openDownload(url).catch((error: unknown) =>
              console.error("Unable to open update download", error),
            );
          }}
        />
      )}

      {showDonationDialog && (
        <DonationDialog onClose={() => setShowDonationDialog(false)} />
      )}
    </>
  );
}

export default App;
