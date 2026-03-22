import React, { useState, useEffect } from 'react';
import { db, APP_ID } from './utils/firebase.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Calendar as CalendarIcon, Clock, User, MessageSquare, CheckCircle2, AlertCircle, Moon } from 'lucide-react';

export default function BookingApp({ code }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  
  const [busyEvents, setBusyEvents] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState('selectSlot'); // selectSlot, form, success
  
  const [guestName, setGuestName] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const mode = 'dark';
    const theme = profile?.appTheme || 'obsidian';
    const bg = profile?.appBg || 'none';

    const syncNode = (node) => {
      if (!node) return;
      node.setAttribute('data-mode', mode);
      node.classList.remove('onyx-theme-light');
      node.setAttribute('data-theme', theme);
      if (bg && bg !== 'none') node.setAttribute('data-bg', bg);
      else node.removeAttribute('data-bg');
    };

    syncNode(html);
    syncNode(body);
  }, [profile?.appTheme, profile?.appBg]);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setError('Booking-Link konnte nicht geladen werden. Bitte später erneut versuchen.');
        setLoading(false);
      }
    }, 12000);

    async function loadProfile() {
      if (!code) {
        setError('Kein Booking-Code angegeben.');
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, `artifacts/${APP_ID}/public/data/bookingProfiles`, code);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setError(`Der Link ist ungültig oder wurde deaktiviert.`);
          setLoading(false);
          return;
        }
        const data = snap.data();
        if (!data.isActive) {
          setError(`Dieser Kalender akzeptiert derzeit keine Termine.`);
          setLoading(false);
          return;
        }

        const normalizedProfile = {
          ...data,
          uid: data.uid || data.ownerUid || data.createdByUid || '',
          title: data.title || 'Termin buchen',
          duration: Number(data.duration || 30) || 30,
          appTheme: data.appTheme || 'obsidian',
          appBg: data.appBg || 'none',
          schedule: data.schedule || {}
        };

        if (cancelled) return;
        setProfile(normalizedProfile);

        if (Array.isArray(data.busyEvents) && data.busyEvents.length > 0) {
          setBusyEvents(data.busyEvents.map((item) => ({ ...item, startMs: Number(item?.startMs || 0), endMs: Number(item?.endMs || 0) })).filter((item) => item.startMs > 0));
          window.clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        // Fallback: fetch busy times from shared busy-only feed if provided
        if (data.shareToken) {
          const shareRef = doc(db, `artifacts/${APP_ID}/public/data/shares`, data.shareToken);
          const shareSnap = await getDoc(shareRef);
          if (shareSnap.exists()) {
            const shareData = shareSnap.data();
            const isRevoked = shareData.revokedAtMs > 0;
            const isExpired = shareData.expiresAtMs > 0 && Date.now() > shareData.expiresAtMs;
            if (!isRevoked && !isExpired && Array.isArray(shareData.events)) {
              setBusyEvents(shareData.events.map((item) => ({ ...item, startMs: Number(item?.startMs || 0), endMs: Number(item?.endMs || 0) })).filter((item) => item.startMs > 0));
            }
          }
        }
        window.clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error(err);
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setError('Netzwerkfehler beim Laden.');
          setLoading(false);
        }
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
           <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
           <h2 className="text-xl font-bold mb-2">Termin-Buchung</h2>
           <p className="text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  // Generate next 14 days
  const upcomingDays = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const getDayName = (d) => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()];
  
  // Format MM-DD for UI
  const formatDayUI = (d) => {
    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.`;
  };

  const getSlotsForDate = (dateObj) => {
    if (!profile.schedule) return [];
    
    // Map JS getDay (0=Sun..6=Sat) to 'mon', 'tue' etc.
    const dayMap = ['sun','mon','tue','wed','thu','fri','sat'];
    const wd = dayMap[dateObj.getDay()];
    
    const dayConfig = profile.schedule[wd];
    if (!dayConfig || !dayConfig.active) return [];
    
    // Create slots
    const startObj = new Date(dateObj);
    const [sH, sM] = dayConfig.start.split(':').map(Number);
    startObj.setHours(sH, sM, 0, 0);

    const endObj = new Date(dateObj);
    const [eH, eM] = dayConfig.end.split(':').map(Number);
    endObj.setHours(eH, eM, 0, 0);

    const durMs = (profile.duration || 30) * 60 * 1000;
    const slots = [];
    let curr = startObj.getTime();

    const nowMs = Date.now();

    while (curr + durMs <= endObj.getTime()) {
      const slotEnd = curr + durMs;
      
      // Skip if in past
      if (curr > nowMs + 60*60*1000) { 
        // Filter logic for busy overlapping
        const isBusy = busyEvents.some(be => {
           // Event overlaps if: StartTime < SlotEnd AND EndTime > SlotStart
           // For busyEvents, if it's allDay, we need timezone logic, but simple check first
           if (be.isAllDay) {
             const beDate = new Date(be.startMs);
             return beDate.getFullYear() === dateObj.getFullYear() &&
                    beDate.getMonth() === dateObj.getMonth() &&
                    beDate.getDate() === dateObj.getDate();
           }
           return (be.startMs < slotEnd && be.endMs > curr);
        });

        if (!isBusy) {
           slots.push({
             startMs: curr,
             endMs: slotEnd,
             timeStr: new Date(curr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
           });
        }
      }
      curr += durMs;
    }
    return slots;
  };

  const currentSlots = selectedDate ? getSlotsForDate(selectedDate) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setSubmitting(true);
    
    try {
      if (!profile?.uid) {
        throw new Error('BOOKING_PROFILE_UID_MISSING');
      }
      const reqRef = collection(db, `artifacts/${APP_ID}/users/${profile.uid}/bookingRequests`);
      await addDoc(reqRef, {
        guestName,
        guestNote,
        startMs: selectedSlot.startMs,
        endMs: selectedSlot.endMs,
        duration: profile.duration || 30,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setStep('success');
    } catch (err) {
      console.error(err);
      alert(err?.message === 'BOOKING_PROFILE_UID_MISSING' ? 'Dieses Booking-Profil ist unvollständig. Bitte im Onyx-Konto einmal speichern.' : 'Fehler beim Buchen!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--onyx-app-shell-bg)] text-neutral-200 font-sans selection:bg-neutral-800">
       <div className="sticky top-0 z-30 border-b border-neutral-800 backdrop-blur" style={{ backgroundColor: 'var(--onyx-overlay)' }}>
         <div className="max-w-3xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4">
           <div className="min-w-0 text-left select-none rounded-xl px-1 py-0.5">
             <div className="text-[10px] uppercase tracking-[0.32em] text-neutral-500">ONYX</div>
             <div className="mt-1 text-base md:text-2xl font-light text-white truncate">Guten Morgen.</div>
           </div>
           <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl border border-neutral-800 text-neutral-100 flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--onyx-surface-soft)' }} aria-hidden="true">
             <Moon className="w-5 h-5" />
           </div>
         </div>
       </div>
       <div className="max-w-3xl mx-auto p-4 md:p-8 pt-6 md:pt-8">
          
          <div className="mb-8 text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-950/70 text-[11px] uppercase tracking-[0.22em] text-neutral-400 mb-4">Öffentliche Terminbuchung</div>
             <div className="w-16 h-16 bg-neutral-900/80 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-700 shadow-xl">
                <User className="w-8 h-8 text-neutral-400" />
             </div>
             <h1 className="text-2xl font-bold text-white tracking-tight">{profile.title || 'Termin buchen'}</h1>
             <p className="text-neutral-400 mt-2 text-sm">{profile.duration || 30} Minuten</p>
          </div>

          {step === 'selectSlot' && (
             <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                <h2 className="flex items-center gap-2 font-medium text-white mb-6">
                   <CalendarIcon className="w-5 h-5 text-neutral-400" />
                   1. Datum wählen
                </h2>
                
                <div className="flex gap-3 overflow-x-auto pb-4 snap-x hide-scrollbar">
                   {upcomingDays.map(d => {
                      const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
                      const slots = getSlotsForDate(d);
                      const hasSlots = slots.length > 0;
                      
                      return (
                        <button 
                          key={d.toISOString()}
                          onClick={() => {
                            if (hasSlots) {
                              setSelectedDate(d);
                              setSelectedSlot(null);
                            }
                          }}
                          disabled={!hasSlots}
                          className={`flex-shrink-0 snap-center flex flex-col items-center justify-center w-16 h-20 rounded-xl transition-all border ${
                            isSelected 
                              ? 'bg-white text-black border-white shadow-lg scale-105' 
                              : hasSlots 
                                ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600' 
                                : 'bg-neutral-950/50 border-neutral-800 text-neutral-600 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-xs font-semibold mb-1">{getDayName(d)}</span>
                          <span className="text-lg font-bold">{d.getDate()}</span>
                        </button>
                      );
                   })}
                </div>

                {selectedDate && (
                  <div className="mt-8 animate-fade-in">
                    <h2 className="flex items-center gap-2 font-medium text-white mb-4">
                      <Clock className="w-5 h-5 text-neutral-400" />
                      2. Uhrzeit wählen
                    </h2>
                    
                    {currentSlots.length === 0 ? (
                      <div className="text-center p-6 border border-neutral-800 border-dashed rounded-xl text-neutral-500">
                        Keine freien Termine an diesem Tag.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {currentSlots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setStep('form');
                            }}
                            className="py-3 rounded-xl border border-neutral-700 bg-neutral-800/50 hover:bg-white hover:text-black hover:border-white transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-950"
                          >
                            {slot.timeStr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
             </div>
          )}

          {step === 'form' && selectedSlot && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl animate-fade-in relative overflow-hidden">
               <button onClick={() => setStep('selectSlot')} className="text-xs text-neutral-500 hover:text-white mb-6 uppercase tracking-widest font-semibold flex items-center gap-1">
                 ← Zurück zur Zeitwahl
               </button>
               
               <div className="mb-6 p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                  <div className="text-sm text-neutral-400 mb-1">Ausgewählter Termin</div>
                  <div className="font-medium text-white text-lg">
                    {getDayName(new Date(selectedSlot.startMs))}, {formatDayUI(new Date(selectedSlot.startMs))} um {selectedSlot.timeStr} Uhr
                  </div>
               </div>

               <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">Dein Name *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-5 h-5 text-neutral-500" />
                      <input 
                        type="text" 
                        required
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="Max Mustermann"
                        className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-neutral-500 transition-colors"
                      />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">Anliegen / Notiz (Optional)</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-3.5 w-5 h-5 text-neutral-500" />
                      <textarea 
                        value={guestNote}
                        onChange={e => setGuestNote(e.target.value)}
                        placeholder="Worum geht es in dem Termin?"
                        rows="3"
                        className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-neutral-500 transition-colors resize-none"
                      />
                    </div>
                 </div>

                 <button 
                  type="submit" 
                  disabled={submitting || !guestName.trim()}
                  className="w-full mt-4 py-4 rounded-xl font-bold text-black bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   {submitting ? 'Wird gebucht...' : 'Termin verbindlich anfragen'}
                 </button>
               </form>
            </div>
          )}

          {step === 'success' && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl animate-fade-in text-center">
               <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 className="w-10 h-10 text-emerald-400" />
               </div>
               <h2 className="text-2xl font-bold text-white mb-2">Anfrage gesendet!</h2>
               <p className="text-neutral-400 mb-8 max-w-sm mx-auto">
                 Dein Terminwunsch für den <strong>{formatDayUI(new Date(selectedSlot.startMs))}</strong> um <strong>{selectedSlot.timeStr} Uhr</strong> wurde erfolgreich übermittelt.
               </p>
               <button 
                 onClick={() => {
                   setStep('selectSlot');
                   setSelectedDate(null);
                   setSelectedSlot(null);
                 }}
                 className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors"
               >
                 Neue Buchung
               </button>
            </div>
          )}
          
       </div>
       <style>{`
         .hide-scrollbar::-webkit-scrollbar { display: none; }
         .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
       `}</style>
    </div>
  );
}
