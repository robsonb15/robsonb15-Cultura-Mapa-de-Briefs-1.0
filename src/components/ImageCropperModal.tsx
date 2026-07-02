import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageCropperModalProps {
  imageSrc: string;
  onConfirm: (croppedImageUrl: string) => void;
  onCancel: () => void;
  aspectRatio?: number; // width / height, defaults to 3/1 for banner
}

export default function ImageCropperModal({
  imageSrc,
  onConfirm,
  onCancel,
  aspectRatio = 3 / 1
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const baseDimensionsRef = useRef({ width: 0, height: 0 });

  // Reset states when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setImgLoaded(false);
  }, [imageSrc]);

  // Robust initialization using requestAnimationFrame polling to bypass mount animations and image-caching race conditions
  useEffect(() => {
    let active = true;
    let frameId: number;

    const checkAndInit = () => {
      if (!active) return;
      
      const container = containerRef.current;
      const img = imageRef.current;

      if (container && img && img.complete && img.naturalWidth > 0) {
        const containerWidth = container.clientWidth;
        if (containerWidth > 0) {
          const containerHeight = containerWidth / aspectRatio;
          const imgWidth = img.naturalWidth;
          const imgHeight = img.naturalHeight;

          const containerRatio = containerWidth / containerHeight;
          const imgRatio = imgWidth / imgHeight;

          let baseWidth = 0;
          let baseHeight = 0;

          if (imgRatio > containerRatio) {
            baseHeight = containerHeight;
            baseWidth = containerHeight * imgRatio;
          } else {
            baseWidth = containerWidth;
            baseHeight = containerWidth / imgRatio;
          }

          baseDimensionsRef.current = { width: baseWidth, height: baseHeight };
          
          setPosition(prev => {
            if (prev.x === 0 && prev.y === 0) {
              return {
                x: (containerWidth - baseWidth) / 2,
                y: (containerHeight - baseHeight) / 2
              };
            }
            return prev;
          });
          
          setImgLoaded(true);
          return; // Done initializing
        }
      }

      frameId = requestAnimationFrame(checkAndInit);
    };

    checkAndInit();

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [imageSrc, aspectRatio]);

  const handleImageLoad = () => {
    // Left as fallback, though the useEffect handles the main loading flow perfectly
  };

  // Keep image within boundaries whenever position or zoom changes
  const clampPosition = (x: number, y: number, currentZoom: number) => {
    if (!containerRef.current) return { x, y };

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerWidth / aspectRatio;

    const w = baseDimensionsRef.current.width * currentZoom;
    const h = baseDimensionsRef.current.height * currentZoom;

    let clampedX = x;
    let clampedY = y;

    // Horizontally clamp
    if (w >= containerWidth) {
      const minX = containerWidth - w;
      const maxX = 0;
      clampedX = Math.max(minX, Math.min(maxX, x));
    } else {
      clampedX = (containerWidth - w) / 2;
    }

    // Vertically clamp
    if (h >= containerHeight) {
      const minY = containerHeight - h;
      const maxY = 0;
      clampedY = Math.max(minY, Math.min(maxY, y));
    } else {
      clampedY = (containerHeight - h) / 2;
    }

    return { x: clampedX, y: clampedY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    const clamped = clampPosition(newX, newY, zoom);
    setPosition(clamped);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newX = e.touches[0].clientX - dragStartRef.current.x;
    const newY = e.touches[0].clientY - dragStartRef.current.y;
    
    const clamped = clampPosition(newX, newY, zoom);
    setPosition(clamped);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    // After zoom, clamp position to make sure image still fills container
    setPosition(prev => clampPosition(prev.x, prev.y, newZoom));
  };

  const handleConfirm = async () => {
    if (!imageRef.current || !containerRef.current) return;
    setIsProcessing(true);

    try {
      // Define a high resolution output canvas size
      const outputWidth = 1200;
      const outputHeight = outputWidth / aspectRatio;

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      // Calculate scale factor between the visual crop container and high res output
      const containerWidth = containerRef.current.clientWidth;
      const S = outputWidth / containerWidth;

      const visualImageWidth = baseDimensionsRef.current.width * zoom;
      const visualImageHeight = baseDimensionsRef.current.height * zoom;

      // Draw onto canvas using high res equivalents
      ctx.drawImage(
        imageRef.current,
        position.x * S,
        position.y * S,
        visualImageWidth * S,
        visualImageHeight * S
      );

      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      onConfirm(croppedBase64);
    } catch (err) {
      console.error('Error cropping image:', err);
      alert('Ocorreu um erro ao cortar a imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-stone-900/80 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-4xl relative z-10 flex flex-col overflow-hidden border border-stone-100"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h3 className="text-xl md:text-2xl font-black text-stone-900 uppercase tracking-tighter">
              Ajustar Imagem de Capa
            </h3>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">
              Ajuste para cima, baixo, lados e zoom para encaixar o banner
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-400 hover:text-stone-900 shadow-md border border-stone-100 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Cropper Box */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-stone-950 border border-stone-800 shadow-inner select-none">
            <div
              ref={containerRef}
              className="relative w-full cursor-move"
              style={{ aspectRatio: `${aspectRatio}` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Original"
                onLoad={handleImageLoad}
                className="absolute origin-top-left pointer-events-none max-w-none"
                style={{
                  width: `${baseDimensionsRef.current.width * zoom}px`,
                  height: `${baseDimensionsRef.current.height * zoom}px`,
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  opacity: imgLoaded ? 1 : 0,
                  transition: 'opacity 0.2s ease-in-out'
                }}
              />

              {/* Grid Overlays */}
              <div className="absolute inset-0 pointer-events-none border-2 border-[#0070BA] rounded-2xl" />
              
              {/* Center Guidance Hint */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="text-white/20 p-2 rounded-full border border-white/10 bg-black/20">
                  <Move size={24} />
                </div>
              </div>

              {!imgLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 bg-stone-900">
                  <Loader2 className="animate-spin text-[#0070BA] mb-2" size={32} />
                  <span className="text-xs font-bold uppercase tracking-widest">Carregando Imagem...</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ZoomOut size={16} className="text-stone-400" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-[#0070BA]"
              />
              <ZoomIn size={16} className="text-stone-400" />
              <span className="text-xs font-mono font-black text-[#0070BA] w-12 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex justify-center">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider text-center">
                Dica: Você pode arrastar a imagem em qualquer direção diretamente dentro da moldura acima.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 bg-stone-50/50 border-t border-stone-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imgLoaded || isProcessing}
            className="px-8 py-3.5 bg-[#0070BA] hover:bg-[#0070BA]/90 text-white rounded-xl font-black uppercase text-[11px] tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Processando...
              </>
            ) : (
              'Confirmar Enquadramento'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
