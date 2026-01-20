
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ImageCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onCrop: (blob: Blob) => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCancel, onCrop }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 });

  const CANVAS_SIZE = 400;

  useEffect(() => {
    const img = new Image();
    
    // Only set crossOrigin if loading from a remote URL to avoid Data URI taint issues
    if (imageSrc.startsWith('http')) {
        img.crossOrigin = 'anonymous';
    }
    
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
      const minDimension = Math.min(img.width, img.height);
      const targetDiameter = 300;
      const fitScale = targetDiameter / minDimension;
      setScale(Math.max(fitScale, 0.5)); 
    };
    img.onerror = (e) => {
        console.error("Failed to load image", e);
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const x = centerX - (drawWidth / 2) + offset.x;
    const y = centerY - (drawHeight / 2) + offset.y;

    ctx.drawImage(image, x, y, drawWidth, drawHeight);

    // Overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.arc(centerX, centerY, 150, 0, Math.PI * 2, true);
    ctx.fill();
    
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
    ctx.stroke();
  }, [image, scale, offset]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const pos = getPointerPos(e);
    setDragStart(pos);
    setOffsetStart({ ...offset });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    
    const pos = getPointerPos(e);
    const rect = containerRef.current.getBoundingClientRect();
    
    // Guard against zero-width container (hidden/unmounted)
    if (rect.width === 0 || rect.height === 0) return;

    const ratioX = CANVAS_SIZE / rect.width;
    const ratioY = CANVAS_SIZE / rect.height;

    const deltaX = (pos.x - dragStart.x) * ratioX;
    const deltaY = (pos.y - dragStart.y) * ratioY;
    
    setOffset({
      x: offsetStart.x + deltaX,
      y: offsetStart.y + deltaY
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleCropAction = () => {
    if (!image) return;
    
    const outputSize = 400;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = outputSize;
    tempCanvas.height = outputSize;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const centerX = outputSize / 2;
    const centerY = outputSize / 2;
    const x = centerX - (drawWidth / 2) + offset.x;
    const y = centerY - (drawHeight / 2) + offset.y;
    
    ctx.drawImage(image, x, y, drawWidth, drawHeight);

    tempCanvas.toBlob((blob) => {
      if (blob) {
          onCrop(blob);
      } else {
          console.error("Canvas export failed");
      }
    }, 'image/jpeg', 0.90);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-4 animate-fade-in touch-none">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-900">Adjust Photo</h3>
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
            </button>
        </div>

        <div 
             ref={containerRef}
             className="relative bg-slate-900 overflow-hidden cursor-move touch-none flex items-center justify-center w-full aspect-square"
             onMouseDown={handleStart}
             onMouseMove={handleMove}
             onMouseUp={handleEnd}
             onMouseLeave={handleEnd}
             onTouchStart={handleStart}
             onTouchMove={handleMove}
             onTouchEnd={handleEnd}
        >
             <canvas 
                ref={canvasRef} 
                width={CANVAS_SIZE} 
                height={CANVAS_SIZE} 
                className="w-full h-full pointer-events-none block object-contain"
             />
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold pointer-events-none flex items-center gap-1 select-none">
                <Move size={12} /> Drag to Reposition
             </div>
        </div>

        <div className="p-6 space-y-6 shrink-0 bg-white">
            <div className="flex items-center gap-4">
                <ZoomOut size={20} className="text-slate-400" />
                <input 
                    type="range" 
                    min="0.2" 
                    max="3" 
                    step="0.05"
                    value={scale} 
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <ZoomIn size={20} className="text-slate-400" />
            </div>

            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                    Cancel
                </button>
                <button onClick={handleCropAction} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-colors flex items-center justify-center gap-2">
                    <Check size={18} /> Apply Photo
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
