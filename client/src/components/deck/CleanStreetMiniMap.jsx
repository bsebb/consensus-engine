import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapPin, Navigation, Plus, Minus, RotateCcw } from 'lucide-react';

function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

export default function CleanStreetMiniMap({
  lat,
  lng,
  venueName = 'Venue',
  address = '',
  className = '',
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 360, height: 160 });
  const [zoom, setZoom] = useState(15);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const hasCoords =
    lat != null &&
    lng != null &&
    !isNaN(Number(lat)) &&
    !isNaN(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180;

  const latNum = hasCoords ? Number(lat) : 47.0225;
  const lngNum = hasCoords ? Number(lng) : 28.8340;

  // Observe actual DOM container width/height
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset pan offset if venue coordinates change
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(15);
  }, [lat, lng]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoom((z) => Math.min(17, z + 1));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoom((z) => Math.max(13, z - 1));
  };

  const handleRecenter = (e) => {
    e.stopPropagation();
    setPanOffset({ x: 0, y: 0 });
    setZoom(15);
  };

  // Compute tile layout
  const { tiles, pinPosition } = useMemo(() => {
    const { x: tileXExact, y: tileYExact } = latLngToTile(latNum, lngNum, zoom);
    const centerPixelX = tileXExact * 256;
    const centerPixelY = tileYExact * 256;

    const viewportLeft = centerPixelX - dimensions.width / 2 - panOffset.x;
    const viewportTop = centerPixelY - dimensions.height / 2 - panOffset.y;

    const minTileX = Math.floor(viewportLeft / 256);
    const maxTileX = Math.floor((viewportLeft + dimensions.width) / 256);
    const minTileY = Math.floor(viewportTop / 256);
    const maxTileY = Math.floor((viewportTop + dimensions.height) / 256);

    const tileList = [];
    const subdomains = ['a', 'b', 'c', 'd'];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const primaryUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
        const left = Math.round(tx * 256 - viewportLeft);
        const top = Math.round(ty * 256 - viewportTop);

        tileList.push({
          key: `${zoom}-${tx}-${ty}`,
          url: primaryUrl,
          backupUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`,
          left,
          top,
        });
      }
    }

    const pinLeft = Math.round(centerPixelX - viewportLeft);
    const pinTop = Math.round(centerPixelY - viewportTop);

    return { tiles: tileList, pinPosition: { left: pinLeft, top: pinTop } };
  }, [latNum, lngNum, zoom, panOffset, dimensions]);

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}`;
  const isPanned = Math.abs(panOffset.x) > 10 || Math.abs(panOffset.y) > 10;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden border border-[var(--border-main)] bg-[#e8ecef] select-none touch-none cursor-grab active:cursor-grabbing ${className}`}
      style={{ WebkitUserSelect: 'none' }}
    >
      {/* Raster Tiles Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            className="absolute w-[256px] h-[256px] max-w-none transition-opacity duration-150"
            style={{
              left: `${tile.left}px`,
              top: `${tile.top}px`,
            }}
            onError={(e) => {
              if (e.currentTarget.src !== tile.backupUrl) {
                e.currentTarget.src = tile.backupUrl;
              }
            }}
          />
        ))}
      </div>

      {/* Center Venue Pin Marker with Pulse Ring */}
      <div
        className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full transition-transform duration-75"
        style={{
          left: `${pinPosition.left}px`,
          top: `${pinPosition.top}px`,
        }}
      >
        <div className="relative flex flex-col items-center">
          {/* Tooltip badge */}
          <div className="mb-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[10px] font-bold shadow-md max-w-[140px] truncate border border-white/15">
            {venueName}
          </div>

          {/* Pulse Ripple */}
          <span className="absolute -bottom-1 w-6 h-6 rounded-full bg-[var(--accent-bg)]/35 animate-ping" />

          {/* Pin Icon Bubble */}
          <div className="relative w-7 h-7 rounded-full bg-[var(--accent-bg)] text-white flex items-center justify-center shadow-lg border-2 border-white">
            <MapPin size={14} className="fill-current" />
          </div>
        </div>
      </div>

      {/* Floating Minimalist Map Controls */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 17}
          aria-label="Zoom In"
          className="w-7 h-7 rounded-lg bg-black/65 backdrop-blur-md text-white border border-white/20 flex items-center justify-center text-xs font-bold hover:bg-black/85 disabled:opacity-40 transition-colors shadow-xs cursor-pointer active:scale-95"
        >
          <Plus size={13} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 13}
          aria-label="Zoom Out"
          className="w-7 h-7 rounded-lg bg-black/65 backdrop-blur-md text-white border border-white/20 flex items-center justify-center text-xs font-bold hover:bg-black/85 disabled:opacity-40 transition-colors shadow-xs cursor-pointer active:scale-95"
        >
          <Minus size={13} />
        </button>
        {isPanned && (
          <button
            type="button"
            onClick={handleRecenter}
            aria-label="Recenter Map"
            className="w-7 h-7 rounded-lg bg-[var(--accent-bg)] text-white border border-white/30 flex items-center justify-center text-xs font-bold hover:opacity-90 transition-all shadow-xs cursor-pointer active:scale-95 animate-fadeIn"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      {/* Floating Directions Shortcut Pill */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 left-2 z-20 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 shadow-xs hover:bg-black/90 transition-colors cursor-pointer"
      >
        <Navigation size={10} className="text-[var(--accent-bg)]" />
        <span>Open in Maps</span>
      </a>

      {/* Clean Unobtrusive Attribution Floor (Strictly >= 10px typography) */}
      <div className="absolute bottom-1 right-1.5 z-10 pointer-events-none px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-xs text-[10px] text-white/70 font-sans">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
