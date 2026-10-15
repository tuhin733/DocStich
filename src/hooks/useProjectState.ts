import { useCallback, useEffect, useRef, useState } from "react";
import type { EditResult } from "../components/ImageEditor";
import { DEFAULT_LAYOUT, DOC_CATEGORIES } from "../constants";
import { savePDF } from "../lib/pdf";
import { clearProject, loadProject, serializeProject } from "../lib/projectStorage";
import type { DocCategoryId, LayoutSettings, UploadedDoc } from "../types";

let idCounter = 0;
const genId = () => `doc-${Date.now()}-${++idCounter}`;

export function useProjectState() {
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULT_LAYOUT);
  const [busy, setBusy] = useState(false);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [defaultCategory, setDefaultCategory] =
    useState<DocCategoryId>("aadhar");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [importError, setImportError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showPdfExportDialog, setShowPdfExportDialog] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);
  const hasHydratedProjectRef = useRef(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const restored = await loadProject();
      if (!active) return;

      if (restored) {
        setSettings(restored.settings);
        setDocs(restored.docs);
      }

      hasHydratedProjectRef.current = true;
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedProjectRef.current) return;
    void serializeProject(docs, settings);
  }, [docs, settings]);

  useEffect(() => {
    if (!showExportToast) return;
    const timeout = window.setTimeout(() => setShowExportToast(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [showExportToast]);

  const addFiles = useCallback(
    async (files: File[]) => {
      setImportError("");
      const results = await Promise.allSettled(
        files.map(
          (file) =>
            new Promise<UploadedDoc>((resolve, reject) => {
              const url = URL.createObjectURL(file);
              const img = new Image();
              img.onload = () => {
                resolve({
                  id: genId(),
                  fileName: file.name,
                  file,
                  url,
                  pxW: img.naturalWidth,
                  pxH: img.naturalHeight,
                  category: defaultCategory,
                  label: DOC_CATEGORIES[defaultCategory].label,
                  fitToPage: true,
                  widthMm: 190,
                  heightMm: 277,
                });
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error(`Could not decode ${file.name}`));
              };
              img.src = url;
            }),
        ),
      );

      const loadedDocs = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      if (loadedDocs.length) {
        setDocs((prev) => [...prev, ...loadedDocs]);
      }

      const failedFiles = results.flatMap((result, index) =>
        result.status === "rejected" ? [files[index].name] : [],
      );

      if (failedFiles.length) {
        setImportError(
          `Could not open ${failedFiles.length === 1 ? "image" : "images"}: ${failedFiles.join(", ")}.`,
        );
      }
    },
    [defaultCategory],
  );

  const removeDoc = useCallback((id: string) => {
    setDocs((prev) => {
      const found = prev.find((doc) => doc.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((doc) => doc.id !== id);
    });
  }, []);

  const duplicateDoc = useCallback((id: string) => {
    setDocs((prev) => {
      const found = prev.find((doc) => doc.id === id);
      if (!found) return prev;

      const newUrl = URL.createObjectURL(found.file);
      return [
        ...prev,
        {
          ...found,
          id: genId(),
          url: newUrl,
          label: `${found.label} (copy)`,
          placement: undefined,
        },
      ];
    });
  }, []);

  const reorderDoc = useCallback((id: string, dir: -1 | 1) => {
    setDocs((prev) => {
      const idx = prev.findIndex((doc) => doc.id === id);
      if (idx === -1) return prev;

      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;

      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const changeLabel = useCallback((id: string, label: string) => {
    setDocs((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, label } : doc)),
    );
  }, []);

  const changeDocumentSize = useCallback(
    (
      id: string,
      patch: Pick<UploadedDoc, "fitToPage" | "widthMm" | "heightMm">,
    ) => {
      setDocs((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)),
      );
    },
    [],
  );

  const changePlacement = useCallback(
    (id: string, placement: NonNullable<UploadedDoc["placement"]>) => {
      setDocs((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, placement } : doc)),
      );
    },
    [],
  );

  const resetPlacements = useCallback(() => {
    setDocs((prev) => prev.map((doc) => ({ ...doc, placement: undefined })));
  }, []);

  const editDoc = useCallback((id: string) => {
    setEditingDocId(id);
  }, []);

  const handleEditSave = useCallback((id: string, result: EditResult) => {
    setDocs((prev) => {
      const found = prev.find((doc) => doc.id === id);
      if (found) URL.revokeObjectURL(found.url);

      return prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              file: result.file,
              url: result.url,
              pxW: result.pxW,
              pxH: result.pxH,
            }
          : doc,
      );
    });
  }, []);

  const handleApplyEditToAll = useCallback(
    (results: { id: string; result: EditResult }[]) => {
      const resultById = new Map(results.map(({ id, result }) => [id, result]));
      setDocs((prev) =>
        prev.map((doc) => {
          const result = resultById.get(doc.id);
          if (!result) return doc;

          URL.revokeObjectURL(doc.url);
          return {
            ...doc,
            file: result.file,
            url: result.url,
            pxW: result.pxW,
            pxH: result.pxH,
          };
        }),
      );
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<LayoutSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearAllDocs = useCallback(() => {
    docs.forEach((doc) => URL.revokeObjectURL(doc.url));
    setDocs([]);
    clearProject();
  }, [docs]);

  const handleExport = useCallback(() => {
    if (docs.length === 0) return;
    setActionError("");
    setShowExportToast(false);
    setShowPdfExportDialog(true);
  }, [docs.length]);

  const handleExportPDF = useCallback(
    async (pdf: Blob) => {
      setShowPdfExportDialog(false);
      if (docs.length === 0) return;

      setBusy(true);
      try {
        const ts = new Date().toISOString().slice(0, 10);
        const saved = await savePDF(pdf, `print-batch-${ts}.pdf`);
        if (saved) setShowExportToast(true);
      } catch (error) {
        console.error(error);
        setActionError(
          `Failed to save PDF: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        setBusy(false);
      }
    },
    [docs],
  );

  const cancelPdfExport = useCallback(() => {
    setShowPdfExportDialog(false);
  }, []);

  return {
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
    setActionError,
    setShowPdfExportDialog,
    setShowExportToast,
    setBusy,
    setSettings,
    setDocs,
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
  };
}
