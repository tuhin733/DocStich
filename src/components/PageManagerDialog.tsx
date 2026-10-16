import { useEffect } from "react";
import { FileText, Trash2 } from "lucide-react";

interface Props {
  pageDocumentCounts: number[];
  onDeletePage: (pageIndex: number) => void;
  onClose: () => void;
}

export default function PageManagerDialog({
  pageDocumentCounts,
  onDeletePage,
  onClose,
}: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-manager-title"
        aria-describedby="page-manager-description"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
      >
        <header className="border-b border-slate-100 px-5 py-4">
          <h2
            id="page-manager-title"
            className="text-base font-bold text-slate-800"
          >
            Manage pages
          </h2>
          <p
            id="page-manager-description"
            className="mt-1 text-xs leading-relaxed text-slate-500"
          >
            Deleting a page also removes all documents on it.
          </p>
        </header>

        {pageDocumentCounts.length > 0 ? (
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto px-5">
            {pageDocumentCounts.map((documentCount, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">
                      Page {index + 1}
                    </p>
                    <p className="text-xs text-slate-500">
                      {documentCount === 0
                        ? "Blank page"
                        : `${documentCount} ${documentCount === 1 ? "document" : "documents"}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeletePage(index)}
                  aria-label={`Delete page ${index + 1}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            There are no pages to delete.
          </p>
        )}

        <footer className="flex justify-end border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
