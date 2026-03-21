const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8').replace(/\r\n/g, '\n');

let dirty = false;

// 1. Imports
if (appCode.indexOf('themes.css') === -1) {
    appCode = `import './themes.css';\n` + appCode;
    dirty = true;
}
if (appCode.indexOf('Palette') === -1) {
    appCode = appCode.replace(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"];/, (match, p1) => {
        return `import {${p1}, Palette, LayoutDashboard, MonitorSmartphone } from 'lucide-react';`;
    });
    dirty = true;
}

// 2. Global useEffect
const effectCode = `
  React.useEffect(() => {
    if (userProfile?.appTheme) document.body.setAttribute('data-theme', userProfile.appTheme);
    else document.body.removeAttribute('data-theme');
    
    if (userProfile?.appBg) document.body.setAttribute('data-bg', userProfile.appBg);
    else document.body.removeAttribute('data-bg');
  }, [userProfile?.appTheme, userProfile?.appBg]);
`;
if (appCode.indexOf(`setAttribute('data-theme'`) === -1) {
    const hookTarget = `const [currentView, setCurrentView] = React.useState('home');`;
    const hookIdx = appCode.indexOf(hookTarget);
    if (hookIdx !== -1) {
        appCode = appCode.slice(0, hookIdx + hookTarget.length) + '\n' + effectCode + appCode.slice(hookIdx + hookTarget.length);
        dirty = true;
    }
}

// 3. Add to TABS
const tabsTarget = `{ id: 'booking', label`;
if (appCode.indexOf(`id: 'design'`) === -1 && appCode.indexOf(tabsTarget) !== -1) {
    const designTab = `{ id: 'design', label: 'Onyx Pro Design', subtitle: 'Premium Themes, Blurs & Widgets', icon: Palette, keys: ['design', 'theme', 'blur', 'widget', 'pro'] },`;
    appCode = appCode.replace(tabsTarget, designTab + "\n      " + tabsTarget);
    dirty = true;
} else if (appCode.indexOf(`id: 'design'`) === -1) {
    // fallback if 'booking' isn't found
    const backupTarget = `{ id: 'audit', label`;
    if (appCode.indexOf(backupTarget) !== -1) {
        const designTab = `{ id: 'design', label: 'Onyx Pro Design', subtitle: 'Premium Themes, Blurs & Widgets', icon: Palette, keys: ['design', 'theme', 'blur', 'widget', 'pro'] },`;
        appCode = appCode.replace(backupTarget, designTab + "\n      " + backupTarget);
        dirty = true;
    }
}

// 4. Inject AccordionItem UI
const designUI = `
            {/* DESIGN TAB */}
            <AccordionItem id="design" label="Onyx Pro Design" icon={Palette} keys={['design', 'theme', 'blur', 'widget', 'pro']}>
               <section id="settings-design" className="space-y-6">
                 
                 <div>
                   <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider mb-4 border-b border-emerald-900/50 pb-2 flex items-center gap-2">
                     <MonitorSmartphone className="w-4 h-4" /> App Theme
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                     {[
                       { id: 'obsidian', name: 'Deep Obsidian', desc: 'Reines AMOLED-Schwarz (Default)' },
                       { id: 'midnight', name: 'Midnight Blue', desc: 'Dunkles Marineblau' },
                       { id: 'gold', name: 'Onyx Gold', desc: 'Schwarz mit Gold-Akzenten' }
                     ].map(t => (
                       <button
                         key={t.id}
                         onClick={() => updateProfileField('appTheme', t.id === 'obsidian' ? null : t.id)}
                         className={\`p-4 rounded-xl border text-left transition-all \${(userProfile?.appTheme || 'obsidian') === t.id ? 'bg-emerald-900/20 border-emerald-500' : 'bg-black border-neutral-800 hover:border-neutral-600'}\`}
                       >
                         <div className="font-semibold text-white text-sm">{t.name}</div>
                         <div className="text-xs text-neutral-500 mt-1">{t.desc}</div>
                       </button>
                     ))}
                   </div>
                 </div>

                 <div>
                   <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider mb-4 border-b border-emerald-900/50 pb-2 flex items-center gap-2">
                     <LayoutDashboard className="w-4 h-4" /> Glassmorphism & Hintergrund
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                     {[
                       { id: 'none', name: 'Mattes Schwarz', desc: 'Standard UI' },
                       { id: 'glass-1', name: 'Neon Blur', desc: 'Animierte Farbverläufe mit Glassmorphism' },
                       { id: 'glass-2', name: 'Gold Blur', desc: 'Elegantes Gold-Ambient' }
                     ].map(bg => (
                       <button
                         key={bg.id}
                         onClick={() => updateProfileField('appBg', bg.id === 'none' ? null : bg.id)}
                         className={\`p-4 rounded-xl border text-left transition-all \${(userProfile?.appBg || 'none') === bg.id ? 'bg-emerald-900/20 border-emerald-500' : 'bg-black border-neutral-800 hover:border-neutral-600'}\`}
                       >
                         <div className="font-semibold text-white text-sm">{bg.name}</div>
                         <div className="text-xs text-neutral-500 mt-1">{bg.desc}</div>
                       </button>
                     ))}
                   </div>
                   <p className="mt-3 text-xs text-neutral-500 italic">Hinweis: Glassmorphismus kann auf sehr alten Geräten die Akkulaufzeit beeinträchtigen.</p>
                 </div>
                 
               </section>
            </AccordionItem>
`;

if (appCode.indexOf('AccordionItem id="design"') === -1) {
    const accTarget = `id="booking"`;
    // Find where the booking accordion ends!
    const bookingEndTarget = `              </section>
            </AccordionItem>`;
    
    let accCursor = appCode.indexOf(accTarget);
    if (accCursor !== -1) {
        let bookingEndIdx = appCode.indexOf(bookingEndTarget, accCursor);
        if (bookingEndIdx !== -1) {
             const insertPos = bookingEndIdx + bookingEndTarget.length;
             appCode = appCode.slice(0, insertPos) + designUI + appCode.slice(insertPos);
             dirty = true;
        }
    } else {
        // fallback to putting it before 'ics' or 'audit'
        let icsTarget = `id="ics"`;
        let icsCursor = appCode.indexOf(icsTarget);
        if (icsCursor !== -1) {
             // go back to previous <AccordionItem
             let prevItem = appCode.lastIndexOf('<AccordionItem', icsCursor);
             appCode = appCode.slice(0, prevItem) + designUI + appCode.slice(prevItem);
             dirty = true;
        }
    }
}

if (dirty) {
    fs.writeFileSync(appFile, appCode);
    console.log("SUCCESS_THEMES");
} else {
    console.log("ALREADY_INJECTED");
}
