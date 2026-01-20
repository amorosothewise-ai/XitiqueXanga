
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
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Load Image
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
      // Fit image to initial view
      const canvas = canvasRef.current;
      if (canvas) {
          const minScale = Math.max(canvas.width / img.width, canvas.height / img.height);
          setScale(minScale);
      }
    };
  }, [imageSrc]);

  // Draw Loop
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background fill
    ctx.fillStyle = '#1e293b'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    
    // Center logic + offset
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const x = centerX - (drawWidth / 2) + offset.x;
    const y = centerY - (drawHeight / 2) + offset.y;

    ctx.drawImage(image, x, y, drawWidth, drawHeight);

    // Draw Overlay (Circular Mask)
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset composite for next frame if needed (though we clear)
    ctx.globalCompositeOperation = 'source-over';

  }, [image, scale, offset]);

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setStartPan({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setOffset({
      x: clientX - startPan.x,
      y: clientY - startPan.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    if (!canvasRef.current || !image) return;
    
    // 1. Create a temporary high-res canvas for the final output
    const outputSize = 400; // Final avatar size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = outputSize;
    tempCanvas.height = outputSize;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // 2. Calculate the exact portion of the source image visible in the circle
    // The canvas is 400x400 (displayed size). The circle radius is 150 (300px dia).
    // This mapping can be tricky, so we use the draw approach on the new canvas 
    // mimicking the view relative to the center.
    
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    
    // Center of original canvas relative to image top-left
    const canvasCenterX = 400 / 2; // matches width={400} below
    const canvasCenterY = 400 / 2;
    
    // We want to draw the image onto the output canvas such that the center matches
    const outputCenterX = outputSize / 2;
    const outputCenterY = outputSize / 2;
    
    // Scaling factor between display canvas (400px wide) and output canvas (400px wide) is 1.
    // However, the circle on screen is 300px dia inside a 400px box.
    // We want the output to be the content of that circle.
    // So we need to scale up slightly if we want the circle to fill the square, 
    // or just crop the square containing the circle. Let's crop the square containing the circle.
    
    const offsetX = (canvasCenterX - (drawWidth / 2) + offset.x);
    const offsetY = (canvasCenterY - (drawHeight / 2) + offset.y);
    
    // Draw image at current scale/offset
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    // 3. Export
    tempCanvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/95 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-md">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Adjust Photo</h3>
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
            </button>
        </div>

        {/* Canvas Area */}
        <div className="relative bg-slate-100 overflow-hidden cursor-move touch-none flex items-center justify-center"
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onTouchStart={handleMouseDown}
             onTouchMove={handleMouseMove}
             onTouchEnd={handleMouseUp}
        >
             <canvas 
                ref={canvasRef} 
                width={400} 
                height={400} 
                className="max-w-full h-auto pointer-events-none" // Events handled by parent div
             />
             
             {/* Visual Guide (Overlay Ring outside canvas drawing for better UX) */}
             <div className="absolute inset-0 pointer-events-none border-[50px] border-slate-900/50 rounded-full" 
                  style={{
                      boxShadow: '0 0 0 100px rgba(15, 23, 42, 0.5)' // Extend dark area
                  }}
             ></div>
             
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold pointer-events-none flex items-center gap-1">
                <Move size={12} /> Drag to Reposition
             </div>
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <ZoomOut size={20} className="text-slate-400" />
                <input 
                    type="range" 
                    min="0.1" 
                    max="3" 
                    step="0.05"
                    value={scale} 
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <ZoomIn size={20} className="text-slate-400" />
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={onCancel}
                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleCrop}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-colors flex items-center justify-center gap-2"
                >
                    <Check size={18} /> Apply Photo
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
