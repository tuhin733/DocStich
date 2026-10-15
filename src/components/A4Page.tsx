import { useEffect, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import type { LayoutSettings, UploadedDoc } from "../types";
import { A4 } from "../types";
import { paginate } from "../lib/pagination";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

interface Props {
  docs: UploadedDoc[];
  settings: LayoutSettings;
  onPlacementChange: (
    id: string,
    placement: NonNullable<UploadedDoc["placement"]>,
  ) => void;
  arrangeMode: boolean;
}

type Placement = NonNullable<UploadedDoc["placement"]>;

const MIN_SCALE = 0.9;
const MAX_SCALE = 2.4;
const PREVIEW_HORIZONTAL_PADDING = 16;

type Interaction = {
  id: string;
  pointerId: number;
  kind: "move" | "resize";
  pointerX: number;
  pointerY: number;
  placement: Placement;
};

export default function A4Page({
  docs,
  settings,
  onPlacementChange,
  arrangeMode,
}: Props) {
  const { pages } = paginate(docs, settings);
  const [pageIdx, setPageIdx] = useState(0);
  const [scale, setScale] = useState(1.8);
  const [maxScale, setMaxScale] = useState(MAX_SCALE);
  const interaction = useRef<Interaction | null>(null);
  const previewViewport = useRef<HTMLDivElement>(null);

  const activePageIdx = Math.min(pageIdx, Math.max(0, pages.length - 1));
  const currentPage = pages[activePageIdx] ?? [];
  const hasPages = pages.length > 0;

  const sheetW = A4.w * scale;
  const sheetH = A4.h * scale;

  useEffect(() => {
    const viewport = previewViewport.current;
    if (!viewport) return;

    const updateMaxScale = () => {
      const widthLimit =
        (viewport.clientWidth - PREVIEW_HORIZONTAL_PADDING) / A4.w;
      const nextMaxScale = Math.max(0.1, Math.min(MAX_SCALE, widthLimit));
      setMaxScale(nextMaxScale);
      setScale((currentScale) => Math.min(currentScale, nextMaxScale));
    };

    const observer = new ResizeObserver(updateMaxScale);
    observer.observe(viewport);
    updateMaxScale();

    return () => observer.disconnect();
  }, []);

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey || event.deltaY === 0) return;

    event.preventDefault();
    setScale((currentScale) =>
      Math.max(
        Math.min(MIN_SCALE, maxScale),
        Math.min(maxScale, currentScale * Math.exp(-event.deltaY * 0.001)),
      ),
    );
  };

  const beginInteraction = (
    event: PointerEvent<HTMLElement>,
    placed: (typeof currentPage)[number],
    kind: Interaction["kind"],
  ) => {
    if (!arrangeMode) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current = {
      id: placed.doc.id,
      pointerId: event.pointerId,
      kind,
      pointerX: event.clientX,
      pointerY: event.clientY,
      placement: { x: placed.x, y: placed.y, w: placed.w, h: placed.h },
    };
  };

  const updateInteraction = (event: PointerEvent<HTMLElement>) => {
    const active = interaction.current;
    if (!active || active.pointerId !== event.pointerId) return;

    const deltaX = (event.clientX - active.pointerX) / scale;
    const deltaY = (event.clientY - active.pointerY) / scale;
    let placement = active.placement;

    if (active.kind === "move") {
      placement = {
        ...placement,
        x: Math.max(0, Math.min(A4.w - placement.w, placement.x + deltaX)),
        y: Math.max(0, Math.min(A4.h - placement.h, placement.y + deltaY)),
      };
    } else {
      const aspect = placement.w / placement.h;
      const maxWidth = Math.min(
        A4.w - placement.x,
        (A4.h - placement.y) * aspect,
      );
      const width = Math.max(
        Math.min(5, maxWidth),
        Math.min(maxWidth, placement.w + Math.max(deltaX, deltaY * aspect)),
      );
      placement = { ...placement, w: width, h: width / aspect };
    }

    onPlacementChange(active.id, placement);
  };

  const endInteraction = (event: PointerEvent<HTMLElement>) => {
    if (interaction.current?.pointerId !== event.pointerId) return;
    interaction.current = null;
  };

  const resizeByKeyboard = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    placed: (typeof currentPage)[number],
  ) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const aspect = placed.w / placed.h;
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const maxWidth = Math.min(
      A4.w - placed.x,
      (A4.h - placed.y) * aspect,
    );
    const width = Math.max(
      Math.min(5, maxWidth),
      Math.min(maxWidth, placed.w + direction),
    );
    onPlacementChange(placed.doc.id, {
      ...placed,
      w: width,
      h: width / aspect,
    });
  };

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col items-center">
      <div className="relative z-10 mb-2 flex w-full shrink-0 flex-wrap items-center justify-center gap-2">
        {pages.length > 1 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
              disabled={activePageIdx === 0}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-600">
              Page {activePageIdx + 1} of {pages.length}
            </span>
            <button
              onClick={() => setPageIdx((p) => Math.min(pages.length - 1, p + 1))}
              disabled={activePageIdx >= pages.length - 1}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {/* A4 sheet */}
      <div
        ref={previewViewport}
        className="scrollbar-hidden absolute inset-x-0 -top-[52px] -bottom-3 min-h-0 w-full min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain scroll-smooth pt-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
        role="region"
        aria-label="Scrollable A4 preview"
        tabIndex={0}
        onWheel={handlePreviewWheel}
      >
        <div className="flex w-max min-w-full justify-center p-2">
          {hasPages ? (
            <div
              className="relative shrink-0 bg-white shadow-xl ring-1 ring-slate-200"
              style={{ width: sheetW, height: sheetH }}
            >
              {/* Sheet shadow / paper texture */}
              <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50/30" />

              {/* Placed cards */}
              {currentPage.map((p, i) => (
                <div
                  key={`${p.doc.id}-${i}`}
                  className={`absolute overflow-hidden rounded-sm ${
                    arrangeMode
                      ? "touch-none cursor-move ring-1 ring-teal-500/70"
                      : ""
                  }`}
                  style={{
                    left: p.x * scale,
                    top: p.y * scale,
                    width: p.w * scale,
                    height: p.h * scale,
                  }}
                  onPointerDown={(event) =>
                    beginInteraction(event, p, "move")
                  }
                  onPointerMove={updateInteraction}
                  onPointerUp={endInteraction}
                  onPointerCancel={endInteraction}
                >
                  <img
                    src={p.doc.url}
                    alt={p.doc.label}
                    className="h-full w-full object-fill"
                    draggable={false}
                  />
                  {arrangeMode && (
                    <button
                      type="button"
                      aria-label={`Resize ${p.doc.label}`}
                      title="Drag to resize"
                      className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-nwse-resize rounded-tl-md border-l border-t border-white bg-teal-600 shadow"
                      onPointerDown={(event) =>
                        beginInteraction(event, p, "resize")
                      }
                      onKeyDown={(event) => resizeByKeyboard(event, p)}
                    />
                  )}
                </div>
              ))}

              {/* Page number badge */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-slate-100/80 px-2 py-0.5 text-[10px] font-medium text-slate-400 backdrop-blur">
                <FileText className="h-3 w-3" />
                A4 · {activePageIdx + 1}
              </div>
            </div>
          ) : (
            <div
              className="flex shrink-0 flex-col items-center justify-center bg-white shadow-xl ring-1 ring-slate-200"
              style={{ width: sheetW, height: sheetH }}
            />
          )}
        </div>
      </div>

    </div>
  );
}
