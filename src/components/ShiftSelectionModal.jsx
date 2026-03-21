import React from 'react';

export default function ShiftSelectionModal({ data, onClose, onSelect }) {
  if (!data) return null;
  return (
             <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={onClose}>
                <div className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-xs rounded-t-2xl sm:rounded-xl p-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                   <h3 className="text-white font-medium mb-1 text-center">Schicht wählen</h3>
                   <p className="text-neutral-500 text-xs text-center mb-4 border-b border-neutral-800 pb-3">{new Date(data.dateStr).toLocaleDateString('de-DE')}</p>
                   
                   <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                      {(data?.shifts || []).filter(Boolean).map(s => (
                         <button key={s.id} onClick={() => onSelect(s)} className="w-full py-3 rounded-xl text-sm font-semibold text-black transition-transform active:scale-95 shadow-sm" style={{backgroundColor: s?.color || '#ffffff'}}>
                            {s?.name || 'Schicht'} <span className="font-normal opacity-70 ml-2">{s?.time || ''}</span>
                         </button>
                      ))}
                      <button onClick={() => onSelect('delete')} className="w-full py-3 rounded-xl text-sm font-medium text-red-500 bg-red-500/10 border border-red-900/50 hover:bg-red-500/20 mt-4 transition-colors">
                         Frei / Löschen
                      </button>
                   </div>
                </div>
             </div>
  );
}
