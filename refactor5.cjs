const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8').replace(/\r\n/g, '\n');

// -------------- SHIFT SELECTION MODAL --------------
const shiftStartStr = `          {/* SCHICHT AUSWAHL MODAL (Langes Drücken) */}`;
const shiftEndStr = `Frei / Löschen
                      </button>
                   </div>
                </div>
             </div>
          )}`;

const shiftStart = appCode.indexOf(shiftStartStr);
const shiftEnd = appCode.indexOf(shiftEndStr, shiftStart);

if (shiftStart !== -1 && shiftEnd !== -1) {
    appCode = appCode.slice(0, shiftStart) + 
      `          <ShiftSelectionModal data={shiftModalData} onClose={() => setShiftModalData(null)} onSelect={handleShiftModalSelect} />\n` + 
      appCode.slice(shiftEnd + shiftEndStr.length);
      
    const shiftCode = `import React from 'react';\n
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
}\n`;
    fs.writeFileSync(path.join(cwd, 'src', 'components', 'ShiftSelectionModal.jsx'), shiftCode);
} else {
    console.error("FAIL: ShiftSelectionModal block not found");
    process.exit(1);
}

// -------------- SHARE EVENT MODAL --------------
const shareStartStr = `          {isShareEventModalOpen && (`;
const shareEndStr = `In Chat senden</button>
                    </div>
                  </form>
               </div>
            </div>
          )}`;

const shareStartReal = appCode.indexOf(shareStartStr, appCode.indexOf("SCHICHT AUSWAHL MODAL"));
const shareEnd = appCode.indexOf(shareEndStr, shareStartReal);

if (shareStartReal !== -1 && shareEnd !== -1) {
    appCode = appCode.slice(0, shareStartReal) + 
      `          <ShareEventModal isOpen={isShareEventModalOpen} onClose={() => setIsShareEventModalOpen(false)} onShare={(ev) => sendMessage(null, null, null, ev)} />\n` + 
      appCode.slice(shareEnd + shareEndStr.length);
      
    const shareCode = `import React from 'react';
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
}\n`;
    fs.writeFileSync(path.join(cwd, 'src', 'components', 'ShareEventModal.jsx'), shareCode);
} else {
    console.error("FAIL: ShareEventModal block not found");
    process.exit(1);
}

// Add imports
const imports = `import ShiftSelectionModal from './components/ShiftSelectionModal.jsx';
import ShareEventModal from './components/ShareEventModal.jsx';\n`;

const importPoint = appCode.indexOf('import ImageViewer');
if (importPoint !== -1) {
    // If refactor4 has run, just append below it
    appCode = appCode.slice(0, importPoint) + imports + appCode.slice(importPoint);
} else {
    // If not, put it at a known safe place
    const backupImportPoint = appCode.indexOf('import { \n');
    if (backupImportPoint !== -1) {
        appCode = appCode.slice(0, backupImportPoint) + imports + appCode.slice(backupImportPoint);
    } else {
        appCode = imports + appCode;
    }
}

fs.writeFileSync(appFile, appCode);
console.log("SUCCESS_MODALS");
