"use client";

import { useRef, useState, type PointerEvent } from "react";

export default function SignaturePad({ onChange, disabled = false }: { onChange: (signature: string) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    const position = point(event);
    const context = canvas?.getContext("2d");
    if (!canvas || !position || !context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawing.current = true;
    context.beginPath();
    context.moveTo(position.x, position.y);
    context.lineWidth = 5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#174d43";
    context.lineTo(position.x + 0.1, position.y + 0.1);
    context.stroke();
    setHasSignature(true);
  }

  function continueDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const position = point(event);
    const context = canvas?.getContext("2d");
    if (!canvas || !position || !context) return;
    context.lineTo(position.x, position.y);
    context.stroke();
  }

  function finishDrawing() {
    const canvas = canvasRef.current;
    if (!isDrawing.current || !canvas) return;
    isDrawing.current = false;
    onChange(canvas.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange("");
  }

  return (
    <div className="signature-pad-wrap">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        width={1200}
        height={280}
        aria-label="Draw your electronic signature"
        aria-disabled={disabled}
        onPointerDown={startDrawing}
        onPointerMove={continueDrawing}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
        onPointerLeave={finishDrawing}
      />
      <div className="signature-pad-footer">
        <span>{hasSignature ? "Signature captured" : "Signature required"}</span>
        <button type="button" onClick={clearSignature} disabled={!hasSignature || disabled}>Clear signature</button>
      </div>
    </div>
  );
}