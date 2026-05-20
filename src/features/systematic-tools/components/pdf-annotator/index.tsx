import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// pdf.js worker — load from same package version to avoid mismatches.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PdfAnnotatorProps {
  src: string;
}

type Stroke = {
  points: { x: number; y: number }[];
  color: string;
  size: number;
};

type TextItem = { x: number; y: number; value: string; color: string; size: number };

type PageAnnotations = { strokes: Stroke[]; texts: TextItem[] };

/**
 * PDF viewer with per-page drawing/text annotations.
 *
 * Each PDF page renders into its own <Page> element, and we overlay one
 * absolutely-positioned <canvas> per page. Drawings/texts are stored in
 * page coordinates (not screen coordinates), so they scroll and zoom with
 * the page they belong to.
 */
export default function PdfAnnotator({ src }: PdfAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement | null>>(new Map());
  const pageSizeRef = useRef<Map<number, { width: number; height: number }>>(
    new Map()
  );
  const annotationsRef = useRef<Map<number, PageAnnotations>>(new Map());

  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(900);
  const [scale, setScale] = useState(1);
  // Track previous scale so we can rescale stored annotations when zoom changes.
  const previousScaleRef = useRef(1);

  const [drawMode, setDrawMode] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState('#ff5252');
  const [fontSize] = useState(18);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [pendingText, setPendingText] = useState<
    { pageNumber: number; x: number; y: number; value: string } | null
  >(null);

  // Live-drawing state per page.
  const drawingRef = useRef<{ pageNumber: number; last: { x: number; y: number } } | null>(
    null
  );

  // Compute available page width so PDF fits nicely in the viewport.
  useEffect(() => {
    const updateWidth = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const padded = Math.max(320, rect.width - 32);
      setPageWidth(padded);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // When the user zooms, scale all stored annotations by the same ratio so
  // they stay attached to the same logical spot on the page.
  useEffect(() => {
    const ratio = scale / previousScaleRef.current;
    if (ratio !== 1) {
      annotationsRef.current.forEach((annotations) => {
        annotations.strokes.forEach((stroke) => {
          stroke.points = stroke.points.map((point) => ({
            x: point.x * ratio,
            y: point.y * ratio,
          }));
          stroke.size *= ratio;
        });
        annotations.texts.forEach((textItem) => {
          textItem.x *= ratio;
          textItem.y *= ratio;
          textItem.size *= ratio;
        });
      });
    }
    previousScaleRef.current = scale;
  }, [scale]);

  // Resize a single page's canvas to match its rendered size and replay
  // all annotations for that page.
  const syncCanvas = (pageNumber: number) => {
    const canvas = canvasRefs.current.get(pageNumber);
    const size = pageSizeRef.current.get(pageNumber);
    if (!canvas || !size) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    redrawPage(pageNumber);
  };

  const redrawPage = (pageNumber: number) => {
    const canvas = canvasRefs.current.get(pageNumber);
    const size = pageSizeRef.current.get(pageNumber);
    if (!canvas || !size) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
    const annotations = annotationsRef.current.get(pageNumber);
    if (!annotations) return;
    // Strokes
    annotations.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
    // Text
    annotations.texts.forEach((textItem) => {
      ctx.fillStyle = textItem.color;
      ctx.font = `${textItem.size}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(textItem.value, textItem.x, textItem.y);
    });
  };

  const getPageAnnotations = (pageNumber: number): PageAnnotations => {
    let annotations = annotationsRef.current.get(pageNumber);
    if (!annotations) {
      annotations = { strokes: [], texts: [] };
      annotationsRef.current.set(pageNumber, annotations);
    }
    return annotations;
  };

  const getPosOnPage = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (pageNumber: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!drawMode) return;
    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) return;
    const pos = getPosOnPage(e, canvas);
    const annotations = getPageAnnotations(pageNumber);
    annotations.strokes.push({ color: brushColor, size: brushSize, points: [pos] });
    drawingRef.current = { pageNumber, last: pos };
  };

  const moveDraw = (pageNumber: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!drawMode || !drawingRef.current || drawingRef.current.pageNumber !== pageNumber) {
      return;
    }
    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPosOnPage(e, canvas);
    const annotations = getPageAnnotations(pageNumber);
    const currentStroke = annotations.strokes[annotations.strokes.length - 1];
    if (!currentStroke) return;
    currentStroke.points.push(pos);
    ctx.strokeStyle = currentStroke.color;
    ctx.lineWidth = currentStroke.size;
    ctx.beginPath();
    ctx.moveTo(drawingRef.current.last.x, drawingRef.current.last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    drawingRef.current.last = pos;
  };

  const endDraw = () => {
    drawingRef.current = null;
  };

  const handleCanvasClick = (
    pageNumber: number,
    e: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (!textMode) return;
    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) return;
    const pos = getPosOnPage(e, canvas);
    setPendingText({ pageNumber, x: pos.x, y: pos.y, value: '' });
  };

  const commitText = () => {
    if (!pendingText || !pendingText.value.trim()) {
      setPendingText(null);
      return;
    }
    const annotations = getPageAnnotations(pendingText.pageNumber);
    annotations.texts.push({
      x: pendingText.x,
      y: pendingText.y,
      value: pendingText.value,
      color: brushColor,
      size: fontSize,
    });
    redrawPage(pendingText.pageNumber);
    setPendingText(null);
  };

  const clearAll = () => {
    annotationsRef.current.clear();
    canvasRefs.current.forEach((_, pageNumber) => redrawPage(pageNumber));
    setPendingText(null);
  };

  const toolbarBaseStyle: React.CSSProperties = {
    position: 'fixed',
    top: 60,
    left: 12,
    zIndex: 10002,
    display: 'flex',
    gap: 8,
    background: 'rgba(18,18,18,0.78)',
    padding: 8,
    borderRadius: 12,
    backdropFilter: 'blur(6px)',
  };

  const toolButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    cursor: 'pointer',
  };

  const documentOptions = useMemo(
    () => ({
      // Workaround for some hosts that don't send range-request friendly headers.
      disableStream: false,
      disableAutoFetch: false,
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'auto',
        background: '#525659',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        userSelect: 'none',
      }}
    >
      {toolbarVisible ? (
        <div style={toolbarBaseStyle}>
          <button
            onClick={() => {
              setDrawMode((v) => !v);
              if (!drawMode) setTextMode(false);
            }}
            style={{
              ...toolButtonStyle,
              background: drawMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.4)',
            }}
            title="Toggle drawing"
          >
            ✏️ {drawMode ? 'Drawing On' : 'Drawing Off'}
          </button>

          <button
            onClick={() => {
              setTextMode((v) => !v);
              if (!textMode) setDrawMode(false);
            }}
            style={{
              ...toolButtonStyle,
              background: textMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.4)',
            }}
            title="Add text (click to place)"
          >
            T {textMode ? 'Text On' : 'Text Off'}
          </button>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}
            title="Brush size"
          >
            Size
            <input
              type="range"
              min={2}
              max={18}
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}
            title="Brush color"
          >
            Color
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              style={{ width: 36, height: 28, border: 'none', background: 'transparent' }}
            />
          </label>

          <button onClick={clearAll} style={toolButtonStyle} title="Clear all annotations">
            🧽 Clear
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Zoom">
            <button
              onClick={() => setScale((value) => Math.max(0.5, +(value - 0.25).toFixed(2)))}
              style={toolButtonStyle}
              title="Zoom out"
            >
              −
            </button>
            <span style={{ color: '#fff', minWidth: 48, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((value) => Math.min(4, +(value + 0.25).toFixed(2)))}
              style={toolButtonStyle}
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setScale(1)}
              style={toolButtonStyle}
              title="Reset zoom"
            >
              ⤺
            </button>
          </div>

          <button
            onClick={() => setToolbarVisible(false)}
            style={toolButtonStyle}
            title="Hide toolbar"
          >
            Hide
          </button>
        </div>
      ) : (
        <button
          onClick={() => setToolbarVisible(true)}
          style={{
            position: 'fixed',
            top: 60,
            left: 12,
            zIndex: 10002,
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(18,18,18,0.7)',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
          }}
          title="Show toolbar"
        >
          🛠️ Tools
        </button>
      )}

      <Document
        file={src}
        onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
        onLoadError={(error) => {
          // eslint-disable-next-line no-console
          console.error('PDF load failed:', error);
        }}
        options={documentOptions}
        loading={
          <div style={{ color: '#fff', padding: 24 }}>Loading PDF…</div>
        }
        error={
          <div style={{ color: '#fff', padding: 24 }}>
            Failed to load PDF. The file may be restricted or unreachable.
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          return (
            <div
              key={pageNumber}
              style={{
                position: 'relative',
                marginBottom: 16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
              }}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth * scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={(page) => {
                  const viewport = page.getViewport({
                    scale: (pageWidth * scale) / page.view[2],
                  });
                  pageSizeRef.current.set(pageNumber, {
                    width: viewport.width,
                    height: viewport.height,
                  });
                  syncCanvas(pageNumber);
                }}
              />
              <canvas
                ref={(node) => {
                  if (node) canvasRefs.current.set(pageNumber, node);
                  else canvasRefs.current.delete(pageNumber);
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: drawMode || textMode ? 'auto' : 'none',
                  cursor: textMode ? 'text' : drawMode ? 'crosshair' : 'default',
                  touchAction: 'none',
                }}
                onClick={(e) => handleCanvasClick(pageNumber, e)}
                onMouseDown={(e) => startDraw(pageNumber, e)}
                onMouseMove={(e) => moveDraw(pageNumber, e)}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={(e) => startDraw(pageNumber, e)}
                onTouchMove={(e) => moveDraw(pageNumber, e)}
                onTouchEnd={endDraw}
              />
              {pendingText && pendingText.pageNumber === pageNumber && (
                <input
                  autoFocus
                  value={pendingText.value}
                  onChange={(e) =>
                    setPendingText((prev) =>
                      prev ? { ...prev, value: e.target.value } : prev
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitText();
                    if (e.key === 'Escape') setPendingText(null);
                  }}
                  onBlur={commitText}
                  style={{
                    position: 'absolute',
                    left: pendingText.x,
                    top: pendingText.y,
                    fontSize,
                    color: brushColor,
                    border: '1px dashed rgba(0,0,0,0.4)',
                    background: 'rgba(255,255,255,0.9)',
                    padding: '2px 4px',
                    outline: 'none',
                  }}
                />
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
}
