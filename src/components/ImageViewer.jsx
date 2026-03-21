import React from 'react';
import { X } from 'lucide-react';

export default function ImageViewer({ isOpen, src, onClose }) {
  if (!isOpen || !src) return null;
  
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/70 border border-neutral-700 text-white hover:bg-neutral-800 transition-colors"
        aria-label="Schliessen"
        title="Schliessen"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt="Bild"
        className="max-h-[90vh] max-w-[95vw] object-contain rounded-2xl border border-neutral-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
