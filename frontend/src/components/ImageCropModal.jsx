import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, X, Sparkles, RefreshCw } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

/**
 * Creates an Image element from a source URL
 */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Converts degree to radian
 */
function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the cropped image base64 data URL
 */
export async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context available');
  }

  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of rotated image
  const { width: bBoxWidth, height: bBoxHeight } = {
    width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
    height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
  };

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas center to image center and rotate
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Create cropped canvas
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('No cropped 2d context available');
  }

  // Target dimension (max 600x600 for fast high-accuracy AI facial recognition)
  const targetSize = Math.min(600, Math.max(pixelCrop.width, pixelCrop.height));
  const scale = targetSize / Math.max(pixelCrop.width, pixelCrop.height);

  croppedCanvas.width = Math.round(pixelCrop.width * scale);
  croppedCanvas.height = Math.round(pixelCrop.height * scale);

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height
  );

  return croppedCanvas.toDataURL('image/jpeg', 0.92);
}

/**
 * ImageCropModal
 * A versatile, interactive image crop modal optimized for biometric face portraits.
 */
export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  title = 'Crop & Frame Face Portrait',
  cropShape = 'round', // 'round' or 'rect'
  initialAspect = 1
}) {
  const { toast } = useDialog();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspect, setAspect] = useState(initialAspect);

  const onCropChange = (newCrop) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom) => {
    setZoom(newZoom);
  };

  const onCropAreaChange = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    try {
      setIsProcessing(true);
      const croppedImageB64 = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      setIsProcessing(false);
      onCropComplete(croppedImageB64);
      onClose();
    } catch (err) {
      console.error('Failed to crop image:', err);
      setIsProcessing(false);
      toast.error('Failed to process cropped image. Please try again.');
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(initialAspect);
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        zIndex: 10000, 
        backgroundColor: 'rgba(5, 10, 24, 0.82)',
        backdropFilter: 'blur(8px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '620px', 
          width: '95%', 
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(to right, rgba(236, 72, 153, 0.08), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Crop size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Drag & zoom to frame the face inside the biometric boundary
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            disabled={isProcessing}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cropper Viewport */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '380px', 
          background: '#090d16',
          overflow: 'hidden'
        }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={true}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaChange}
            onZoomChange={onZoomChange}
            style={{
              containerStyle: { background: '#090d16' },
              cropAreaStyle: {
                border: '2px solid #ec4899',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)'
              }
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#ffffff',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <Sparkles size={12} color="#ec4899" />
            <span>Ensure eyes & face are centered for 99.8% AI accuracy</span>
          </div>
        </div>

        {/* Controls Bar */}
        <div style={{
          padding: '1rem 1.4rem',
          background: 'var(--bg-muted)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          {/* Zoom & Rotate Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Zoom Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '220px' }}>
              <button
                type="button"
                onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', height: '28px' }}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.05}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: 'var(--menu-accent)',
                  cursor: 'pointer'
                }}
              />
              <button
                type="button"
                onClick={() => setZoom(Math.min(3, zoom + 0.2))}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', height: '28px' }}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '36px', color: 'var(--text-muted)' }}>
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Action Buttons: Rotate & Reset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Rotate 90° clockwise"
              >
                <RotateCw size={13} />
                <span>Rotate</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Reset crop and rotation"
              >
                <RefreshCw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '0.85rem 1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-surface)'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
            style={{ fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyCrop}
            disabled={isProcessing}
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ec4899, #db2777)',
              borderColor: '#ec4899',
              minWidth: '140px'
            }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Crop & Apply Face</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
