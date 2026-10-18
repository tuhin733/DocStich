import { useEffect } from "react";
import { Download, X } from "lucide-react";
import type { UpdateStatus } from "../types";

interface Props {
  onClose: () => void;
  hasDesktopAPI: boolean;
  updateStatus: UpdateStatus;
  onCheckUpdates: () => void;
  onOpenDownload: (url: string) => void;
}

export default function AboutDialog({
  onClose,
  hasDesktopAPI,
  updateStatus,
  onCheckUpdates,
  onOpenDownload,
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
        aria-labelledby="about-title"
        aria-describedby="about-description"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-900/10"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close about dialog"
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src="./docstitch.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto mb-3 h-10 w-10"
        />
        <h2
          id="about-title"
          className="text-lg font-bold tracking-tight text-slate-800"
        >
          Doc<span className="text-teal-600">Stitch</span>
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-400">
          Version {__APP_VERSION__}
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
          <p
            role="status"
            aria-live="polite"
            className="text-xs leading-relaxed text-slate-600"
          >
            {updateStatus.state === "checking" &&
              (hasDesktopAPI
                ? "Checking for updates…"
                : "Version " + __APP_VERSION__)}
            {updateStatus.state === "available" &&
              `Update available: ${updateStatus.tag} · released ${new Date(updateStatus.publishedAt).toLocaleDateString()}`}
            {updateStatus.state === "current" &&
              `Up to date · latest ${updateStatus.tag} released ${new Date(updateStatus.publishedAt).toLocaleDateString()}`}
            {updateStatus.state === "error" && "Couldn't check for updates"}
          </p>
          {hasDesktopAPI && (
            <button
              type="button"
              onClick={onCheckUpdates}
              disabled={updateStatus.state === "checking"}
              className="mt-2 rounded-md px-2 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-800 disabled:cursor-wait disabled:opacity-60"
            >
              {updateStatus.state === "checking"
                ? "Checking…"
                : "Check for updates"}
            </button>
          )}
          {updateStatus.state === "available" && (
            <a
              href={updateStatus.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="mx-auto mt-2 inline-flex items-center gap-1 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800"
              onClick={(event) => {
                if (!hasDesktopAPI) return;
                event.preventDefault();
                onOpenDownload(updateStatus.downloadUrl);
              }}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download update
            </a>
          )}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
          <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="text-sm font-bold text-slate-800">
              About DocStich
            </h3>
            <p
              id="about-description"
              className="mt-2 text-sm leading-relaxed text-slate-600"
            >
              DocStich is a Windows application designed to simplify document
              image arrangement and printing. It helps online service center
              operators combine the front and back sides of documents, such as
              Aadhaar cards and voter IDs, onto a single A4 page.
              Built to solve everyday problems faced by shopkeepers, DocStich
              makes preparing documents for government portal uploads and
              customer photocopies faster, easier, and more convenient.
            </p>
          </section>
          <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="text-sm font-bold text-slate-800">About Me</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              I&apos;m Naim Sarkar, a 22-year-old Web and Android Developer
              passionate about creating modern, user-friendly applications. I
              enjoy building practical software solutions, designing clean
              interfaces, and exploring new technologies. My goal is to develop
              useful applications that simplify everyday tasks and deliver a
              smooth user experience.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
