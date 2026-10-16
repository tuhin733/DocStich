import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Minus, Square, Copy, X } from "lucide-react";
import { DOC_CATEGORIES } from "./constants";
import { paginate } from "./lib/pagination";
import { useProjectState } from "./hooks/useProjectState";
import UploadZone from "./components/UploadZone";
import DocTray from "./components/DocTray";
import A4Page from "./components/A4Page";
import ControlPanel from "./components/ControlPanel";
import ImageEditor from "./components/ImageEditor";
import PdfExportDialog from "./components/PdfExportDialog";

function App() {
  const {
    docs,
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
  const [updateStatus, setUpdateStatus] = useState<
    | { state: "checking" }
    | { state: "available"; tag: string; publishedAt: string }
    | { state: "current"; tag: string; publishedAt: string }
    | { state: "error" }
  >({ state: "checking" });
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

  const { pages } = useMemo(() => paginate(docs, settings), [docs, settings]);
  const pageCount = pages.length;

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
        </header>

        <main className="relative z-0 min-h-0 flex-1 overflow-visible">
          <div className="mx-auto h-full max-w-7xl px-3 py-3 sm:px-4">
            <div className="grid h-full min-h-0 grid-cols-1 items-start gap-4 min-[900px]:grid-cols-[260px_minmax(0,1fr)_240px] lg:grid-cols-[300px_minmax(0,1fr)_260px]">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                    Default document type
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
                  onFiles={addFiles}
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

                <div>
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

              <div className="relative h-full min-h-0 min-w-0 overflow-visible">
                <A4Page
                  docs={docs}
                  settings={settings}
                  onPlacementChange={changePlacement}
                  arrangeMode={arrangeMode}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
        </main>
        <footer className="flex min-h-8 shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 text-[11px] text-slate-500">
          <span role="status" aria-live="polite">
            {updateStatus.state === "checking" &&
              (desktopAPI ? "Checking for updates…" : "Version " + __APP_VERSION__)}
            {updateStatus.state === "available" &&
              `Update available: ${updateStatus.tag} · released ${new Date(updateStatus.publishedAt).toLocaleDateString()}`}
            {updateStatus.state === "current" &&
              `Up to date · latest ${updateStatus.tag} released ${new Date(updateStatus.publishedAt).toLocaleDateString()}`}
            {updateStatus.state === "error" && "Couldn't check for updates"}
          </span>
          {desktopAPI && (
            <button
              type="button"
              onClick={() => void checkForUpdates()}
              disabled={updateStatus.state === "checking"}
              className="shrink-0 font-semibold text-teal-700 hover:text-teal-800 disabled:cursor-wait disabled:opacity-60"
            >
              {updateStatus.state === "checking" ? "Checking…" : "Check for updates"}
            </button>
          )}
        </footer>
      </div>

      {showExportToast && (
        <div
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-5 w-5 text-white" />
          Export done
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
          onExport={handleExportPDF}
          onCancel={cancelPdfExport}
        />
      )}
    </>
  );
}

export default App;
