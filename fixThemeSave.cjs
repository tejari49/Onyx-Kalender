const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8');

let dirty = false;

// 1. Inject updateProfileField if it doesn't exist
if (appCode.indexOf('const updateProfileField') === -1) {
    const target = `const updateProfileSettings = async`;
    const targetIdx = appCode.indexOf(target);
    if (targetIdx !== -1) {
        const injectCode = `
  const updateProfileField = async (field, value) => {
    if (!user?.uid) return;
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      await updateDoc(doc(db, \`artifacts/\${APP_ID}/users/\${user.uid}\`), { [field]: value });
      setUserProfile(prev => ({ ...prev, [field]: value })); // Optimistic update
    } catch(err) {
      console.error('Error updating profile field', err);
    }
  };
\n  `;
        appCode = appCode.slice(0, targetIdx) + injectCode + appCode.slice(targetIdx);
        dirty = true;
        console.log("INJECTED_UPDATE_FUNCTION");
    } else {
        console.log("updateProfileSettings NOT FOUND");
    }
} else {
    console.log("updateProfileField ALREADY EXISTS");
}

// 2. Make the Design settings UI look more premium and functional on mobile
// The user said: "in der mobilen version, es sieht nicht funktional aus"
// We will increase the padding, make text larger, and add explicit "Aktiv" badges to selected themes.
const oldBtn = `<div className="font-semibold text-white text-sm">{t.name}</div>
                         <div className="text-xs text-neutral-500 mt-1">{t.desc}</div>`;
const newBtn = `<div className="flex items-center justify-between">
                            <div className="font-semibold text-white text-base sm:text-sm">{t.name}</div>
                            {(userProfile?.appTheme || 'obsidian') === t.id && <span className="text-[10px] uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Aktiv</span>}
                         </div>
                         <div className="text-sm sm:text-xs text-neutral-400 mt-2">{t.desc}</div>`;

const oldBgBtn = `<div className="font-semibold text-white text-sm">{bg.name}</div>
                         <div className="text-xs text-neutral-500 mt-1">{bg.desc}</div>`;
const newBgBtn = `<div className="flex items-center justify-between">
                            <div className="font-semibold text-white text-base sm:text-sm">{bg.name}</div>
                            {(userProfile?.appBg || 'none') === bg.id && <span className="text-[10px] uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Aktiv</span>}
                         </div>
                         <div className="text-sm sm:text-xs text-neutral-400 mt-2">{bg.desc}</div>`;

if (appCode.indexOf(oldBtn) !== -1) {
    appCode = appCode.replace(oldBtn, newBtn);
    appCode = appCode.replace(oldBgBtn, newBgBtn);
    
    // Make the grid gap larger on mobile maybe?
    // "gap-3" -> "gap-4 sm:gap-3"
    appCode = appCode.replaceAll('grid grid-cols-1 sm:grid-cols-3 gap-3', 'grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3');
    dirty = true;
    console.log("IMPROVED_MOBILE_UI");
}

if (dirty) {
    fs.writeFileSync(appFile, appCode);
    console.log("SUCCESS_FIX_THEMES");
} else {
    console.log("ALREADY_OK");
}
