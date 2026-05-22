// client/src/components/AvatarCropper.jsx
// Full avatar upload with drag-to-reposition and zoom.
// Uses only canvas — no extra npm package needed.
// Outputs a base64 PNG string via onCrop(base64).

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, ZoomIn, ZoomOut, RotateCcw, Check } from "lucide-react";

export default function AvatarCropper({ onCrop, onCancel, initialImage = null }) {
  const canvasRef  = useRef(null);
  const fileRef    = useRef(null);
  const [img,      setImg]      = useState(null);    // HTMLImageElement
  const [imgSrc,   setImgSrc]   = useState(initialImage);
  const [zoom,     setZoom]     = useState(1);
  const [offset,   setOffset]   = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart,setDragStart]= useState({ x: 0, y: 0 });
  const SIZE = 260; // canvas size (square)

  // Load image from src
  useEffect(() => {
    if (!imgSrc) return;
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = imgSrc;
  }, [imgSrc]);

  // Draw every time img/zoom/offset changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const scaledW = img.width  * zoom;
    const scaledH = img.height * zoom;
    const x = (SIZE - scaledW) / 2 + offset.x;
    const y = (SIZE - scaledH) / 2 + offset.y;
    ctx.drawImage(img, x, y, scaledW, scaledH);
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "#e06c3a";
    ctx.lineWidth   = 2;
    ctx.stroke();
  }, [img, zoom, offset]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImgSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);
  const handleMouseUp = () => setDragging(false);

  // Touch support
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };
  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(4, z - e.deltaY * 0.001)));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Export at 200×200 for storage efficiency
    const out = document.createElement("canvas");
    out.width = out.height = 200;
    const ctx = out.getContext("2d");
    ctx.drawImage(canvas, 0, 0, SIZE, SIZE, 0, 0, 200, 200);
    onCrop(out.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div style={s.wrap}>
      {!img ? (
        // ── Upload prompt ──────────────────────────────────────────────────
        <div style={s.uploadZone} onClick={() => fileRef.current?.click()}>
          <div style={s.emptyCircle}>
            <Upload size={28} color="#555" />
            <p style={s.uploadHint}>Click to upload</p>
            <p style={s.uploadSub}>JPG, PNG, GIF</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        </div>
      ) : (
        // ── Crop view ──────────────────────────────────────────────────────
        <div style={s.cropWrap}>
          <p style={s.cropHint}>Drag to reposition · scroll to zoom</p>

          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            style={{ ...s.canvas, cursor: dragging ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
          />

          {/* Zoom slider */}
          <div style={s.zoomRow}>
            <button style={s.zBtn} onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}><ZoomOut size={14}/></button>
            <input type="range" min="0.5" max="4" step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={s.slider}
            />
            <button style={s.zBtn} onClick={() => setZoom((z) => Math.min(4, z + 0.1))}><ZoomIn size={14}/></button>
          </div>

          {/* Action buttons */}
          <div style={s.actions}>
            <button style={s.resetBtn} onClick={() => { setImg(null); setImgSrc(null); }} title="Choose different image">
              <RotateCcw size={13} style={{ marginRight: 5 }} />Change
            </button>
            <button style={s.changeBtn} onClick={() => fileRef.current?.click()} title="Upload new image">
              <Upload size={13} style={{ marginRight: 5 }} />Upload
            </button>
            <button style={s.saveBtn} onClick={handleSave}>
              <Check size={13} style={{ marginRight: 5 }} />Use this photo
            </button>
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:       { display: "flex", flexDirection: "column", alignItems: "center", gap: 14 },
  uploadZone: { cursor: "pointer" },
  emptyCircle:{
    width: 120, height: 120, borderRadius: "50%",
    background: "#0d0d20", border: "2px dashed #2d2d4e",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  uploadHint: { margin: 0, fontSize: 11, color: "#888", fontWeight: 500 },
  uploadSub:  { margin: 0, fontSize: 10, color: "#444" },
  cropWrap:   { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  cropHint:   { margin: 0, fontSize: 10, color: "#555" },
  canvas:     { borderRadius: "50%", display: "block", userSelect: "none" },
  zoomRow:    { display: "flex", alignItems: "center", gap: 8, width: 260 },
  zBtn:       { background: "none", border: "1px solid #2d2d4e", borderRadius: 5, padding: "4px 7px", cursor: "pointer", color: "#888", display: "flex" },
  slider:     { flex: 1, accentColor: "#e06c3a", cursor: "pointer" },
  actions:    { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  resetBtn:   { display: "flex", alignItems: "center", background: "none", border: "1px solid #2d2d4e", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#888", cursor: "pointer" },
  changeBtn:  { display: "flex", alignItems: "center", background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#89b4fa", cursor: "pointer" },
  saveBtn:    { display: "flex", alignItems: "center", background: "#e06c3a", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, color: "#fff", fontWeight: 600, cursor: "pointer" },
};