const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8').replace(/\r\n/g, '\n');

// 1. Add CalendarPlus to lucide-react imports if not there
if (appCode.indexOf('CalendarPlus') === -1) {
    appCode = appCode.replace(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"];/, (match, p1) => {
        return `import {${p1}, CalendarPlus } from 'lucide-react';`;
    });
}

// 2. Add Booking tab to TABS
const tabsTarget = `{ id: 'links', label: 'Public Links',`;
if (appCode.indexOf(tabsTarget) !== -1 && appCode.indexOf(`id: 'booking'`) === -1) {
    const bookingTab = `{ id: 'booking', label: 'Booking-Link', subtitle: 'Gäste-Terminkalender', icon: CalendarPlus, keys: ['booking', 'buchung', 'link', 'meet', 'calendly'] },`;
    appCode = appCode.replace(tabsTarget, bookingTab + "\n      " + tabsTarget);
}

// 3. Add AccordionItem id="booking" after id="links"
const linksEndTarget = `              </section>
            </AccordionItem>`;

let cursor = appCode.indexOf(`id="links"`);
if (cursor !== -1 && appCode.indexOf(`id="booking"`) === -1) {
    const nextItemEnd = appCode.indexOf(linksEndTarget, cursor);
    if (nextItemEnd !== -1) {
        const insertPos = nextItemEnd + linksEndTarget.length;
        const bookingSection = `

            {/* BOOKING LINK */}
            <AccordionItem id="booking" label="Booking Link" icon={CalendarPlus} keys={['booking','buchung','link','meet']}>
               <section id="settings-booking">
                 <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                   <CalendarPlus className="w-4 h-4" /> Guest Booking Hub
                 </h3>
                 <BookingHostManager user={user} userProfile={userProfile} db={db} APP_ID={APP_ID} events={events} />
               </section>
            </AccordionItem>`;
        appCode = appCode.slice(0, insertPos) + bookingSection + appCode.slice(insertPos);
    }
}

// 4. Append component definition at the end, right above default export
const compDef = `
// --- BOOKING HOST MANAGER ---
function BookingHostManager({ user, userProfile, db, APP_ID, events }) {
  const [bProfile, setBProfile] = React.useState(null);
  const [bLoading, setBLoading] = React.useState(true);
  const [requests, setRequests] = React.useState([]);
  
  const code = userProfile?.friendCode;
  
  // Combine imports/logic safety
  const { doc, getDoc, setDoc, query, collection, where, onSnapshot, updateDoc, addDoc, serverTimestamp } = require('firebase/firestore');

  React.useEffect(() => {
    if (!code) { setBLoading(false); return; }
    getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'bookingProfiles', code)).then(snap => {
      if (snap.exists()) setBProfile(snap.data());
      else setBProfile({ uid: user?.uid, isActive: false, title: userProfile?.displayName || 'Termin buchen', duration: 30, schedule: { mon:{active:true,start:'09:00',end:'17:00'}, tue:{active:true,start:'09:00',end:'17:00'}, wed:{active:true,start:'09:00',end:'17:00'}, thu:{active:true,start:'09:00',end:'17:00'}, fri:{active:true,start:'09:00',end:'17:00'} } });
      setBLoading(false);
    });
  }, [code, db, APP_ID, user, userProfile]);

  React.useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, \`artifacts/\${APP_ID}/users/\${user.uid}/bookingRequests\`), where('status', '==', 'pending'));
    return onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
  }, [user?.uid, db, APP_ID]);

  const save = async () => {
    if (!code) return;
    const busyEvents = (events || []).map(e => ({ startMs: e.startMs, endMs: e.endMs, isAllDay: e.isAllDay === true }));
    const toSave = { ...bProfile, busyEvents };
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'bookingProfiles', code), toSave);
    alert('Booking-Profil gespeichert!');
  };

  const copyLink = () => {
    const url = \`\${window.location.origin}\${window.location.pathname}?book=\${code}\`;
    navigator.clipboard.writeText(url);
    alert('Link kopiert!');
  };

  const accept = async (req) => {
    if (!confirm('Buchung annehmen und Kalendereintrag erstellen?')) return;
    await addDoc(collection(db, \`artifacts/\${APP_ID}/users/\${user.uid}/events\`), {
       title: \`Meeting mit \${req.guestName}\`,
       date: new Date(req.startMs).toISOString().split('T')[0],
       time: new Date(req.startMs).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
       durationMinutes: req.duration,
       desc: req.guestNote || '',
       type: 'Booking',
       createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, \`artifacts/\${APP_ID}/users/\${user.uid}/bookingRequests\`, req.id), { status: 'accepted' });
  };

  const decline = async (req) => {
    if (!confirm('Buchung ablehnen?')) return;
    await updateDoc(doc(db, \`artifacts/\${APP_ID}/users/\${user.uid}/bookingRequests\`, req.id), { status: 'declined' });
  };

  if (bLoading) return <div className="text-neutral-500">Lade...</div>;
  if (!code) return <div className="text-neutral-500 p-4 bg-black border border-neutral-800 rounded-xl">Kein Profil-Code gefunden.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {requests.length > 0 && (
         <div className="bg-emerald-900/20 border border-emerald-900/50 rounded-2xl p-5 mb-6">
            <h3 className="text-emerald-400 font-bold flex items-center gap-2 mb-4">
               <CalendarPlus className="w-5 h-5" /> 
               {requests.length} Neue Buchungsanfragen
            </h3>
            <div className="space-y-3">
               {requests.map(r => (
                  <div key={r.id} className="bg-black/60 border border-emerald-900/40 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4">
                     <div>
                        <div className="text-white font-medium text-lg">{r.guestName}</div>
                        <div className="text-sm text-neutral-300 mt-1">
                           {new Date(r.startMs).toLocaleDateString()} um {new Date(r.startMs).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} Uhr ({r.duration} Min)
                        </div>
                        {r.guestNote && <div className="text-sm text-neutral-400 mt-2 italic bg-neutral-900/50 p-2 rounded-lg">"{r.guestNote}"</div>}
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => accept(r)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Zusagen</button>
                        <button onClick={() => decline(r)} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm transition">Absagen</button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      <div className="flex items-center justify-between bg-black border border-neutral-800 p-5 rounded-2xl">
        <div>
          <div className="text-white font-medium text-base">Öffentlichen Link aktivieren</div>
          <div className="text-xs text-neutral-500 mt-1">Gäste können über einen Link freie Zeitslots buchen.</div>
        </div>
        <input type="checkbox" checked={bProfile.isActive} onChange={e => setBProfile({...bProfile, isActive: e.target.checked})} className="w-6 h-6 accent-emerald-500" />
      </div>

      {bProfile.isActive && (
        <div className="bg-black border border-neutral-800 p-6 rounded-2xl space-y-5">
          <div>
             <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Dein Kalender Link</label>
             <div className="flex items-center gap-2 mt-2">
               <div className="flex-1 bg-neutral-900 border border-neutral-800 text-emerald-400 font-mono text-sm px-4 py-3 rounded-xl truncate select-all">{window.location.origin}{window.location.pathname}?book={code}</div>
               <button onClick={copyLink} className="p-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition"><CalendarPlus className="w-5 h-5" /></button>
             </div>
          </div>
          <div>
             <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Seitentitel</label>
             <input className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white mt-2 focus:border-neutral-500 outline-none" value={bProfile.title} onChange={e => setBProfile({...bProfile, title: e.target.value})} placeholder="z.B. Termin buchen" />
          </div>
          <div>
             <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Standard-Dauer (Minuten)</label>
             <select className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white mt-2 focus:border-neutral-500 outline-none" value={bProfile.duration} onChange={e => setBProfile({...bProfile, duration: Number(e.target.value)})}>
                <option value={15}>15 Min</option>
                <option value={30}>30 Min</option>
                <option value={45}>45 Min</option>
                <option value={60}>60 Min</option>
             </select>
          </div>
          <button onClick={save} className="w-full bg-white text-black py-3.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">Einstellungen speichern</button>
        </div>
      )}
    </div>
  );
}
`;

if (appCode.indexOf('BookingHostManager') !== -1 && appCode.indexOf('function BookingHostManager') === -1) {
    const exportTarget = `export default AmoledCalendarApp;`;
    if (appCode.indexOf(exportTarget) !== -1) {
        appCode = appCode.replace(exportTarget, compDef + '\n' + exportTarget);
        fs.writeFileSync(appFile, appCode);
        console.log("SUCCESS_BOOKING");
    } else {
        console.error("FAIL: export default AmoledCalendarApp not found");
        process.exit(1);
    }
} else {
    console.log("ALREADY_INJECTED_OR_MISSING_HOOK");
}
