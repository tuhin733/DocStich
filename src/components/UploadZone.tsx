import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, ImagePlus } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  documentMode: boolean;
  error?: string;
  onError: (message: string) => void;
}

export default function UploadZone({
  onFiles,
  documentMode,
  error,
  onError,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        inputRef.current?.click();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const openFilePicker = () => inputRef.current?.click();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const selectedFiles = Array.from(e.dataTransfer.files);
      const files = selectedFiles.filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length) onFiles(files);
      if (files.length !== selectedFiles.length) {
        onError("Only image files can be added.");
      }
    },
    [onError, onFiles],
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length) onFiles(files);
      if (files.length !== (e.target.files?.length ?? 0)) {
        onError("Only image files can be added.");
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [onError, onFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragOver(false);
        }
      }}
      onDrop={handleDrop}
      onClick={openFilePicker}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openFilePicker();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Add image files"
      aria-describedby={error ? "upload-error" : undefined}
      className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
        dragOver
          ? "border-teal-500 bg-teal-50 scale-[1.01]"
          : "border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleSelect}
        onClick={(event) => event.stopPropagation()}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            dragOver
              ? "bg-teal-500 text-white"
              : "bg-white text-teal-600 shadow-sm group-hover:bg-teal-100"
          }`}
        >
          <UploadCloud className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            Drag & drop {documentMode ? "document" : "card"} images here
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            or click to browse — PNG, JPG, WEBP · Ctrl+O
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          <ImagePlus className="h-3.5 w-3.5" />
          {documentMode ? "One image per A4 page" : "Add front & back sides"}
        </div>
      </div>
      {error && (
        <p id="upload-error" className="mt-3 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
