import React from 'react';
import { CalendarPlus } from 'lucide-react';

export default function ShareEventModal({ isOpen, onClose, onShare }) {
  if (!isOpen) return null;
  return (
            <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-neutral-950 border border-neutral-800 w-full max-w-sm rounded-xl p-6 shadow-2xl animate-fade-in">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><CalendarPlus className="w-5 h-5"/> Termin teilen</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const ev = { title: fd.get('title'), date: fd.get('date'), time: fd.get('time'), type: 'Chat-Einladung' };
                    onShare(ev);
                    onClose();
                  }} className="space-y-4">
                    <input type="text" name="title" required placeholder="Titel (z.B. Kino heute?)" className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500" />
                    <div className="flex gap-2">
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500" />
                      <input type="time" name="time" required defaultValue="18:00" className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg text-sm text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 transition-colors">Abbrechen</button>
                      <button type="submit" className="flex-1 py-3 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors">In Chat senden</button>
                    </div>
                  </form>
               </div>
            </div>
  );
}
