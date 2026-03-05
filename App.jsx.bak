import React, { useState, useEffect, useRef } from 'react';

    import { 
      Calendar as CalendarIcon, Home, Settings, Plus, ChevronLeft, ChevronRight, Video, AlignLeft, Users, Clock, Cloud, Sun, CloudRain, Info, LogOut, MapPin, Search, Download, Upload, Bell, BellOff, Trash2, CheckCircle2, AlertCircle, Mail, Lock, MessageSquare, Send, Image as ImageIcon, Camera, ArrowLeft, Edit2, CornerUpLeft, X, User, RefreshCw, Mic, Square, Activity, Bomb, CalendarPlus, Share2, Paintbrush, Pin
    } from 'lucide-react';

    import { initializeApp } from "firebase/app";
    import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
    import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, setDoc, getDoc, getDocs, arrayUnion, arrayRemove, where, limit, orderBy, serverTimestamp, runTransaction } from "firebase/firestore";
    import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
    import heic2any from 'heic2any';

    const customFirebaseConfig = {
      apiKey: "AIzaSyDkdRI4tNh5fe-dyBBGDlGgIiT7vHmoFvg",
      authDomain: "kalender-rai.firebaseapp.com",
      projectId: "kalender-rai",
      storageBucket: "kalender-rai.firebasestorage.app",
      messagingSenderId: "407396898664",
      appId: "1:407396898664:web:3fafd51433481e7bb668dd"
    };

    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : customFirebaseConfig;
    const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'onyx-pwa-live';

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);


    // --- Auth hardening: if the browser keeps a stale Firebase auth cache after project reset,
    // identitytoolkit accounts:lookup can return 400 and break flows. We auto-signout + clear caches.
    (function hardenAuthFetch() {
      try {
        const _fetch = window.fetch ? window.fetch.bind(window) : null;
        if (!_fetch) return;
        window.fetch = async (...args) => {
          const res = await _fetch(...args);
          try {
            const url = (typeof args[0] === "string") ? args[0] : (args[0] && args[0].url) ? args[0].url : "";
            if (url.includes("identitytoolkit.googleapis.com") && url.includes("accounts:lookup") && res && res.status === 400) {
              console.warn("[Auth] accounts:lookup 400 -> signing out and clearing local auth caches");
              try { await signOut(auth); } catch (e) {}
              try { indexedDB.deleteDatabase("firebaseLocalStorageDb"); } catch (e) {}
              try { indexedDB.deleteDatabase("firebase-installations-database"); } catch (e) {}
              try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
            }
          } catch (e) {}
          return res;
        };
      } catch (e) {}
    })();

    const getMessagingSafe = async () => {
      try {
        const supported = await isSupported();
        if (!supported) return null;
        return getMessaging(app);
      } catch (error) {
        console.warn("[FCM] Browser unsupported:", error?.message || error);
        return null;
      }
    };

    const PASTEL_COLORS = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF', '#D3D3D3', '#FFC8DD'];

    
    const QUOTES_URL = 'quotes.json';

    // Fallback quotes (wird genutzt, falls quotes.json nicht geladen werden kann)
    const DEFAULT_QUOTES = [
      "Struktur bringt Ruhe.",
      "Fokus ist eine Entscheidung.",
      "Kleine Schritte, große Wirkung.",
      "Wenn&apos;s brennt: Wasser. Wenn&apos;s chaotisch ist: Kalender.",
      "Planung ist die halbe Miete – die andere Hälfte ist Kaffee."
    ];

    const stableHash = (str) => {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0);
    };

    const pickQuoteForDay = (quotes, dayKey) => {
      const list = (Array.isArray(quotes) && quotes.length) ? quotes : DEFAULT_QUOTES;
      const idx = stableHash(String(dayKey)) % list.length;
      return list[idx];
    };


    const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

    
    // --- ERROR BOUNDARY (verhindert "schwarzer Screen" bei Runtime-Fehlern) ---
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      componentDidCatch(error, info) {
        console.error('[Onyx] UI ErrorBoundary:', error, info);
      }
      render() {
        if (this.state.hasError) {
          return (
            <div className="absolute inset-0 bg-black text-white flex items-center justify-center p-6">
              <div className="max-w-md w-full border border-neutral-800 rounded-2xl p-6 bg-neutral-950/60">
                <h3 className="text-lg font-semibold mb-2">Ups – ein Fehler ist passiert</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Die Ansicht konnte nicht gerendert werden. Du kannst zurückgehen oder neu laden.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-white text-black font-semibold py-2 rounded-xl hover:bg-gray-200 transition-colors"
                    onClick={() => {
                      this.setState({ hasError: false, error: null });
                      try { this.props.onReset && this.props.onReset(); } catch (e) {}
                    }}
                  >
                    Zurück
                  </button>
                  <button
                    className="flex-1 bg-neutral-800 text-white font-semibold py-2 rounded-xl hover:bg-neutral-700 transition-colors"
                    onClick={() => window.location.reload()}
                  >
                    Neu laden
                  </button>
                </div>
                <details className="mt-4">
                  <summary className="text-xs text-neutral-500 cursor-pointer">Details</summary>
                  <pre className="mt-2 text-[10px] text-neutral-400 whitespace-pre-wrap break-words">{String(this.state.error || '')}</pre>
                </details>
              </div>
            </div>
          );
        }
        return this.props.children;
      }
    }


// ===== Build marker (v9) =====
console.log('[Onyx-Kalender] build v24 loaded @', new Date().toISOString());

// Ensure isGroupChat is always available (avoids hoisting/scope issues)
window.isGroupChat = window.isGroupChat || function(chat) {
  try {
    if (!chat) return false;
    if (chat.type === 'group') return true;
    return Array.isArray(chat.participants) && chat.participants.length > 2;
  } catch (e) { return false; }
};


    // --- Robust helper functions (v20) ---
    function safeTrim(v) {
      return (v ?? "").toString().trim();
    }
    function initialsFrom(nameOrEmail) {
      const s = safeTrim(nameOrEmail);
      if (!s) return "??";
      const parts = s.split(/\s+/).filter(Boolean);
      const first = (parts[0] || "");
      const second = (parts[1] || "");
      const a = first.charAt(0);
      const b = (second.charAt(0) || first.charAt(1));
      const out = (a + b).toUpperCase();
      return out || "??";
    }

function AmoledCalendarApp() {
  

      // Fix: keep app height in sync (prevents white area at bottom in some browsers)
      useEffect(() => {
        const setAppHeight = () => {
          document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        };
        setAppHeight();
        window.addEventListener('resize', setAppHeight);
        window.addEventListener('orientationchange', setAppHeight);
        return () => {
          window.removeEventListener('resize', setAppHeight);
          window.removeEventListener('orientationchange', setAppHeight);
        };
      }, []);

// Stable alias
  const isGroupChat = window.isGroupChat;

      const [isAppReady, setIsAppReady] = useState(false);
      const [user, setUser] = useState(null);
      const [isLoggedIn, setIsLoggedIn] = useState(false);
      
      const [isRegistering, setIsRegistering] = useState(false);
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [fullName, setFullName] = useState('');
      const [authError, setAuthError] = useState('');
      
      const [currentView, setCurrentView] = useState('dashboard');
      const [currentDate, setCurrentDate] = useState(new Date());
      
      const [weather, setWeather] = useState(null);
      const [dailyForecast, setDailyForecast] = useState(null);
      const [location, setLocation] = useState({ name: 'Oberbüren, SG', lat: 47.45, lon: 9.11 });
      const [dailyFact, setDailyFact] = useState('');
      const [quotes, setQuotes] = useState([]);
      
      const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
      const [searchQuery, setSearchQuery] = useState('');
      const [searchResults, setSearchResults] = useState([]);

      // --- BILD-VOLLBILD VIEWER ---
      const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
      const [imageViewerSrc, setImageViewerSrc] = useState(null);

      const openImageViewer = (src) => {
        if (!src) return;
        setImageViewerSrc(src);
        setIsImageViewerOpen(true);
      };

      const closeImageViewer = () => {
        setIsImageViewerOpen(false);
        setImageViewerSrc(null);
      };

      useEffect(() => {
        if (!isImageViewerOpen) return;
        const onKey = (e) => {
          if (e.key === 'Escape') closeImageViewer();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [isImageViewerOpen]);

      // --- KALENDER & SCHICHTEN STATES ---
      const [events, setEvents] = useState([]); // Default private events
      const [customCalendars, setCustomCalendars] = useState([]);
      const [sharedEventsMap, setSharedEventsMap] = useState({}); // { calId: [events] }
      
      const [activeCalendarId, setActiveCalendarId] = useState('default');
      const [visibleCalendars, setVisibleCalendars] = useState(['default']);
      
      const [isModalOpen, setIsModalOpen] = useState(false);

const [showEventComments, setShowEventComments] = useState(false);
const [showEventPoll, setShowEventPoll] = useState(false);

const [eventComments, setEventComments] = useState([]);
const [newCommentText, setNewCommentText] = useState('');
const eventCommentsUnsubRef = useRef(null);

const [pollDraft, setPollDraft] = useState([
  { date: '', time: '' },
  { date: '', time: '' },
  { date: '', time: '' }
]);
const [pollBusy, setPollBusy] = useState(false);
      const [selectedDateForEvent, setSelectedDateForEvent] = useState(null);
      const [eventToEdit, setEventToEdit] = useState(null);
      const [calendarViewMode, setCalendarViewMode] = useState('month'); // 'month' | 'agenda'
      const [calendarSearchQuery, setCalendarSearchQuery] = useState('');
      const [agendaRange, setAgendaRange] = useState('7'); // '7' | '30' | 'month'
      const [eventEditScope, setEventEditScope] = useState('series'); // 'series' | 'single'


      const [eventForm, setEventForm] = useState({
        title: '',
        date: '',
        time: '',
        type: 'Privat',
        desc: '',
        // Reminder per Termin: 'default' | 'none' | 'custom'
        reminderMode: 'default',
        reminderMinutes: 15,
        calendarId: 'default',
        recurrenceFreq: 'NONE',
        recurrenceInterval: 1,
        recurrenceByWeekdays: [],
        recurrenceUntil: ''
      });

      const [isCalManageModalOpen, setIsCalManageModalOpen] = useState(false);
      const [calForm, setCalForm] = useState({ id: null, name: '', type: 'normal', shifts: [] });
      
      const [isShareCalModalOpen, setIsShareCalModalOpen] = useState(false);
      const [shareCalData, setShareCalData] = useState(null);
      const [shareUsername, setShareUsername] = useState('');
      const [sharePerm, setSharePerm] = useState('read');

      // NEU: Pinsel Tool & Langes Drücken
      const [isPaintbrushActive, setIsPaintbrushActive] = useState(false);
      const [selectedPaintShift, setSelectedPaintShift] = useState(null);
      const [shiftModalData, setShiftModalData] = useState(null); // { dateStr, calId, shifts }
      const isPaintingRef = useRef(false);
      const paintedDaysRef = useRef(new Set());

      // --- GEHEIMER CHAT STATES ---
      const [secretView, setSecretView] = useState('list');
      const [userProfile, setUserProfile] = useState(null);
      const dashboardName = (userProfile && (userProfile.displayName || userProfile.username)) ? (userProfile.displayName || userProfile.username) : (user?.email ? user.email.split('@')[0] : '');
      const todayKey = new Date().toISOString().split('T')[0];
      const [allProfiles, setAllProfiles] = useState([]);
      const [chatSearchQuery, setChatSearchQuery] = useState('');
      const [chatFriendResult, setChatFriendResult] = useState(null);
      const [chatFriendLoading, setChatFriendLoading] = useState(false);
      const [chatFriendError, setChatFriendError] = useState('');
      const chatFriendLookupTimer = useRef(null);

      const [myChats, setMyChats] = useState([]);
      const [activeChat, setActiveChat] = useState(null);
      const [chatMessages, setChatMessages] = useState([]);
      const [newMessageText, setNewMessageText] = useState('');
const [editingMessage, setEditingMessage] = useState(null);
      const [selectedMessageId, setSelectedMessageId] = useState(null); 
      const [selfDestruct, setSelfDestruct] = useState(false);
      const [isShareEventModalOpen, setIsShareEventModalOpen] = useState(false);
      
      const [isRecording, setIsRecording] = useState(false);
      const mediaRecorderRef = useRef(null);
      const audioChunksRef = useRef([]);

      const typingTimeoutRef = useRef(null);
      const messagesEndRef = useRef(null);
      
      const [chatStats, setChatStats] = useState({ sent: 0, received: 0, total: 0 });
      const [showPartnerStats, setShowPartnerStats] = useState(false);

      const [showCreateGroup, setShowCreateGroup] = useState(false);
      const [groupDraftName, setGroupDraftName] = useState('');
      const [groupDraftMembers, setGroupDraftMembers] = useState([]); // array of userIds
      const [groupMemberSearch, setGroupMemberSearch] = useState('');
      const [groupEditSearch, setGroupEditSearch] = useState('');
      const lastReadWriteRef = useRef(0);
      const presenceHeartbeatRef = useRef(null);

      const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
      const [messageSearchQuery, setMessageSearchQuery] = useState('');
      const [messageMatchIndex, setMessageMatchIndex] = useState(0);


      const [lastChatVisit, setLastChatVisit] = useState(() => {
        const stored = localStorage.getItem('onyx_last_chat_visit');
        return stored ? parseInt(stored, 10) : 0;
      });

      const [toasts, setToasts] = useState([]);
      const pressTimer = useRef(null);
      const isLongPressAction = useRef(false);
      const secretPressTimer = useRef(null);
      const secretGateTriggered = useRef(false);

      const [isRefreshing, setIsRefreshing] = useState(false);
      const [pullDistance, setPullDistance] = useState(0);
      const touchStartY = useRef(0);
      const touchCurrentY = useRef(0);


// --- PULL TO REFRESH (GLOBAL TOUCH) ---
const mainRef = useRef(null);
const canPullRef = useRef(false);

const handleGlobalTouchStart = (e) => {
  if (!e.touches || e.touches.length === 0) return;
  touchStartY.current = e.touches[0].clientY;
  touchCurrentY.current = touchStartY.current;
  setPullDistance(0);

  // Nur ziehen, wenn der Scroll-Container oben ist
  const atTop = (mainRef.current?.scrollTop ?? 0) <= 0;
  canPullRef.current = atTop && !isRefreshing;
};

const handleGlobalTouchMove = (e) => {
  if (!canPullRef.current || isRefreshing) return;
  if (!e.touches || e.touches.length === 0) return;

  touchCurrentY.current = e.touches[0].clientY;
  const delta = touchCurrentY.current - touchStartY.current;

  if (delta > 0) {
    // iOS / mobile: verhindern, dass der Browser selbst "bounce" scrollt
    // React registriert Touch-Events oft als passive -> preventDefault würde warnen
    const cancelable = (e?.cancelable ?? e?.nativeEvent?.cancelable);
    if (cancelable !== false && typeof e.preventDefault === 'function') e.preventDefault();
    setPullDistance(Math.min(delta, 120));
  } else {
    setPullDistance(0);
  }
};

const handleGlobalTouchEnd = async () => {
  if (!canPullRef.current) { setPullDistance(0); return; }
  canPullRef.current = false;

  const shouldRefresh = pullDistance >= 80;
  setPullDistance(0);

  if (!shouldRefresh || isRefreshing) return;

  try {
    setIsRefreshing(true);
    await fetchWeather();
    showToast("Aktualisiert");
  } catch (_) {
    // ignore
  } finally {
    setIsRefreshing(false);
  }
};

// --- MODALS / ACTIONS (fehlende Handler) ---
const openNewEventModal = (dateStr = null) => {
  const d = dateStr || new Date().toISOString().split('T')[0];

  // Default: aktiven Kalender nutzen, wenn er ein normaler Kalender mit Schreibrechten ist
  let targetCalId = 'default';
  try {
    const activeCal = getCalendarById(activeCalendarId);
    const canWriteActive =
      activeCal &&
      activeCal.id !== 'default' &&
      activeCal.type !== 'shift' &&
      (activeCal.ownerId === user?.uid || activeCal.sharedWith?.[user?.uid] === 'write');

    if (canWriteActive) targetCalId = activeCal.id;
  } catch (_) {}

  setEventToEdit(null);
  setEventEditScope('series');
  setSelectedDateForEvent(d);
  setEventForm({
    title: '',
    date: d,
    time: '',
    type: 'Privat',
    desc: '',
    reminderMode: 'default',
    reminderMinutes: 15,
    calendarId: targetCalId,
    recurrenceFreq: 'NONE',
    recurrenceInterval: 1,
    recurrenceByWeekdays: [],
    recurrenceUntil: ''
  });
setShowEventComments(false);
setShowEventPoll(false);
setEventComments([]);
setNewCommentText('');
initPollDraftFromEvent({ date: d, time: '', calendarId: targetCalId });
  setIsModalOpen(true);
};

const persistDisplayName = async (rawName, opts = {}) => {
  if (!user) return;
  const uname = String(rawName || '').trim();
  if (!uname) return showToast('Bitte Namen eingeben');
  if (uname.length < 2) return showToast('Name zu kurz');
  if (uname.length > 40) return showToast('Max. 40 Zeichen');

  try {
    const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid);
    const dataToSave = {
      displayName: uname,
      username: uname.slice(0, 20), // legacy compatibility
      uid: user.uid,
      email: user.email,
      emailLower: (user.email || '').toLowerCase(),
      updatedAt: Date.now(),
    };
    if (opts && opts.avatarThumbBase64) {
      dataToSave.avatarThumbBase64 = opts.avatarThumbBase64;
      dataToSave.avatarBase64 = opts.avatarThumbBase64; // legacy
    }
    if (opts && opts.avatarFullBase64) dataToSave.avatarFullBase64 = opts.avatarFullBase64;
    if (opts && opts.avatarBase64 && !dataToSave.avatarBase64) dataToSave.avatarBase64 = opts.avatarBase64;

    await setDoc(profileRef, dataToSave, { merge: true });
    try { await updateProfile(auth.currentUser, { displayName: uname }); } catch (_) {}

    // UI sofort aktualisieren + lokale Fallbacks
    try { setUserProfile(prev => ({ ...(prev || {}), ...dataToSave })); } catch (_) {}
    try {
      localStorage.setItem(`onyx_displayName_${user.uid}`, uname);
      localStorage.setItem(`onyx_username_${user.uid}`, dataToSave.username);
    } catch (_) {}

    // Best-effort: displayName in bestehenden Chats aktualisieren (damit es überall konsistent ist)
    try {
      const updates = myChats.slice(0, 75).map(c => {
        if (!c?.id) return null;
        return updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', c.id), { [`displayNames.${user.uid}`]: uname }).catch(()=>{});
      }).filter(Boolean);
      await Promise.all(updates);
    } catch (_) {}

    showToast((opts && opts.toast) ? opts.toast : 'Profil gespeichert');
  } catch (err) {
    console.error('persistDisplayName failed', err);
    showToast('Fehler beim Speichern');
  }
};

const saveUsername = async (e) => {
  e.preventDefault();
  if (!user) return;
  const unameRaw = new FormData(e.target).get('username') || '';
  const uname = String(unameRaw).trim();
  await persistDisplayName(uname, { toast: 'Profil gespeichert' });
};


// --- PROFILE BOOTSTRAP (bombensicher) ---
const ensureProfileAfterAuth = async (authUser, opts = {}) => {
  try {
    if (!authUser || !authUser.uid) return;
    const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', authUser.uid);
    const snap = await getDoc(profileRef);
    const existing = snap.exists() ? snap.data() : null;

    const emailVal = authUser.email || (existing && existing.email) || '';
    const base = (emailVal ? emailVal.split('@')[0] : 'user')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 12) || 'user';
    const suffix = String(authUser.uid).slice(0, 4);
    const autoUsername = `${base}_${suffix}`.slice(0, 20);

    const next = {
      uid: authUser.uid,
      email: emailVal,
      emailLower: (emailVal || '').toLowerCase(),
      updatedAt: Date.now(),
    };
    // displayName setzen (für Begrüßung). Nur überschreiben, wenn leer/kurz.
    const desiredName = (opts && opts.fullName) ? String(opts.fullName).trim() : '';
    if (desiredName && desiredName.length >= 2 && (!existing || !existing.displayName || String(existing.displayName).trim().length < 2)) {
      next.displayName = desiredName.slice(0, 40);
      // legacy: auch username setzen, falls nicht vorhanden (UI nutzt teils noch username)
      if ((!existing || !existing.username || String(existing.username).trim().length < 2) && !next.username) {
        next.username = next.displayName.slice(0, 20);
      }
    }

    // 5-stellige Chat-ID (friendCode) erzeugen, wenn fehlt (bombensicher, ohne Full-Scan)
    const normalizeFriendCode = (v) => {
      const s = String(v ?? '').trim();
      if (/^\d{5}$/.test(s)) return s;
      if (/^\d+$/.test(s)) {
        try { return String(parseInt(s, 10)).padStart(5, '0'); } catch(e) { return ''; }
      }
      return '';
    };

    if (!existing || !normalizeFriendCode(existing.friendCode)) {
      let claimed = '';
      for (let i = 0; i < 25 && !claimed; i++) {
        const candidate = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
        const codeRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'friendCodes', candidate);
        try {
          await runTransaction(db, async (tx) => {
            const ds = await tx.get(codeRef);
            if (ds.exists()) throw new Error('CODE_TAKEN');
            tx.set(codeRef, { uid: authUser.uid, createdAt: Date.now() });
          });
          claimed = candidate;
        } catch (e) {
          const code = String(e?.code || '');
          const msg = String(e?.message || '');
          // Wenn friendCodes wegen Rules nicht erlaubt ist, fallback auf random ohne Reservierung
          if (code === 'permission-denied' || msg.toLowerCase().includes('permission')) {
            // friendCodes-Registry nicht erlaubt -> uniqueness best-effort über profiles Query
            try {
              const profilesCol = collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles');
              const q2 = query(profilesCol, where('friendCode', '==', candidate), limit(1));
              const s2 = await getDocs(q2);
              if (s2.empty) {
                claimed = candidate;
                break;
              }
              // sonst weiter versuchen
            } catch (_) {
              // im Zweifel trotzdem setzen
              claimed = candidate;
              break;
            }
          }
          // sonst: erneut versuchen
        }
      }
      if (!claimed) claimed = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
      next.friendCode = claimed;
      next.createdAt = existing && existing.createdAt ? existing.createdAt : Date.now();
    } else {
      next.friendCode = normalizeFriendCode(existing.friendCode);
    }


    // username nur setzen, wenn fehlt/leer
    if (!existing || !existing.username || String(existing.username).trim().length < 2) {
      next.username = autoUsername;
      next.createdAt = existing && existing.createdAt ? existing.createdAt : Date.now();
    }

    await setDoc(profileRef, next, { merge: true });
    // local fallback (falls Firestore offline/hakt)
    try { localStorage.setItem(`onyx_username_${authUser.uid}`, (next.username || existing?.username || ''));
      localStorage.setItem(`onyx_displayName_${authUser.uid}`, (next.displayName || existing?.displayName || next.username || existing?.username || ''));
      localStorage.setItem(`onyx_friendCode_${authUser.uid}`, (next.friendCode || existing?.friendCode || ''));
    } catch(_) {}
  } catch (e) {
    console.warn("ensureProfileAfterAuth failed", e);
  }
};

// --- EVENT CRUD (Modal) ---
const closeEventModal = () => {
  setIsModalOpen(false);
  setShowEventComments(false);
  setShowEventPoll(false);
  setEventComments([]);
  setNewCommentText('');
  setEventToEdit(null);
  setEventEditScope('series');
};


// --- EVENT: Kommentare & Abstimmung (Phase 2) ---
const initPollDraftFromEvent = (ev) => {
  const baseDate = (ev && ev.date) ? ev.date : new Date().toISOString().split('T')[0];
  const baseTime = (ev && ev.time) ? ev.time : '18:00';
  setPollDraft([
    { date: baseDate, time: baseTime },
    { date: addDaysStr(baseDate, 1), time: baseTime },
    { date: addDaysStr(baseDate, 2), time: baseTime },
  ]);
};

const countVotes = (votesObj) => {
  const votes = (votesObj && typeof votesObj === 'object') ? votesObj : {};
  const out = {};
  for (const v of Object.values(votes)) {
    if (!v) continue;
    out[v] = (out[v] || 0) + 1;
  }
  return out;
};

const computePollVoterIdsForEvent = (ev) => {
  if (!user) return [];
  const calId = (ev && ev.calendarId) ? ev.calendarId : 'default';
  if (calId === 'default') return [user.uid];

  const cal = getCalendarById(calId);
  const voters = new Set();
  if (cal && cal.ownerId) voters.add(cal.ownerId);

  // Nur "write" Mitglieder voten lassen, damit Firestore Rules nicht geöffnet werden müssen
  if (cal && cal.sharedWith && typeof cal.sharedWith === 'object') {
    for (const [uid, perm] of Object.entries(cal.sharedWith)) {
      if (perm === 'write') voters.add(uid);
    }
  }

  voters.add(user.uid);
  return Array.from(voters).filter(Boolean);
};

const sendEventComment = async () => {
  if (!user || !eventToEdit) return;
  const txt = (newCommentText || '').trim();
  if (!txt) return;

  const calId = eventToEdit.calendarId || 'default';
  if (calId !== 'default' && !canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  try {
    const ref = collection(eventDocRefFor(calId, eventToEdit.id), 'comments');
    await addDoc(ref, {
      text: txt,
      senderId: user.uid,
      senderName: (userProfile && (userProfile.displayName || userProfile.username)) ? (userProfile.displayName || userProfile.username) : (user.email ? user.email.split('@')[0] : 'User'),
      timestamp: Date.now(),
    });
    setNewCommentText('');
  } catch (e) {
    showToast("Kommentar konnte nicht gesendet werden");
  }
};

useEffect(() => {
  // Live comments only while modal open and panel visible
  if (!user || !isModalOpen || !showEventComments || !eventToEdit) {
    if (eventCommentsUnsubRef.current) {
      try { eventCommentsUnsubRef.current(); } catch(_) {}
      eventCommentsUnsubRef.current = null;
    }
    return;
  }

  const calId = eventToEdit.calendarId || 'default';
  // Comments schreiben nur wenn write; lesen ist i.d.R. erlaubt
  const qref = query(
    collection(eventDocRefFor(calId, eventToEdit.id), 'comments'),
    orderBy('timestamp', 'asc'),
    limit(200)
  );

  const unsub = onSnapshot(qref, (snap) => {
    const arr = [];
    snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
    setEventComments(arr);
  }, () => {});
  eventCommentsUnsubRef.current = unsub;

  return () => {
    try { unsub(); } catch(_) {}
    if (eventCommentsUnsubRef.current === unsub) eventCommentsUnsubRef.current = null;
  };
}, [user?.uid, isModalOpen, showEventComments, eventToEdit?.id, eventToEdit?.calendarId]);

const createPollForEvent = async () => {
  if (!user || !eventToEdit) return;
  const calId = eventToEdit.calendarId || 'default';
  if (calId !== 'default' && !canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  const opts = (pollDraft || []).map((o, idx) => ({
    id: `opt_${Date.now()}_${idx}`,
    date: (o?.date || '').trim(),
    time: (o?.time || '').trim(),
  })).filter(o => o.date && o.time);

  if (opts.length < 2) return showToast("Bitte mind. 2 Vorschläge");

  const voterIds = computePollVoterIdsForEvent(eventToEdit);

  setPollBusy(true);
  try {
    await updateDoc(eventDocRefFor(calId, eventToEdit.id), {
      poll: {
        status: 'open',
        createdAt: Date.now(),
        createdBy: user.uid,
        voterIds,
        options: opts,
        votes: {},
        winnerOptionId: null,
        closedAt: null,
        autoFinalized: false,
      },
      updatedAt: Date.now()
    });
    showToast("Abstimmung gestartet");
  } catch (e) {
    showToast("Abstimmung konnte nicht erstellt werden");
  } finally {
    setPollBusy(false);
  }
};

const voteInPoll = async (optionId) => {
  if (!user || !eventToEdit) return;
  const calId = eventToEdit.calendarId || 'default';
  if (calId !== 'default' && !canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  try {
    await updateDoc(eventDocRefFor(calId, eventToEdit.id), {
      [`poll.votes.${user.uid}`]: optionId,
      [`poll.votesUpdatedAt`]: Date.now(),
      updatedAt: Date.now()
    });
  } catch (e) {
    showToast("Vote fehlgeschlagen");
  }
};

const finalizePollForEvent = async () => {
  if (!user || !eventToEdit) return;
  const calId = eventToEdit.calendarId || 'default';
  if (calId !== 'default' && !canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  setPollBusy(true);
  try {
    await runTransaction(db, async (tx) => {
      const ref = eventDocRefFor(calId, eventToEdit.id);
      const snap = await tx.get(ref);
      if (!snap.exists()) return;

      const ev = snap.data() || {};
      const poll = ev.poll || null;
      if (!poll || poll.status !== 'open') return;

      const voterIds = Array.isArray(poll.voterIds) ? poll.voterIds : computePollVoterIdsForEvent({ ...eventToEdit, ...ev });
      const votes = (poll.votes && typeof poll.votes === 'object') ? poll.votes : {};
      if (!voterIds.every((uid) => !!votes[uid])) return;

      const counts = countVotes(votes);
      let winnerId = null;
      let best = -1;
      for (const opt of (poll.options || [])) {
        const c = counts[opt.id] || 0;
        if (c > best) { best = c; winnerId = opt.id; }
      }
      const winner = (poll.options || []).find(o => o.id === winnerId);
      if (!winner) return;

      tx.update(ref, {
        date: winner.date,
        time: winner.time,
        updatedAt: Date.now(),
        'poll.status': 'closed',
        'poll.winnerOptionId': winnerId,
        'poll.closedAt': Date.now(),
        'poll.autoFinalized': false
      });
    });
    showToast("Gewinner übernommen");
  } catch (e) {
    showToast("Finalisieren fehlgeschlagen");
  } finally {
    setPollBusy(false);
  }
};

const canWriteCalendar = (calId) => {
  if (calId === 'default') return true;
  const cal = customCalendars.find(c => c.id === calId);
  if (!cal) return false;
  return cal.ownerId === user?.uid || cal.sharedWith?.[user?.uid] === 'write';
};

const eventCollectionRefFor = (calId) => {
  if (!user) return null;
  if (calId === 'default') {
    return collection(db, 'artifacts', APP_ID, 'users', user.uid, 'events');
  }
  return collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId, 'events');
};

const eventDocRefFor = (calId, eventId) => {
  if (!user) return null;
  if (calId === 'default') {
    return doc(db, 'artifacts', APP_ID, 'users', user.uid, 'events', eventId);
  }
  return doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId, 'events', eventId);
};

const saveEvent = async (e) => {
  e.preventDefault();
  if (!user) return;

  const title = (eventForm.title || '').trim();
  if (!title) return showToast("Titel fehlt");
  if (!eventForm.date) return showToast("Datum fehlt");

  const timeVal = (eventForm.time || '').trim();
  const typeVal = (eventForm.type || 'Privat').trim();
  const descVal = (eventForm.desc || '').trim();

  const reminderModeVal = (eventForm.reminderMode || 'default');
  const reminderMinutesVal = (reminderModeVal === 'custom') ? Math.max(0, parseInt(eventForm.reminderMinutes || 0, 10) || 0) : null;

  const targetCalId = eventForm.calendarId || 'default';
  if (targetCalId !== 'default') {
    const cal = getCalendarById(targetCalId);
    if (!cal) return showToast("Kalender nicht gefunden");
    if (cal.type === 'shift') return showToast("Schichtplan: keine normalen Termine");
    if (!canWriteCalendar(targetCalId)) return showToast("Keine Schreibrechte");
  }

  const isEditing = !!eventToEdit;
  const baseRec = eventToEdit ? (eventToEdit.recurrence || null) : null;
  const isRecurring = !!(baseRec && baseRec.freq && baseRec.freq !== 'NONE');
  const isInstance = !!(isEditing && isRecurring && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date);

  // Nur dieses Vorkommen ändern (Override)
  if (isInstance && eventEditScope === 'single') {
    const fromCalId = eventToEdit.calendarId || 'default';
    if (!canWriteCalendar(fromCalId)) return showToast("Keine Schreibrechte");
    try {
      const existingOverrides = (eventToEdit.overrides && typeof eventToEdit.overrides === 'object') ? eventToEdit.overrides : {};
      const nextOverrides = {
        ...existingOverrides,
        [selectedDateForEvent]: {
          title,
          time: timeVal,
          type: typeVal,
          desc: descVal,
          reminderMode: reminderModeVal,
          reminderMinutes: reminderMinutesVal
        }
      };
      const ex = Array.isArray(eventToEdit.exDates) ? eventToEdit.exDates : [];
      const nextEx = ex.filter(d => d !== selectedDateForEvent);
      await updateDoc(eventDocRefFor(fromCalId, eventToEdit.id), { overrides: nextOverrides, exDates: nextEx, updatedAt: Date.now() });
      showToast("Vorkommen gespeichert");
      closeEventModal();
    } catch (err) {
      showToast("Fehler beim Speichern");
    }
    return;
  }

  const recurrence = buildRecurrenceFromForm(eventForm);

  const payload = {
    title,
    date: eventForm.date,
    time: timeVal,
    type: typeVal,
    desc: descVal,
    reminderMode: reminderModeVal,
    reminderMinutes: reminderMinutesVal,
    updatedAt: Date.now(),
    recurrence: recurrence || null,
    exDates: isEditing ? (Array.isArray(eventToEdit.exDates) ? eventToEdit.exDates : []) : [],
    overrides: isEditing ? (eventToEdit.overrides && typeof eventToEdit.overrides === 'object' ? eventToEdit.overrides : {}) : {}
  };

  try {
    if (eventToEdit) {
      const fromCalId = eventToEdit.calendarId || 'default';
      const toCalId = targetCalId;

      if (!canWriteCalendar(fromCalId)) return showToast("Keine Schreibrechte");

      if (fromCalId === toCalId) {
        await updateDoc(eventDocRefFor(fromCalId, eventToEdit.id), payload);
        showToast("Termin gespeichert");
      } else {
        // Move between calendars: create new + delete old
        const colRef = eventCollectionRefFor(toCalId);
        await addDoc(colRef, {
          ...payload,
          createdAt: eventToEdit.createdAt || Date.now(),
          movedAt: Date.now()
        });
        await deleteDoc(eventDocRefFor(fromCalId, eventToEdit.id));
        showToast("Termin verschoben");
        setActiveCalendarId(toCalId);
      }
    } else {
      const colRef = eventCollectionRefFor(targetCalId);
      await addDoc(colRef, { ...payload, createdAt: Date.now() });
      showToast("Termin erstellt");
    }

    closeEventModal();
  } catch (err) {
    showToast("Fehler beim Speichern");
  }
};

const deleteEvent = async (mode = null) => {
  if (!eventToEdit || !user) return;
  const calId = eventToEdit.calendarId || 'default';
  if (!canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  const baseRec = eventToEdit.recurrence || null;
  const isRecurring = !!(baseRec && baseRec.freq && baseRec.freq !== 'NONE');
  const isInstance = !!(isRecurring && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date);

  // mode kann 'single' oder 'series' sein (UI setzt das explizit)
  const effectiveMode = mode || (isInstance ? eventEditScope : 'series');

  if (isInstance && effectiveMode === 'single') {
    if (!confirm("Dieses Vorkommen löschen?")) return;
    try {
      const ex = Array.isArray(eventToEdit.exDates) ? eventToEdit.exDates : [];
      const nextEx = ex.includes(selectedDateForEvent) ? ex : [...ex, selectedDateForEvent];
      const existingOverrides = (eventToEdit.overrides && typeof eventToEdit.overrides === 'object') ? eventToEdit.overrides : {};
      const { [selectedDateForEvent]: _removed, ...rest } = existingOverrides || {};
      await updateDoc(eventDocRefFor(calId, eventToEdit.id), { exDates: nextEx, overrides: rest, updatedAt: Date.now() });
      showToast("Vorkommen gelöscht");
      closeEventModal();
    } catch (err) {
      showToast("Fehler beim Löschen");
    }
    return;
  }

  if (!confirm("Termin löschen?")) return;
  try {
    await deleteDoc(eventDocRefFor(calId, eventToEdit.id));
    showToast("Termin gelöscht");
    closeEventModal();
  } catch (err) {
    showToast("Fehler beim Löschen");
  }
};


const openShiftPicker = (dateStr) => {
  const activeCal = getCalendarById(activeCalendarId);
  if (!activeCal || activeCal.type !== 'shift') return;
  if (activeCal.id !== 'default' && activeCal.ownerId !== user.uid && activeCal.sharedWith?.[user.uid] !== 'write') {
    return showToast("Nur Lesezugriff auf diesen Kalender.");
  }
  if (!activeCal.shifts || activeCal.shifts.length === 0) return showToast("Keine Schichten konfiguriert.");
  setShiftModalData({ dateStr, calId: activeCal.id, shifts: activeCal.shifts });
};

// --- GEHEIMER CHAT (Long Press auf Tag-Zahl 5 für 3s) ---
const startSecretGate = () => {
  secretGateTriggered.current = false;
  if (secretPressTimer.current) clearTimeout(secretPressTimer.current);
  secretPressTimer.current = setTimeout(() => {
    secretGateTriggered.current = true;
    setActiveChat(null);
    setSecretView('list');
    setCurrentView('secret_chat');
  }, 3000);
};

const endSecretGate = () => {
  if (secretPressTimer.current) {
    clearTimeout(secretPressTimer.current);
    secretPressTimer.current = null;
  }
};

// Long-Press auf Tag (mobile) -> Shift-Auswahl (ersetzt ContextMenu)
const handleTouchStart = (dateStr) => {
  isLongPressAction.current = false;
  if (pressTimer.current) clearTimeout(pressTimer.current);
  pressTimer.current = setTimeout(() => {
    isLongPressAction.current = true;
    openShiftPicker(dateStr);
  }, 550);
};

const handleTouchEnd = () => {
  if (pressTimer.current) {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }
};

      const activeChatData = activeChat ? myChats.find(c => c.id === activeChat.id) : null;

      const getTypingUsers = (chat) => {
        if (!chat || !chat.typing) return [];
        const now = Date.now();
        const typingMap = chat.typing || {};
        const typingAt = chat.typingAt || {};
        return Object.keys(typingMap).filter(uid => uid !== user?.uid && typingMap[uid] === true && (now - (typingAt[uid] || 0) < 6500));
      };

      const partnerId = activeChatData && !isGroupChat(activeChatData) ? activeChatData.participants.find(id => id !== user?.uid) : null;
      const isPartnerTyping = activeChatData ? (getTypingUsers(activeChatData).length > 0) : false;

      const refreshDailyFact = () => {
        const list = (quotes && quotes.length) ? quotes : DEFAULT_QUOTES;
        const q = list[Math.floor(Math.random() * list.length)];
        setDailyFact(q);
        try { localStorage.setItem('onyx_quote_override', q); localStorage.setItem('onyx_quote_override_day', todayKey); } catch(e) {}
      };


      const pinnedChatIds = (userProfile && Array.isArray(userProfile.pinnedChats)) ? userProfile.pinnedChats : [];
      const sortedMyChats = [...myChats].sort((a, b) => {
        const ap = pinnedChatIds.includes(a.id) ? 1 : 0;
        const bp = pinnedChatIds.includes(b.id) ? 1 : 0;
        if (bp !== ap) return bp - ap;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });

      const messageMatches = (isMessageSearchOpen && (messageSearchQuery || '').trim())
        ? chatMessages.filter(m => (m.text || '').toLowerCase().includes((messageSearchQuery || '').trim().toLowerCase()))
        : [];


      useEffect(() => {
        const dayKey = new Date().toISOString().split('T')[0];
        // Optionaler Override (User klickt "Neuer Spruch")
        try {
          const od = localStorage.getItem('onyx_quote_override_day');
          const oq = localStorage.getItem('onyx_quote_override');
          if (od === dayKey && oq) setDailyFact(oq);
        } catch (e) {}

        const loadQuotes = async () => {
          try {
            const res = await fetch(QUOTES_URL, { cache: 'no-store' });
            const data = await res.json();
            const list = Array.isArray(data) ? data : (Array.isArray(data.quotes) ? data.quotes : []);
            setQuotes(list);
            const q = pickQuoteForDay(list, dayKey);
            setDailyFact(q);
          } catch (e) {
            const q = pickQuoteForDay(DEFAULT_QUOTES, dayKey);
            setDailyFact(q);
          }
        };
        loadQuotes();

        
const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
  setUser(currentUser);
  setIsLoggedIn(!!currentUser);
  setIsAppReady(true);

  if (currentUser) {
    // Profil immer sicherstellen (nach Reset/neu)
    (async () => {
      await ensureProfileAfterAuth(currentUser);
      try { requestNotificationPermission(currentUser); } catch(_) {}
    })();
  } else {
    setEvents([]); setUserProfile(null); setMyChats([]); setCustomCalendars([]);
    setCurrentView('dashboard');
  }
});

        return () => unsubscribeAuth();
      }, []);

      // --- PRESENCE (online/offline + last seen) ---
      useEffect(() => {
        if (!user) return;
        const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid);
        const setPresence = (status) => {
          setDoc(profileRef, { presenceStatus: status, presenceLastSeen: Date.now() }, { merge: true }).catch(()=>{});
        };
        setPresence('online');
        const onVisibility = () => {
          if (document.visibilityState === 'visible') setPresence('online');
          else setPresence('offline');
        };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('beforeunload', () => { try { setPresence('offline'); } catch(e) {} });
        if (presenceHeartbeatRef.current) clearInterval(presenceHeartbeatRef.current);
        presenceHeartbeatRef.current = setInterval(() => {
          if (document.visibilityState === 'visible') setPresence('online');
        }, 25000);
        return () => {
          document.removeEventListener('visibilitychange', onVisibility);
          if (presenceHeartbeatRef.current) { clearInterval(presenceHeartbeatRef.current); presenceHeartbeatRef.current = null; }
        };
      }, [user]);

      useEffect(() => {
        if (currentView === 'secret_chat') {
          const now = Date.now();
          setLastChatVisit(now);
          localStorage.setItem('onyx_last_chat_visit', now.toString());
        } else {
          setSecretView('list');
          setActiveChat(null);
        }
      }, [currentView]);

      // Message Search Reset
      useEffect(() => {
        setIsMessageSearchOpen(false);
        setMessageSearchQuery('');
        setMessageMatchIndex(0);
      }, [activeChat?.id, secretView]);

      useEffect(() => {
        setMessageMatchIndex(0);
      }, [messageSearchQuery]);

      useEffect(() => {
        if (!isMessageSearchOpen) return;
        const q = (messageSearchQuery || '').trim().toLowerCase();
        if (!q) return;
        const matches = chatMessages.filter(m => (m.text || '').toLowerCase().includes(q));
        if (matches.length === 0) return;
        const idx = Math.max(0, Math.min(messageMatchIndex, matches.length - 1));
        const id = matches[idx].id;
        setTimeout(() => {
          const el = document.getElementById(`msg-${id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
      }, [messageMatchIndex, messageSearchQuery, isMessageSearchOpen, chatMessages]);


      useEffect(() => {
        setIsPaintbrushActive(false);
      }, [activeCalendarId]);

      // --- ALLGEMEINE DATEN SYNC ---
      useEffect(() => {
        if (!user) return;

        const eventsRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'events');
        const unsubscribeEvents = onSnapshot(query(eventsRef), (snapshot) => {
          const loadedEvents = [];
          snapshot.forEach((doc) => loadedEvents.push({ id: doc.id, calendarId: 'default', ...doc.data() }));
          setEvents(loadedEvents);
        });

        const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) setUserProfile({ id: docSnap.id, ...docSnap.data() });
        });

        const allProfilesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles');
        const unsubscribeAllProfiles = onSnapshot(query(allProfilesRef), (snapshot) => {
          const loaded = [];
          snapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() }));
          setAllProfiles(loaded);
        });

        const chatsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats');
        const chatsQ = query(chatsRef, where('participants', 'array-contains', user.uid));
        const unsubscribeChats = onSnapshot(chatsQ, (snapshot) => {
          const loadedChats = [];
          snapshot.forEach(doc => loadedChats.push({ id: doc.id, ...doc.data() }));
          loadedChats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          setMyChats(loadedChats);
        });

        const calRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars');

        // 🔒 Wichtig für sichere Firestore Rules:
        // Wir dürfen NICHT die komplette calendars Collection lesen und client-side filtern,
        // sonst scheitert die Query mit permission-denied.
        const ownerQ = query(calRef, where('ownerId', '==', user.uid));
        const sharedQ = query(calRef, where('sharedWith.' + user.uid, 'in', ['read', 'write']));

        let ownerCals = [];
        let sharedCals = [];

        const recomputeCals = () => {
          const byId = new Map();
          ownerCals.forEach(c => byId.set(c.id, c));
          sharedCals.forEach(c => byId.set(c.id, c));
          const merged = Array.from(byId.values());
          setCustomCalendars(merged);
          setVisibleCalendars(prev => {
            const newVisible = new Set(prev);
            merged.forEach(c => newVisible.add(c.id));
            return Array.from(newVisible);
          });
        };

        const unsubscribeOwnerCals = onSnapshot(ownerQ, (snapshot) => {
          const loaded = [];
          snapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() }));
          ownerCals = loaded;
          recomputeCals();
        });

        const unsubscribeSharedCals = onSnapshot(sharedQ, (snapshot) => {
          const loaded = [];
          snapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() }));
          sharedCals = loaded;
          recomputeCals();
        });

        return () => { unsubscribeEvents(); unsubscribeProfile(); unsubscribeAllProfiles(); unsubscribeChats(); unsubscribeOwnerCals(); unsubscribeSharedCals(); };
      }, [user]);

      // --- CHAT FRIEND LOOKUP (5-stellige Chat-ID, exakt) ---
      useEffect(() => {
        if (!user) return;
        const code = normalizeChatId(chatSearchQuery);
        // nur Ziffern + max 5
        if (code !== (chatSearchQuery || '')) {
          setChatSearchQuery(code);
          return;
        }
        if (!/^\d{5}$/.test(code)) {
          setChatFriendResult(null);
          setChatFriendError('');
          setChatFriendLoading(false);
          return;
        }
        setChatFriendLoading(true);
        setChatFriendError('');
        if (chatFriendLookupTimer.current) clearTimeout(chatFriendLookupTimer.current);
        chatFriendLookupTimer.current = setTimeout(async () => {
          try {
            const prof = await findProfileByFriendCode(code);
            if (!prof) {
              setChatFriendResult(null);
              setChatFriendError('Kein Nutzer gefunden');
            } else if (prof.id === user.uid) {
              setChatFriendResult(null);
              setChatFriendError('Das bist du selbst');
            } else {
              setChatFriendResult(prof);
              setChatFriendError('');
            }
          } catch (e) {
            console.warn('friend lookup failed', e);
            setChatFriendResult(null);
            setChatFriendError('Suche fehlgeschlagen');
          } finally {
            setChatFriendLoading(false);
          }
        }, 250);
        return () => {
          if (chatFriendLookupTimer.current) clearTimeout(chatFriendLookupTimer.current);
        };
      }, [chatSearchQuery, user]);

      // --- CUSTOM CALENDAR EVENTS SYNC ---
      useEffect(() => {
        if (!user || customCalendars.length === 0) return;
        
        const unsubscribes = customCalendars.map(cal => {
           const calEventsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', cal.id, 'events');
           return onSnapshot(query(calEventsRef), (snapshot) => {
              const evts = [];
              snapshot.forEach(doc => evts.push({ id: doc.id, calendarId: cal.id, ...doc.data() }));
              setSharedEventsMap(prev => ({ ...prev, [cal.id]: evts }));
           });
        });

        return () => unsubscribes.forEach(fn => fn());
      }, [customCalendars, user]);


      // --- CHAT MESSAGES SYNC ---
      useEffect(() => {
        if (!activeChat || !user) return;
        const messagesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages');
        const unsubscribeMessages = onSnapshot(query(messagesRef, orderBy('timestamp')), (snapshot) => {
          const loaded = [];
          const unreadToUpdate = [];
          const deliveredToUpdate = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            loaded.push({ id: doc.id, ...data });
            if (data.senderId !== user.uid && !data.read && currentView === 'secret_chat' && secretView === 'chat' && (!Array.isArray(activeChat.participants) || activeChat.participants.length <= 2)) {
              unreadToUpdate.push(doc.id);
            }
            // Zustellung markieren (1:1 Chats): sobald die Nachricht beim Empfänger ankommt
            if (data.senderId !== user.uid && !data.deliveredAt && (!Array.isArray(activeChat.participants) || activeChat.participants.length <= 2)) {
              deliveredToUpdate.push(doc.id);
            }
          });
          loaded.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          const serverIds = new Set(loaded.map(m => m.clientMsgId).filter(Boolean));
          setChatMessages(prev => {
            const pending = (prev || []).filter(m => m && m.pending && m.clientMsgId && !serverIds.has(m.clientMsgId));
            const merged = [...loaded, ...pending];
            merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            return merged;
          });

          // System-Notification für neue eingehende Nachrichten (wenn App nicht im Vordergrund ist)
          try {
            const lastMsg = loaded.length > 0 ? loaded[loaded.length - 1] : null;
            if (lastMsg && lastMsg.senderId !== user.uid) {
              const mutedChatIds = (userProfile && Array.isArray(userProfile.mutedChatIds)) ? userProfile.mutedChatIds : [];
              const isMuted = mutedChatIds.includes(activeChat.id);
              const pushEnabled = (userProfile && (userProfile.fcmTokenWeb || userProfile.fcmToken) && ('Notification' in window) && Notification.permission === 'granted');
              const key = `onyx_last_notify_${activeChat.id}`;
              const lastNotifiedTs = parseInt(localStorage.getItem(key) || '0', 10) || 0;
              const isChatForeground = (currentView === 'secret_chat' && secretView === 'chat' && document.visibilityState === 'visible');
              if (!isMuted && !pushEnabled && !isChatForeground && (lastMsg.timestamp || 0) > lastNotifiedTs) {
                const title = getChatPartnerName(activeChat);
                const preview = lastMsg.deleted ? 'Nachricht gelöscht' : (lastMsg.image ? '📷 Bild' : (lastMsg.audio ? '🎙️ Audio' : (lastMsg.event ? '📅 Termin' : (String(lastMsg.text || '').slice(0, 120) || 'Neue Nachricht'))));
                showSystemNotification(title, preview, `onyx_chat_${activeChat.id}`);
                localStorage.setItem(key, String(lastMsg.timestamp || Date.now()));
              }
            }
          } catch (e) {}

          // lastRead (für Gruppen-Read-Receipts)
          if (currentView === 'secret_chat' && secretView === 'chat' && document.visibilityState === 'visible') {
            const nowMs = Date.now();
            if (nowMs - (lastReadWriteRef.current || 0) > 5000) {
              lastReadWriteRef.current = nowMs;
              updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), { [`lastRead.${user.uid}`]: nowMs }).catch(()=>{});
            }
          }

          if (unreadToUpdate.length > 0) {
            unreadToUpdate.forEach(msgId => {
              updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages', msgId), { read: true, readAt: Date.now() }).catch(()=>{});
            });
          }

          if (deliveredToUpdate.length > 0) {
            const deliveredAt = Date.now();
            deliveredToUpdate.forEach(msgId => {
              updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages', msgId), { delivered: true, deliveredAt }).catch(()=>{});
            });
          }

          if (currentView === 'secret_chat') {
            const now = Date.now();
            setLastChatVisit(now);
            localStorage.setItem('onyx_last_chat_visit', now.toString());
          }
        }, (err) => {
          console.error('CHAT_MESSAGES_SNAPSHOT_ERROR', err);
          showToast('Chat Live-Sync Fehler');
        });
        return () => unsubscribeMessages();
      }, [activeChat, user, currentView, secretView, userProfile]);

      useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, [chatMessages, secretView]);

      useEffect(() => {
        if (secretView === 'settings' && user) {
          calculateGlobalChatStats();
        }
      }, [secretView, user, myChats]);

      const calculateGlobalChatStats = async () => {
        let sent = 0;
        let received = 0;
        for (const chat of myChats) {
          const messagesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chat.id, 'messages');
          const snap = await getDocs(messagesRef);
          snap.forEach(doc => {
            if (doc.data().senderId === user.uid) sent++;
            else received++;
          });
        }
        setChatStats({ sent, received, total: sent + received });
      };

      const requestNotificationPermission = async (currentUser) => {
        if (!currentUser) return;
        const messaging = await getMessagingSafe();
        if (!messaging) return;
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const swRegistration = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('./firebase-messaging-sw.js?v=27'));
            const token = await getToken(messaging, { 
              vapidKey: 'BKwrZYTIUNm4rIcYhwED39WT0elWB8774ObVEKrJWhRlglke_ti9Vx3PTGcHjQZJ34HJw0xRK18oO14jZBI2rJI',
              serviceWorkerRegistration: swRegistration
            });
            if (token) {
              await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', currentUser.uid), { fcmTokenWeb: token, lastWebTokenAt: Date.now() }, { merge: true });
            }
          }
        } catch (err) { console.log('FCM Error', err); }
      };

      useEffect(() => {
        let unsubscribeMessage = null;

        (async () => {
          const messaging = await getMessagingSafe();
          if (!messaging) return;
          unsubscribeMessage = onMessage(messaging, (payload) => {
          const kind = payload?.data?.kind || '';
          const chatId = payload?.data?.chatId || '';
          const title = payload?.data?.title || payload?.notification?.title || 'Neue Benachrichtigung!';
          const body = payload?.data?.body || payload?.notification?.body || '';

          // Wenn Chat stummgeschaltet ist: keine In-App Benachrichtigung
          try {
            const muted = (userProfile && Array.isArray(userProfile.mutedChatIds)) ? userProfile.mutedChatIds : [];
            if (kind === 'chat' && chatId && muted.includes(chatId)) return;
          } catch (_) {}

          // Foreground: keine In-App Toasts/Banner (UI aktualisiert sich via Firestore Listener).
          // Hinweis: Custom-Sounds sind in einer PWA nicht wählbar (nur System / stumm).
          
        });
        })();

        return () => {
          try { if (unsubscribeMessage) unsubscribeMessage(); } catch (_) {}
        };
      }, [userProfile]);

      const fetchWeather = async () => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
          const data = await res.json();
          setWeather(data.current_weather);
          setDailyForecast(data.daily);
        } catch (error) {}
      };

      useEffect(() => {
        if (isLoggedIn) fetchWeather();
      }, [location, isLoggedIn]);

      const showToast = (message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
      };


      const showSystemNotification = async (title, body, tag = 'onyx') => {
        try {
          if (typeof window === 'undefined') return;
          if (!('Notification' in window)) return;
          if (Notification.permission !== 'granted') return;

          const finalBody = (body && String(body).trim().length > 0) ? `${body}
Kalender aktuell` : 'Kalender aktuell';
          const silentMode = (userProfile && String(userProfile.notificationSoundMode||'system') === 'silent');

          const options = {
            body: finalBody,
            icon: './icon-192.png',
            badge: './icon-192.png',
            tag,
            renotify: true,
            silent: silentMode,
            ...(silentMode ? {} : { vibrate: [200, 100, 200] })
          };

          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.showNotification) {
              await reg.showNotification(title, options);
              return;
            }
          }

          // Fallback (falls kein SW verfügbar ist)
          // eslint-disable-next-line no-new
          new Notification(title, options);
        } catch (e) {}
      };

      const getWeatherIcon = (code, className = "w-8 h-8 text-white") => {
        if (code === undefined || code === null) return <Cloud className={className} />;
        if (code <= 3) return <Sun className={className} />;
        if (code >= 50 && code <= 69) return <CloudRain className={className} />;
        return <Cloud className={className} />;
      };

      const formatDayName = (dateString) => {
        const date = new Date(dateString);
        return WOCHENTAGE[date.getDay() === 0 ? 6 : date.getDay() - 1];
      };

      
const handleAuth = async (e) => {
  e.preventDefault();
  setAuthError('');
  if (!email || !password) return setAuthError('Bitte E-Mail und Passwort eingeben.');
  if (isRegistering && (!fullName || String(fullName).trim().length < 2)) return setAuthError('Bitte deinen Namen eingeben.');

  try {
    let cred = null;
    if (isRegistering) {
      cred = await createUserWithEmailAndPassword(auth, email, password);
      showToast("Erfolgreich registriert!");
    } else {
      cred = await signInWithEmailAndPassword(auth, email, password);
      showToast("Erfolgreich angemeldet!");
    }

    // Bombensicher: UID muss existieren
    const signedInUser = cred && cred.user;
    if (!signedInUser || !signedInUser.uid) {
      throw new Error("AUTH_NO_UID");
    }

    // Sofort State setzen (nicht nur auf onAuthStateChanged warten)
    setUser(signedInUser);
    setIsLoggedIn(true);

    if (isRegistering && String(fullName||'').trim().length >= 2) {
      try { await updateProfile(signedInUser, { displayName: String(fullName||'').trim() }); } catch(_) {}
    }

    await ensureProfileAfterAuth(signedInUser, { fullName: String(fullName||'').trim(), isRegistering });
  } catch (error) {
    console.error("AUTH_ERROR", error);

    const code = error && error.code ? String(error.code) : '';
    const msg = error && error.message ? String(error.message) : '';

    if (msg === "AUTH_NO_UID") {
      setAuthError("Registrierung/Login fehlgeschlagen (keine Benutzer-ID). Bitte erneut versuchen.");
      return;
    }

    switch (code) {
      case 'auth/email-already-in-use': setAuthError('Diese E-Mail wird bereits verwendet.'); break;
      case 'auth/invalid-email': setAuthError('Ungültige E-Mail-Adresse.'); break;
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password': setAuthError('E-Mail oder Passwort falsch.'); break;
      case 'auth/weak-password': setAuthError('Passwort min. 6 Zeichen.'); break;
      case 'auth/operation-not-allowed': setAuthError('Email/Passwort Login ist in Firebase Auth deaktiviert. Bitte in Firebase → Authentication → Sign-in method aktivieren.'); break;
      case 'auth/unauthorized-domain': setAuthError('Domain nicht autorisiert. In Firebase Auth → Settings → Authorized domains muss tejari49.github.io erlaubt sein.'); break;
      case 'auth/network-request-failed': setAuthError('Netzwerkfehler. Bitte Internet prüfen.'); break;
      default:
        setAuthError('Fehler: ' + (code || msg || 'Unbekannt'));
    }
  }
};


      const handleLogout = async () => {
        try {
          await signOut(auth);
          showToast("Abgemeldet");
          setEmail(''); setPassword('');
        } catch (error) {}
      };

      const handleSearchLocation = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${searchQuery}&count=5&language=de&format=json`);
          const data = await res.json();
          setSearchResults(data.results || []);
        } catch (error) {}
      };

      const selectLocation = (loc) => {
        setLocation({ name: `${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ''}`, lat: loc.latitude, lon: loc.longitude });
        setSearchResults([]); setSearchQuery('');
        showToast(`Standort: ${loc.name}`);
      };

      // --- KALENDER LOGIK ---
      const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const getFirstDayOfMonth = (date) => {
        let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1;
      };
      const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
      const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      const goToToday = () => setCurrentDate(new Date());

      // Alle Events kombiniert für die Ansicht
      const allEvents = [
        ...events, 
        ...Object.values(sharedEventsMap).flat()
      ].filter(e => visibleCalendars.includes(e.calendarId));

// Aktuelles Event im Modal aus der neuesten allEvents Liste (für Live Poll/Kommentare)
const modalEvent = eventToEdit
  ? (allEvents.find(e => e.id === eventToEdit.id && (e.calendarId || 'default') === (eventToEdit.calendarId || 'default')) || eventToEdit)
  : null;


      const getCalendarById = (id) => {
         if (id === 'default') return { id: 'default', name: 'Privat', type: 'normal', ownerId: user?.uid };
         return customCalendars.find(c => c.id === id);
      };

      const toggleCalendarVisibility = (id) => {
         setVisibleCalendars(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
      };

      // --- WIEDERHOLUNGEN (Recurrence) ---
      const pad2 = (n) => String(n).padStart(2, '0');
      const formatDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const parseDateStr = (s) => {
        const parts = String(s || '').split('-');
        const y = parseInt(parts[0] || '1970', 10);
        const m = parseInt(parts[1] || '1', 10);
        const dd = parseInt(parts[2] || '1', 10);
        return new Date(y, (m || 1) - 1, dd || 1);
      };
      const addDaysStr = (s, days) => {
        const d = parseDateStr(s);
        d.setDate(d.getDate() + days);
        return formatDateStr(d);
      };
      const daysBetween = (a, b) => Math.floor((parseDateStr(b) - parseDateStr(a)) / 86400000);
      const monthsBetween = (a, b) => {
        const da = parseDateStr(a);
        const db = parseDateStr(b);
        return (db.getFullYear() * 12 + db.getMonth()) - (da.getFullYear() * 12 + da.getMonth());
      };
      const weekdayIndexMon0 = (s) => {
        const js = parseDateStr(s).getDay(); // So=0..Sa=6
        return (js + 6) % 7; // Mo=0..So=6
      };

      const buildRecurrenceFromForm = (form) => {
        const freq = (form.recurrenceFreq || 'NONE').toUpperCase();
        if (freq === 'NONE') return null;
        const interval = Math.max(1, parseInt(form.recurrenceInterval || 1, 10) || 1);
        const untilRaw = String(form.recurrenceUntil || '').trim();
        let until = untilRaw || null;
        let byWeekdays = Array.isArray(form.recurrenceByWeekdays) ? form.recurrenceByWeekdays.map(x => parseInt(x, 10)).filter(n => !isNaN(n)) : [];
        if (freq === 'WEEKLY') {
          if (byWeekdays.length === 0 && form.date) byWeekdays = [weekdayIndexMon0(form.date)];
        } else {
          byWeekdays = [];
        }
        return { freq, interval, byWeekdays, until };
      };

      const eventOccursOn = (ev, dateStr) => {
        if (!ev || !dateStr) return false;
        if (ev.type === 'shift') return ev.date === dateStr;
        const rec = ev.recurrence || null;
        if (!rec || !rec.freq || rec.freq === 'NONE') return ev.date === dateStr;
        const start = ev.date;
        if (!start || dateStr < start) return false;
        if (rec.until && dateStr > rec.until) return false;
        const ex = Array.isArray(ev.exDates) ? ev.exDates : [];
        if (ex.includes(dateStr)) return false;
        const freq = String(rec.freq).toUpperCase();
        const interval = Math.max(1, parseInt(rec.interval || 1, 10) || 1);
        if (freq === 'DAILY') {
          const diff = daysBetween(start, dateStr);
          return diff % interval === 0;
        }
        if (freq === 'WEEKLY') {
          const diff = daysBetween(start, dateStr);
          const weekIndex = Math.floor(diff / 7);
          if (weekIndex % interval !== 0) return false;
          const w = weekdayIndexMon0(dateStr);
          const allowed = Array.isArray(rec.byWeekdays) && rec.byWeekdays.length > 0 ? rec.byWeekdays : [weekdayIndexMon0(start)];
          return allowed.includes(w);
        }
        if (freq === 'MONTHLY') {
          const mDiff = monthsBetween(start, dateStr);
          if (mDiff % interval !== 0) return false;
          return parseDateStr(start).getDate() === parseDateStr(dateStr).getDate();
        }
        return false;
      };

      const getEffectiveOccurrence = (ev, dateStr) => {
        const ov = (ev && ev.overrides && dateStr) ? ev.overrides[dateStr] : null;
        const merged = ov ? { ...ev, ...ov, date: dateStr } : { ...ev, date: dateStr };
        const hasRec = merged.recurrence && merged.recurrence.freq && merged.recurrence.freq !== 'NONE';
        if (hasRec && ev && ev.id) {
          merged._baseEvent = ev;
          merged._baseId = ev.id;
          merged._seriesStart = ev.date;
          merged._occurrenceDate = dateStr;
          merged._isInstance = dateStr !== ev.date;
          merged.id = `${ev.id}__${dateStr}`;
        } else {
          merged._baseEvent = ev;
          merged._baseId = ev && ev.id;
          merged._seriesStart = ev && ev.date;
          merged._occurrenceDate = dateStr;
          merged._isInstance = false;
        }
        return merged;
      };

      const getEventsForDate = (dateStr) => {
        if (!dateStr) return [];
        const out = [];
        for (const ev of allEvents) {
          if (!ev) continue;
          if (eventOccursOn(ev, dateStr)) {
            out.push(getEffectiveOccurrence(ev, dateStr));
          }
        }
        out.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        return out;
      };

      const getOccurrencesInRange = (startStr, endStr) => {
        if (!startStr || !endStr) return [];
        const out = [];
        let d = startStr;
        let guard = 0;
        while (d <= endStr && guard < 400) {
          const dayEvents = getEventsForDate(d);
          dayEvents.forEach(e => out.push(e));
          d = addDaysStr(d, 1);
          guard++;
        }
        return out;
      };

      // --- REMINDER ENGINE (Kalender) ---
      const remindersIndexRef = useRef([]);

      const parseDateTimeLocalMs = (dateStr, timeStr) => {
        try {
          if (!dateStr || !timeStr) return null;
          const [y, m, d] = String(dateStr).split('-').map(n => parseInt(n, 10));
          const [hh, mm] = String(timeStr).split(':').map(n => parseInt(n, 10));
          if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return null;
          return new Date(y, (m - 1), d, hh, mm, 0, 0).getTime();
        } catch (e) {
          return null;
        }
      };

      const effectiveReminderMinutes = (occ) => {
        try {
          const mode = (occ && typeof occ.reminderMode === 'string') ? occ.reminderMode : 'default';
          if (mode === 'none') return null;
          if (mode === 'custom') {
            const m = (typeof occ.reminderMinutes === 'number') ? occ.reminderMinutes : parseInt(occ.reminderMinutes || 0, 10);
            if (isNaN(m)) return null;
            return Math.max(0, m);
          }
          const def = (userProfile && typeof userProfile.defaultReminderMinutes === 'number') ? userProfile.defaultReminderMinutes : null;
          if (typeof def === 'number' && !isNaN(def)) return Math.max(0, def);
          return null;
        } catch (e) {
          return null;
        }
      };

      const buildRemindersIndex = () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const startStr = addDaysStr(today, -1);
          const endStr = addDaysStr(today, 60);
          const occs = getOccurrencesInRange(startStr, endStr)
            .filter(o => o && o.type !== 'shift');

          const now = Date.now();
          const idx = [];
          for (const occ of occs) {
            const mins = effectiveReminderMinutes(occ);
            if (mins === null) continue;
            if (!occ.time) continue;
            const startMs = parseDateTimeLocalMs(occ.date, occ.time);
            if (!startMs) continue;
            const dueMs = startMs - (mins * 60000);
            if (dueMs < (now - 60000)) continue; // zu alt
            const baseId = occ._baseId || occ.id || 'event';
            const occDate = occ._occurrenceDate || occ.date || '';
            const rid = `${baseId}__${occDate}__${startMs}__${mins}`;
            idx.push({
              rid,
              dueMs,
              startMs,
              title: occ.title || 'Termin',
              time: occ.time || '',
              calendarId: occ.calendarId || 'default',
              occDate
            });
          }
          idx.sort((a, b) => a.dueMs - b.dueMs);
          remindersIndexRef.current = idx;
        } catch (e) {
          remindersIndexRef.current = [];
        }
      };

      const fireReminderIfDue = async (item) => {
        try {
          const firedKey = `onyx_reminder_fired_${item.rid}`;
          if (localStorage.getItem(firedKey)) return;
          localStorage.setItem(firedKey, String(Date.now()));

          const calName = (item.calendarId === 'default') ? 'Privat' : (getCalendarById(item.calendarId)?.name || 'Kalender');
          const body = `${item.title}${item.time ? ' • ' + item.time : ''} • ${calName}`;

          // In-App Hinweis immer
          showToast(`⏰ ${body}`);

          // System Notification falls erlaubt
          try {
            const pushEnabled = (userProfile && (userProfile.fcmTokenWeb || userProfile.fcmToken) && ('Notification' in window) && Notification.permission === 'granted');
            // Wenn Push aktiv ist, kommt die System-Notification vom Server (oxynoti). Lokal nur als Fallback.
            if (!pushEnabled) await showSystemNotification('Erinnerung', body, `onyx_rem_${item.rid}`);
          } catch (_) {}

          try { if (navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch (_) {}
        } catch (e) {}
      };

      // Index rebuild on relevant changes
      useEffect(() => {
        if (!user) return;
        buildRemindersIndex();
      }, [user, events, sharedEventsMap, visibleCalendars, userProfile && userProfile.defaultReminderMinutes]);

      // Periodic due-check (works without long setTimeouts)
      useEffect(() => {
        if (!user) return;
        let timer = null;
        const tick = () => {
          try {
            const now = Date.now();
            const idx = remindersIndexRef.current || [];
            // check due in last 60s
            for (const item of idx) {
              if (item.dueMs <= now && item.dueMs > (now - 60000)) {
                fireReminderIfDue(item);
              }
            }
          } catch (e) {}
        };
        timer = setInterval(tick, 20000);
        tick();

        const onVis = () => {
          if (document.visibilityState === 'visible') {
            buildRemindersIndex();
            setTimeout(tick, 200);
          }
        };
        document.addEventListener('visibilitychange', onVis);

        return () => {
          if (timer) clearInterval(timer);
          document.removeEventListener('visibilitychange', onVis);
        };
      }, [user, userProfile]);



      // --- NEU: PINSEL & LANGES DRÜCKEN LOGIK ---
      const handleDayContextMenu = (e, dateStr) => {
         e.preventDefault();
         const activeCal = getCalendarById(activeCalendarId);
         if (!activeCal || activeCal.type !== 'shift') return;
         if (activeCal.id !== 'default' && activeCal.ownerId !== user.uid && activeCal.sharedWith?.[user.uid] !== 'write') {
             return showToast("Nur Lesezugriff auf diesen Kalender.");
         }
         if (!activeCal.shifts || activeCal.shifts.length === 0) return showToast("Keine Schichten konfiguriert.");
         
         setShiftModalData({ dateStr, calId: activeCal.id, shifts: activeCal.shifts });
      };

      const handleShiftModalSelect = async (shift) => {
         if (!shiftModalData) return;
         const { dateStr, calId } = shiftModalData;
         const existingShift = allEvents.find(e => e.date === dateStr && e.calendarId === calId);
         
         if (shift === 'delete') {
             if (existingShift) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId, 'events', existingShift.id));
         } else {
             if (existingShift) {
                 await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId, 'events', existingShift.id), {
                      shiftId: shift.id, title: shift.name, color: shift.color, updatedAt: Date.now()
                 });
             } else {
                 await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId, 'events'), {
                     date: dateStr, shiftId: shift.id, title: shift.name, color: shift.color, type: 'shift', updatedAt: Date.now()
                 });
             }
         }
         setShiftModalData(null);
      };

      const applyShiftPaint = async (dateStr) => {
        if (paintedDaysRef.current.has(dateStr)) return;
        paintedDaysRef.current.add(dateStr);
        
        const activeCal = getCalendarById(activeCalendarId);
        if (!activeCal || activeCal.type !== 'shift' || !selectedPaintShift) return;
        if (activeCal.ownerId !== user.uid && activeCal.sharedWith?.[user.uid] !== 'write') {
             return;
        }
        
        const existingShift = allEvents.find(e => e.date === dateStr && e.calendarId === activeCal.id);
        
        if (selectedPaintShift.id === 'delete') {
            if (existingShift) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', activeCal.id, 'events', existingShift.id));
            return;
        }

        if (existingShift) {
            if (existingShift.shiftId !== selectedPaintShift.id) {
                await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', activeCal.id, 'events', existingShift.id), {
                     shiftId: selectedPaintShift.id, title: selectedPaintShift.name, color: selectedPaintShift.color, updatedAt: Date.now()
                });
            }
        } else {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', activeCal.id, 'events'), {
                date: dateStr, shiftId: selectedPaintShift.id, title: selectedPaintShift.name, color: selectedPaintShift.color, type: 'shift', updatedAt: Date.now()
            });
        }
      };

      const handlePaintStart = (e, dateStr) => {
         if (!isPaintbrushActive || !selectedPaintShift) return;
         isPaintingRef.current = true;
         paintedDaysRef.current.clear();
         applyShiftPaint(dateStr);
      };

      const handlePaintMove = (e, dateStr) => {
         if (!isPaintbrushActive || !isPaintingRef.current) return;
         if (e.type === 'touchmove') {
             const touch = e.touches[0];
             const el = document.elementFromPoint(touch.clientX, touch.clientY);
             const targetDate = el?.getAttribute('data-date') || el?.closest('[data-date]')?.getAttribute('data-date');
             if (targetDate) applyShiftPaint(targetDate);
         } else {
             applyShiftPaint(dateStr);
         }
      };

      const handlePaintEnd = () => {
         isPaintingRef.current = false;
      };

      // Regulärer Klick auf Tag
      const handleDayClick = async (dateStr) => {
         if (isLongPressAction.current) { isLongPressAction.current = false; return; }
         
         const activeCal = getCalendarById(activeCalendarId);
         if (!activeCal) return;

         if (activeCal.id !== 'default' && activeCal.ownerId !== user.uid && activeCal.sharedWith?.[user.uid] !== 'write') {
             return showToast("Nur Lesezugriff auf diesen Kalender.");
         }

         if (activeCal.type === 'shift') {
             const existingShift = allEvents.find(e => e.date === dateStr && e.calendarId === activeCal.id);
             const shifts = activeCal.shifts || [];
             if (shifts.length === 0) return showToast("Dieser Plan hat keine Schichten.");

             if (!existingShift) {
                 await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', activeCal.id, 'events'), {
                    date: dateStr, shiftId: shifts[0].id, title: shifts[0].name, color: shifts[0].color, type: 'shift', updatedAt: Date.now()
                 });
             } else {
                 const currIndex = shifts.findIndex(s => s.id === existingShift.shiftId);
                 if (currIndex >= 0 && currIndex < shifts.length - 1) {
                     const nextShift = shifts[currIndex + 1];
                     await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', activeCal.id, 'events', existingShift.id), {
                         shiftId: nextShift.id, title: nextShift.name, color: nextShift.color, updatedAt: Date.now()
                     });
                 } else {
                     await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', activeCal.id, 'events', existingShift.id));
                 }
             }
         } else {
             openNewEventModal(dateStr);
         }
      };

      const openEditEventModal = (event, occurrenceDate = null) => {
         const baseEvent = (event && event._baseEvent) ? event._baseEvent : event;
         if (!baseEvent) return;
         const occDate = occurrenceDate || (event && event._occurrenceDate) || baseEvent.date;
         const activeCal = getCalendarById(baseEvent.calendarId);
         if (activeCal && activeCal.id !== 'default' && activeCal.ownerId !== user.uid && activeCal.sharedWith?.[user.uid] !== 'write') {
             return showToast("Nur Lesezugriff.");
         }
         if (baseEvent.type === 'shift') return;
         setEventToEdit(baseEvent);
         setSelectedDateForEvent(occDate);
         const rec = baseEvent.recurrence || null;
         const hasRec = rec && rec.freq && rec.freq !== 'NONE';
         const isInstance = !!(hasRec && occDate && baseEvent.date && occDate !== baseEvent.date);
         setEventEditScope(isInstance ? 'single' : 'series');
         const ov = (baseEvent.overrides && occDate) ? baseEvent.overrides[occDate] : null;
         const effective = ov ? { ...baseEvent, ...ov, date: occDate } : { ...baseEvent, date: occDate };
         setEventForm({
           title: effective.title || '',
           date: isInstance ? occDate : (baseEvent.date || new Date().toISOString().split('T')[0]),
           time: effective.time || '',
           type: effective.type || 'Privat',
           desc: effective.desc || '',
           reminderMode: (typeof effective.reminderMode === 'string') ? effective.reminderMode : ((typeof baseEvent.reminderMode === 'string') ? baseEvent.reminderMode : 'default'),
           reminderMinutes: (typeof effective.reminderMinutes === 'number') ? effective.reminderMinutes : (typeof baseEvent.reminderMinutes === 'number' ? baseEvent.reminderMinutes : 15),
           calendarId: baseEvent.calendarId || 'default',
           recurrenceFreq: (rec && rec.freq) ? rec.freq : 'NONE',
           recurrenceInterval: (rec && rec.interval) ? rec.interval : 1,
           recurrenceByWeekdays: (rec && Array.isArray(rec.byWeekdays)) ? rec.byWeekdays : [],
           recurrenceUntil: (rec && rec.until) ? rec.until : ''
         });
         setShowEventComments(false);
         setShowEventPoll(false);
         setEventComments([]);
         setNewCommentText('');
         initPollDraftFromEvent(baseEvent);
         setIsModalOpen(true);
      };

      // --- KALENDER EINSTELLUNGEN LOGIK ---
      const saveCalendarSettings = async (e) => {
         e.preventDefault();
         try {
             if (calForm.id) {
                 await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calForm.id), {
                     name: calForm.name, type: calForm.type, shifts: calForm.shifts
                 });
                 showToast("Kalender aktualisiert");
             } else {
                 await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars'), {
                     name: calForm.name, type: calForm.type, shifts: calForm.shifts, ownerId: user.uid, sharedWith: {}
                 });
                 showToast("Kalender erstellt");
             }
             setIsCalManageModalOpen(false);
         } catch(err) { showToast("Fehler beim Speichern des Kalenders"); }
      };

      const deleteCalendar = async (calId) => {
         if(!confirm("Kalender wirklich löschen? Alle Termine gehen verloren.")) return;
         try {
             await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId));
             if (activeCalendarId === calId) setActiveCalendarId('default');
             showToast("Kalender gelöscht");
         } catch(e) { showToast("Fehler beim Löschen"); }
      };

      const addShiftToForm = () => {
          setCalForm(prev => ({
              ...prev, 
              shifts: [...(prev.shifts || []), { id: 's'+Date.now(), name: 'Neue Schicht', time: '08:00', color: PASTEL_COLORS[0] }]
          }));
      };

      const updateShiftInForm = (id, key, value) => {
          setCalForm(prev => ({
              ...prev,
              shifts: (prev.shifts || []).map(s => s.id === id ? { ...s, [key]: value } : s)
          }));
      };

      const removeShiftFromForm = (id) => {
          setCalForm(prev => ({ ...prev, shifts: (prev.shifts || []).filter(s => s.id !== id) }));
      };

      const shareCalendar = async (e) => {
          e.preventDefault();
          if(!shareCalData) return;
          const email = shareUsername.trim().toLowerCase();
          // Kalender-Freunde werden über E-Mail hinzugefügt (nicht über Username)
          const targetProfile = await findProfileByEmailLower(email);
          if(!targetProfile) return showToast("Nutzer nicht gefunden (E-Mail prüfen)");
          if(targetProfile.id === user.uid) return showToast("Das bist du selbst.");


          try {
             await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', shareCalData.id), {
                 [`sharedWith.${targetProfile.id}`]: sharePerm
             });
             showToast(`Geteilt mit ${targetProfile.email || targetProfile.username || "Nutzer"} (${sharePerm})`);
             setShareCalData(prev => prev && prev.id === shareCalData.id ? { ...prev, sharedWith: { ...(prev.sharedWith || {}), [targetProfile.id]: sharePerm } } : prev);
             setShareUsername('');
             setIsShareCalModalOpen(false);
          } catch(err) { showToast("Fehler beim Teilen"); }
      };

      const unshareCalendar = async (calId, targetUid) => {
          try {
             const cal = customCalendars.find(c => c.id === calId);
             if (!cal) return;
             const newShared = { ...(cal.sharedWith || {}) };
             delete newShared[targetUid];
             await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId), { sharedWith: newShared });
             setShareCalData(prev => prev && prev.id === calId ? { ...prev, sharedWith: newShared } : prev);
             showToast("Freigabe entfernt");
          } catch(err) {}
      };

      const updateProfileSettings = async (e) => {
        e.preventDefault();
        if (!user) return;
        const nameRaw = new FormData(e.target).get('displayName') || new FormData(e.target).get('username') || '';
        const displayName = String(nameRaw).trim();
        await persistDisplayName(displayName, { avatarThumbBase64: userProfile?.avatarThumbBase64 || userProfile?.avatarBase64, avatarFullBase64: userProfile?.avatarFullBase64 || null, toast: 'Profil aktualisiert!' });
      };

      const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('FILE_READ_ERROR'));
          reader.readAsDataURL(file);
        } catch (e) { reject(e); }
      });

      const looksLikeHeic = (file) => {
        try {
          const name = String(file?.name || '').toLowerCase();
          const type = String(file?.type || '').toLowerCase();
          return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
        } catch (_) { return false; }
      };

      const isProbablyImageFile = (file) => {
        try {
          const type = String(file?.type || '').toLowerCase();
          if (type.startsWith('image/')) return true;
          const name = String(file?.name || '').toLowerCase();
          if (looksLikeHeic(file)) return true;
          return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name);
        } catch (_) { return false; }
      };

      const ensureJpegBlobIfHeic = async (file) => {
        if (!file || !looksLikeHeic(file)) return file;
        try {
          const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
          const blob = Array.isArray(out) ? out[0] : out;
          return blob || file;
        } catch (e) {
          console.warn('HEIC convert failed', e);
          return file;
        }
      };

      const loadImageFromDataUrl = (dataUrl) => new Promise((resolve, reject) => {
        try {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('IMAGE_DECODE_ERROR'));
          img.src = dataUrl;
        } catch (e) { reject(e); }
      });

      const compressImageFileToDataUrl = async (file, { maxDim = 1600, quality = 0.72 } = {}) => {
        const original = await readFileAsDataUrl(file);
        let img;
        try { img = await loadImageFromDataUrl(original); } catch (_) { return original; }

        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (!w || !h) return original;

        const scale = Math.min(1, maxDim / Math.max(w, h));
        const nw = Math.max(1, Math.round(w * scale));
        const nh = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = nw;
        canvas.height = nh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, nw, nh);

        // Prefer WebP when available (smaller); fallback to JPEG.
        try {
          const webp = canvas.toDataURL('image/webp', quality);
          if (webp && webp.startsWith('data:image/webp') && webp.length < original.length * 0.98) return webp;
        } catch (_) {}
        try {
          return canvas.toDataURL('image/jpeg', quality);
        } catch (_) {
          return original;
        }
      };

      const compressAvatarFileToDataUrl = async (file, { size = 256, quality = 0.82 } = {}) => {
        const original = await readFileAsDataUrl(file);
        let img;
        try { img = await loadImageFromDataUrl(original); } catch (_) { return original; }

        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (!w || !h) return original;

        const minDim = Math.min(w, h);
        const sx = Math.max(0, Math.round((w - minDim) / 2));
        const sy = Math.max(0, Math.round((h - minDim) / 2));

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        try {
          return canvas.toDataURL('image/jpeg', quality);
        } catch (_) {
          return original;
        }
      };
      const handleAvatarUpload = async (e) => {
        const file0 = e?.target?.files && e.target.files[0];
        if (!file0) return;
        try { e.target.value = ''; } catch (_) {}

        if (!isProbablyImageFile(file0)) {
          showToast('Nur Bilder unterstützt');
          return;
        }

        try {
          const file = await ensureJpegBlobIfHeic(file0);
          const thumb = await compressAvatarFileToDataUrl(file, { size: 256, quality: 0.86 });
          const full = await compressImageFileToDataUrl(file, { maxDim: 1200, quality: 0.78 });
          if (user) {
            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), {
              avatarBase64: thumb,
              avatarThumbBase64: thumb,
              avatarFullBase64: full
            }, { merge: true });
            showToast('Avatar geändert');
          }
        } catch (err) {
          console.warn('avatar compress/upload failed', err);
          showToast('Fehler bei Avatar');
        }
      };

      const getProfile = (uid) => allProfiles.find(p => p.id === uid) || null;

      function normalizeChatId(raw) { return String(raw || '').replace(/\D/g, '').slice(0, 5); }

      const findProfileByFriendCode = async (code5) => {
        const code = normalizeChatId(code5);
        if (!/^\d{5}$/.test(code)) return null;
        try {
          const profilesCol = collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles');
          // friendCode wird als String gespeichert
          const q = query(profilesCol, where('friendCode', '==', code), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0].data() || {};
            return { id: snap.docs[0].id, ...d };
          }
          // Fallback: alte Profile hatten friendCode evtl. als Number → suche über local allProfiles
          const local = (allProfiles || []).find(p => String(p.friendCode || '').padStart(5, '0') === code);
          return local || null;
        } catch (e) {
          console.warn('findProfileByFriendCode failed', e);
          const local = (allProfiles || []).find(p => String(p.friendCode || '').padStart(5, '0') === code);
          return local || null;
        }
      };

      const findProfileByEmailLower = async (emailRaw) => {
        const email = String(emailRaw || '').trim().toLowerCase();
        if (!email || !email.includes('@')) return null;
        try {
          const profilesCol = collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles');
          const q = query(profilesCol, where('emailLower', '==', email), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0].data() || {};
            return { id: snap.docs[0].id, ...d };
          }
          const local = (allProfiles || []).find(p => (p.email || '').toLowerCase() === email || (p.emailLower || '').toLowerCase() === email);
          return local || null;
        } catch (e) {
          const local = (allProfiles || []).find(p => (p.email || '').toLowerCase() === email || (p.emailLower || '').toLowerCase() === email);
          return local || null;
        }
      };

      const startChatWithProfile = async (profileOrId) => {
        if (!user) return;
        const targetUserId = (typeof profileOrId === 'string') ? profileOrId : (profileOrId && profileOrId.id);
        const targetProfile = (typeof profileOrId === 'object' && profileOrId) ? profileOrId : (targetUserId ? getProfile(targetUserId) : null);
        if (!targetUserId) return;
        if (targetUserId === user.uid) return showToast('Das bist du selbst');

        const existingChat = myChats.find(c => Array.isArray(c.participants) && c.participants.length === 2 && c.participants.includes(targetUserId));
        if (existingChat) {
          setActiveChat(existingChat);
          setChatSearchQuery('');
          setSecretView('chat');
          return;
        }

        try {
          const meName = (userProfile?.displayName || userProfile?.username || (user?.email ? user.email.split('@')[0] : 'Ich'));
          const otherName = (targetProfile?.displayName || targetProfile?.username || targetProfile?.email || 'Kontakt');
          const displayNames = { [user.uid]: meName, [targetUserId]: otherName };

          const newChat = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats'), {
            type: 'dm',
            participants: [user.uid, targetUserId],
            displayNames,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastMessageSenderId: user.uid,
            typing: {},
            typingAt: {},
            lastRead: { [user.uid]: Date.now() }
          });

          setActiveChat({ id: newChat.id, type: 'dm', participants: [user.uid, targetUserId], displayNames, updatedAt: Date.now(), lastMessageSenderId: user.uid });
        } catch (error) {
          console.error('startChatWithProfile failed', error);
          showToast('Chat konnte nicht gestartet werden');
          return;
        }

        setChatSearchQuery('');
        setSecretView('chat');
      };

      const createGroupChat = async () => {
        if (!user) return;
        const title = (groupDraftName || '').trim() || 'Gruppe';
        const members = Array.from(new Set([user.uid, ...(groupDraftMembers || [])])).filter(Boolean);
        if (members.length < 3) return showToast('Wähle mindestens 2 Mitglieder aus');
        try {
          const newChat = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats'), {
            type: 'group', title, participants: members, admins: [user.uid], createdAt: Date.now(), updatedAt: Date.now(), lastMessageSenderId: user.uid,
            typing: {}, typingAt: {}, lastRead: { [user.uid]: Date.now() }
          });
          const chatObj = { id: newChat.id, type: 'group', title, participants: members, admins: [user.uid], createdAt: Date.now(), updatedAt: Date.now(), lastMessageSenderId: user.uid };
          setActiveChat(chatObj);
          setSecretView('chat');
          setShowCreateGroup(false);
          setGroupDraftName('');
          setGroupDraftMembers([]);
          setGroupMemberSearch('');
        } catch (e) {
          showToast('Fehler beim Erstellen');
        }
      };

      const updateGroupTitle = async (chat, newTitle) => {
        if (!user || !chat) return;
        try {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chat.id), { title: (newTitle || '').trim() || 'Gruppe', updatedAt: Date.now() });
          showToast('Titel gespeichert');
        } catch (e) { showToast('Fehler'); }
      };

      const addMemberToGroup = async (chat, memberId) => {
        if (!user || !chat || !memberId) return;
        try {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chat.id), { participants: arrayUnion(memberId), updatedAt: Date.now() });
          showToast('Mitglied hinzugefügt');
        } catch(e) { showToast('Fehler'); }
      };

      const removeMemberFromGroup = async (chat, memberId) => {
        if (!user || !chat || !memberId) return;
        try {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chat.id), { participants: arrayRemove(memberId), admins: arrayRemove(memberId), updatedAt: Date.now() });
          if (memberId === user.uid) {
            setShowPartnerStats(false);
            setActiveChat(null);
            setSecretView('list');
          }
          showToast('Mitglied entfernt');
        } catch(e) { showToast('Fehler'); }
      };

      const leaveGroup = async (chat) => removeMemberFromGroup(chat, user.uid);

      const toggleAdmin = async (chat, memberId) => {
        if (!user || !chat || !memberId) return;
        const isAdmin = Array.isArray(chat.admins) && chat.admins.includes(memberId);
        try {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chat.id), { admins: isAdmin ? arrayRemove(memberId) : arrayUnion(memberId), updatedAt: Date.now() });
        } catch(e) { showToast('Fehler'); }
      };

      const isChatAdmin = (chat) => Array.isArray(chat?.admins) && chat.admins.includes(user?.uid);

      const togglePinChat = async (chatId) => {
        if (!user) return;
        try {
          const current = (userProfile && Array.isArray(userProfile.pinnedChats)) ? userProfile.pinnedChats : [];
          const next = current.includes(chatId) ? current.filter(id => id !== chatId) : [chatId, ...current];
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), { pinnedChats: next });
        } catch (e) {
          showToast("Fehler beim Pinnen");
        }
      };

      const toggleMuteChat = async (chatId) => {
        if (!user) return;
        try {
          const muted = (userProfile && Array.isArray(userProfile.mutedChatIds)) ? userProfile.mutedChatIds : [];
          const isMuted = muted.includes(chatId);
          const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid);
          await updateDoc(profileRef, { mutedChatIds: isMuted ? arrayRemove(chatId) : arrayUnion(chatId) });
          showToast(isMuted ? 'Stumm aus' : 'Chat stumm');
        } catch (e) {
          showToast('Fehler beim Stummschalten');
        }
      };


      const startRecording = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorderRef.current = new MediaRecorder(stream);
          mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => { sendMessage(null, null, reader.result); };
          };
          audioChunksRef.current = [];
          mediaRecorderRef.current.start();
          setIsRecording(true);
        } catch (err) { showToast("Mikrofon-Zugriff verweigert"); }
      };

      const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        }
      };

      const handleTyping = (e) => {
         const value = e.target.value;
         setNewMessageText(value);
         if (!activeChat || !user) return;
         updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), { [`typing.${user.uid}`]: value.length > 0, [`typingAt.${user.uid}`]: Date.now() }).catch(()=>{});
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         typingTimeoutRef.current = setTimeout(() => {
            updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), { [`typing.${user.uid}`]: false, [`typingAt.${user.uid}`]: Date.now() }).catch(()=>{});
         }, 2200);
      };

      // Keep mobile keyboard open after send/edit by aggressively re-focusing the chat input.
      const refocusChatInput = () => {
        try {
          const tryFocus = () => {
            const el = document.getElementById('chatInput');
            if (!el) return;
            try { el.focus({ preventScroll: true }); }
            catch (e) { try { el.focus(); } catch (e2) {} }
          };
          requestAnimationFrame(tryFocus);
          setTimeout(tryFocus, 30);
          setTimeout(tryFocus, 120);
        } catch (e) {}
      };

      const sendMessage = async (e, imageBase64 = null, audioBase64 = null, eventDetails = null) => {
        if (e) e.preventDefault();

        if (!activeChat || !user) return;

        // Edit existing
        if (editingMessage) {
          try {
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages', editingMessage.id), {
              text: (newMessageText || '').trim(),
              edited: true,
              editedAt: Date.now()
            });
            setEditingMessage(null);
            setNewMessageText('');
            showToast('Gespeichert');
            refocusChatInput();
          } catch (err) {
            console.error('edit message failed', err);
            showToast('Fehler beim Bearbeiten');
          }
          return;
        }

        const textVal = (newMessageText || '').trim();
        if (!textVal && !imageBase64 && !audioBase64 && !eventDetails) return;

        const clientMsgId = `${user.uid}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const payload = {
          clientMsgId,
          senderId: user.uid,
          text: textVal,
          image: imageBase64,
          audio: audioBase64,
          event: eventDetails,
          selfDestruct: !!selfDestruct,
          timestamp: Date.now(),
          createdAt: serverTimestamp(),
          read: false
        };

        // Optimistic UI (erscheint sofort)
        const optimistic = { id: `local_${clientMsgId}`, ...payload, pending: true };
        setChatMessages(prev => {
          const next = [...(prev || []), optimistic];
          next.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          return next;
        });

        // Input sofort leeren
        setNewMessageText('');
setSelfDestruct(false);
        refocusChatInput();

        try {
          await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages'), payload);
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), {
            updatedAt: Date.now(),
            lastMessageSenderId: user.uid,
            [`typing.${user.uid}`]: false,
            [`typingAt.${user.uid}`]: Date.now()
          });

          const now = Date.now();
          setLastChatVisit(now);
          localStorage.setItem('onyx_last_chat_visit', now.toString());
        } catch (error) {
          console.error('sendMessage failed', error);
          // Optimistic rollback
          setChatMessages(prev => (prev || []).filter(m => m.clientMsgId !== clientMsgId));
          showToast('Senden fehlgeschlagen');
          refocusChatInput();
        }
      };

      const acceptSharedEvent = async (eventDetails) => {
        if (!user) return;
        try {
          await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'events'), {
            title: eventDetails.title, date: eventDetails.date, time: eventDetails.time, type: 'Projekt', desc: 'Geteilter Termin aus Chat', reminderMode: 'default', reminderMinutes: null, createdAt: Date.now(), updatedAt: Date.now(), calendarId: 'default'
          });
          showToast("Termin im Kalender gespeichert!");
        } catch (error) { showToast("Fehler beim Speichern"); }
      };

      const deleteMessage = async (msgId) => {
        if (!activeChat || !user) return;
        try {
          // Soft-delete: keep message visible with a "gelöscht" hint instead of removing it.
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages', msgId), {
            deleted: true,
            deletedAt: Date.now(),
            deletedBy: user.uid,
            text: '',
            image: null,
            audio: null,
            event: null
          });
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), {
            updatedAt: Date.now(),
            lastMessageSenderId: user.uid
          }).catch(()=>{});
          setSelectedMessageId(null);
          showToast("Nachricht gelöscht");
          refocusChatInput();
        } catch (error) { showToast("Fehler beim Löschen"); }
      };
      const handleImageUpload = async (e) => {
        const file0 = e?.target?.files && e.target.files[0];
        if (!file0) return;
        try { e.target.value = ''; } catch (_) {}

        if (!isProbablyImageFile(file0)) {
          showToast('Nur Bilder unterstützt');
          return;
        }

        try {
          const file = await ensureJpegBlobIfHeic(file0);
          const compressed = await compressImageFileToDataUrl(file, { maxDim: 1600, quality: 0.72 });
          await sendMessage(null, compressed);
        } catch (err) {
          console.warn('image compress/upload failed', err);
          try {
            const fallback = await readFileAsDataUrl(file0);
            await sendMessage(null, fallback);
          } catch (_) {
            showToast('Bild konnte nicht verarbeitet werden');
          }
        }
      };

      const formatTime = (ts) => {
        if (!ts) return '';
        try { return new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); } catch(e) { return ''; }
      };

      const getPresence = (uid) => {
        const p = getProfile(uid);
        if (!p) return { status: 'offline', lastSeen: 0, online: false };
        const lastSeen = p.presenceLastSeen || 0;
        const online = (p.presenceStatus === 'online') && (Date.now() - lastSeen < 45000);
        return { status: online ? 'online' : 'offline', lastSeen, online };
      };

      const getChatPartnerName = (chat) => {
        if (!chat) return 'Chat';
        if (isGroupChat(chat)) return chat.title || 'Gruppe';
        const pid = (chat?.participants || []).find(id => id !== user?.uid);
        const prof = pid ? getProfile(pid) : null;
        return (prof?.displayName || prof?.username || chat?.displayNames?.[pid] || prof?.email || 'Unbekannt');
      };
      const getChatPartnerAvatar = (chat) => {
        if (!chat) return null;
        if (isGroupChat(chat)) return chat.avatarBase64 || null;
        const pid = (chat?.participants || []).find(id => id !== user?.uid);
        const prof = pid ? getProfile(pid) : null;
        return prof?.avatarThumbBase64 || prof?.avatarBase64 || null;
      };

      const getChatPartnerAvatarFull = (chat) => {
        if (!chat) return null;
        if (isGroupChat(chat)) return chat.avatarBase64 || null;
        const pid = (chat?.participants || []).find(id => id !== user?.uid);
        const prof = pid ? getProfile(pid) : null;
        return prof?.avatarFullBase64 || prof?.avatarBase64 || prof?.avatarThumbBase64 || null;
      };

      const getChatParticipants = (chat) => Array.isArray(chat?.participants) ? chat.participants : [];
      const hasUnreadMessages = myChats.some(chat => chat.updatedAt > lastChatVisit && chat.lastMessageSenderId !== user?.uid);
      
      const exportICS = (exportAll = true) => {
        let eventsToExport = allEvents;
        if (!exportAll) eventsToExport = getEventsForDate(new Date().toISOString().split('T')[0]);
        if (eventsToExport.length === 0) return showToast("Keine Termine");
        let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Onyx Calendar//DE\n";
        eventsToExport.forEach(e => {
          const dateStr = e.date.replace(/-/g, ''); const timeStr = (e.time || '12:00').replace(':', '') + '00';
          icsContent += "BEGIN:VEVENT\n" + `SUMMARY:${e.title}\n` + `DTSTART;TZID=Europe/Zurich:${dateStr}T${timeStr}\n` + `DESCRIPTION:${e.desc || ''}\n` + "END:VEVENT\n";
        });
        icsContent += "END:VCALENDAR";
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([icsContent], { type: 'text/calendar' }));
        a.download = exportAll ? 'onyx_alle.ics' : 'onyx_heute.ics'; a.click(); showToast("Download gestartet");
      };

      const handleImportICS = (e) => {
        const file = e.target.files[0];
        if (file && user) {
          showToast(`Datei "${file.name}" wird gelesen...`);
          setTimeout(async () => {
            try {
              await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'events'), {
                title: 'Importierter Termin', date: new Date().toISOString().split('T')[0], time: '12:00', type: 'Privat', desc: 'Aus ICS importiert', createdAt: Date.now(), calendarId: 'default'
              });
              showToast('Import abgeschlossen.');
            } catch (error) {}
          }, 1000);
        }
      };

      if (!isAppReady) {
        return (
          <div className="flex h-screen w-full bg-black text-white font-sans items-center justify-center p-4" style={{ height: 'var(--app-height, 100vh)' }}>
            <div className="flex flex-col items-center animate-pulse"><div className="w-12 h-12 bg-white rounded-sm mb-6"></div><h1 className="text-xl tracking-widest text-neutral-500">ONYX LÄDT...</h1></div>
          </div>
        );
      }

      if (!isLoggedIn) {
        return (
          <div className="flex h-screen w-full bg-black text-white font-sans items-center justify-center p-4 relative overflow-hidden" style={{ height: 'var(--app-height, 100vh)' }}>
            <div className="fixed top-4 right-4 z-[60] space-y-2">
              {toasts.map(toast => (<div key={toast.id} className="bg-neutral-900 border border-neutral-700 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in"><CheckCircle2 className="w-5 h-5 text-neutral-400" /><span className="text-sm font-medium">{toast.message}</span></div>))}
            </div>
            <div className="max-w-md w-full p-8 flex flex-col items-center bg-black border border-neutral-800 rounded-2xl shadow-2xl z-10">
              <div className="w-10 h-10 bg-white rounded-sm mb-6"></div><h1 className="text-3xl font-bold tracking-widest mb-2">ONYX</h1>
              <p className="text-neutral-500 mb-8 text-center text-sm">{isRegistering ? 'Erstelle deinen Account.' : 'Melde dich an, um fortzufahren.'}</p>
              {authError && <div className="w-full bg-red-950/30 border border-red-900/50 text-red-400 p-3 rounded-lg mb-6 text-xs flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{authError}</p></div>}
              <form onSubmit={handleAuth} className="w-full space-y-4">
                {isRegistering && (
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" /><input type="text" placeholder="Dein Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full bg-neutral-900/50 border border-neutral-800 text-white placeholder-neutral-600 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-neutral-500 transition-colors" /></div>
                )}

                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" /><input type="email" placeholder="E-Mail Adresse" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-neutral-900/50 border border-neutral-800 text-white placeholder-neutral-600 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-neutral-500 transition-colors" /></div>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" /><input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-neutral-900/50 border border-neutral-800 text-white placeholder-neutral-600 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-neutral-500 transition-colors" /></div>
                <button type="submit" className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors mt-2">{isRegistering ? 'Account erstellen' : 'Anmelden'}</button>
              </form>
              <div className="mt-8 text-center text-sm text-neutral-500">{isRegistering ? 'Bereits einen Account? ' : 'Noch keinen Account? '}<button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-white hover:underline font-medium">{isRegistering ? 'Hier anmelden' : 'Jetzt registrieren'}</button></div>
            </div>
          </div>
        );
      }

      const activeCalForView = getCalendarById(activeCalendarId);

      return (
        <div 
          className="flex h-screen w-full bg-black text-white font-sans overflow-hidden flex-col md:flex-row pb-16 md:pb-0 relative" style={{ height: 'var(--app-height, 100vh)' }}
          onTouchStart={handleGlobalTouchStart}
          onTouchMove={handleGlobalTouchMove}
          onTouchEnd={handleGlobalTouchEnd}
        >
          {/* PULL TO REFRESH INDICATOR */}
          <div className="absolute top-0 left-0 w-full flex justify-center z-[100] transition-transform duration-200 pointer-events-none" style={{ transform: `translateY(${pullDistance - 50}px)` }}>
            <div className={`bg-neutral-900 border border-neutral-700 p-2 rounded-full shadow-lg ${isRefreshing ? 'animate-spin-fast' : ''}`}>
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
            {toasts.map(toast => (<div key={toast.id} className="bg-neutral-900 border border-neutral-700 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in pointer-events-auto"><CheckCircle2 className="w-5 h-5 text-neutral-400" /><span className="text-sm font-medium">{toast.message}</span></div>))}
          </div>

          <aside className="hidden md:flex w-64 border-r border-neutral-800 flex-col shrink-0 bg-black z-10">
            <div className="p-6 flex-1 overflow-y-auto">
              <h1 className="text-xl font-bold tracking-wider mb-8 flex items-center gap-3"><div className="w-4 h-4 bg-white rounded-sm"></div>ONYX</h1>
              <button onClick={() => openNewEventModal()} className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 px-4 rounded-md font-medium hover:bg-gray-200 transition-colors mb-8"><Plus className="w-5 h-5" /> Neuer Termin</button>
              <nav className="space-y-2 mb-8">
                <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-neutral-900' : 'hover:bg-neutral-900/50 text-neutral-400 hover:text-white'}`}><Home className="w-5 h-5" /> Dashboard</button>
                <button onClick={() => setCurrentView('calendar')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${currentView === 'calendar' ? 'bg-neutral-900' : 'hover:bg-neutral-900/50 text-neutral-400 hover:text-white'}`}><CalendarIcon className="w-5 h-5" /> Kalender</button>
                <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${currentView === 'settings' ? 'bg-neutral-900' : 'hover:bg-neutral-900/50 text-neutral-400 hover:text-white'}`}><Settings className="w-5 h-5" /> Einstellungen</button>
              </nav>

              {/* Kalender Liste in der Sidebar */}
              <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-3 font-semibold px-2">Kalender</h3>
              <div className="space-y-1">
                 <div className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-900/50 transition-colors group">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input type="checkbox" checked={visibleCalendars.includes('default')} onChange={() => toggleCalendarVisibility('default')} className="appearance-none w-4 h-4 border border-neutral-600 rounded-sm checked:bg-white checked:border-white transition-colors cursor-pointer" />
                      <span className="text-sm text-neutral-300 truncate">Privat</span>
                    </label>
                    <button onClick={() => setActiveCalendarId('default')} className={`w-3 h-3 rounded-full ${activeCalendarId === 'default' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-transparent border border-neutral-600 group-hover:border-white'}`} title="Als aktiven Kalender setzen"></button>
                 </div>
                 {customCalendars.map(cal => (
                   <div key={cal.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-900/50 transition-colors group">
                      <label className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden">
                        <input type="checkbox" checked={visibleCalendars.includes(cal.id)} onChange={() => toggleCalendarVisibility(cal.id)} className="appearance-none w-4 h-4 border border-neutral-600 rounded-sm checked:bg-white checked:border-white transition-colors cursor-pointer shrink-0" />
                        <span className="text-sm text-neutral-300 truncate">{cal.name} {cal.ownerId !== user.uid ? '(Geteilt)' : ''}</span>
                      </label>
                      <button onClick={() => setActiveCalendarId(cal.id)} className={`w-3 h-3 rounded-full shrink-0 ${activeCalendarId === cal.id ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-transparent border border-neutral-600 group-hover:border-white'}`} title="Als aktiven Kalender setzen"></button>
                   </div>
                 ))}
              </div>
            </div>
          </aside>

          <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-black border-t border-neutral-800 flex items-center justify-around z-40 px-2 pb-safe">
            <button onClick={() => setCurrentView('dashboard')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-white' : 'text-neutral-500'}`}><Home className="w-6 h-6" /></button>
            <button onClick={() => setCurrentView('calendar')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${currentView === 'calendar' ? 'text-white' : 'text-neutral-500'}`}><CalendarIcon className="w-6 h-6" /></button>
            <button onClick={() => openNewEventModal()} className="p-3 bg-white text-black rounded-full -mt-6 border-4 border-black shadow-lg"><Plus className="w-6 h-6" /></button>
            <button onClick={() => setCurrentView('settings')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-white' : 'text-neutral-500'}`}><Settings className="w-6 h-6" /></button>
          </nav>

          <main ref={mainRef} className="flex-1 flex flex-col h-full overflow-y-auto bg-black relative">
            {currentView === 'dashboard' && (
              <div className="p-6 md:p-10 max-w-5xl w-full mx-auto animate-fade-in">
                <header className="flex justify-between items-center mb-8 md:mb-10">
                  <h2 className="text-3xl md:text-4xl font-light">Guten Morgen{dashboardName ? `, ${dashboardName}` : ''}.</h2>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
                  <div onClick={() => setIsWeatherModalOpen(true)} className="p-5 md:p-6 border border-neutral-800 rounded-xl bg-neutral-950/30 flex items-center justify-between cursor-pointer hover:border-neutral-600 transition-colors group">
                    <div><h3 className="text-neutral-500 text-xs md:text-sm font-medium uppercase tracking-wider mb-1 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {location.name}</h3><p className="text-3xl md:text-4xl font-light">{weather ? `${Math.round(weather.temperature)}°` : '--°'}</p></div>
                    <div>{getWeatherIcon(weather?.weathercode, "w-10 h-10 md:w-12 md:h-12 text-white")}</div>
                  </div>
                  <div className="p-5 md:p-6 border border-neutral-800 rounded-xl bg-neutral-950/30 flex items-start gap-4">
                    <Info className="w-5 h-5 md:w-6 md:h-6 text-neutral-400 shrink-0 mt-1" />
                    <div className="flex-1"><div className="flex items-center justify-between gap-3 mb-2"><h3 className="text-neutral-500 text-xs md:text-sm font-medium uppercase tracking-wider">Spruch des Tages</h3><button onClick={refreshDailyFact} title="Neuer Spruch" className="p-2 rounded-lg border border-neutral-800 hover:border-neutral-500 hover:bg-neutral-900 transition-colors text-neutral-300"><RefreshCw className="w-4 h-4" /></button></div><p className="text-sm text-neutral-200 leading-relaxed">{dailyFact}</p></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-medium mb-4 border-b border-neutral-800 pb-3 flex justify-between items-end">Agenda für heute<span className="text-sm font-normal text-neutral-500">{new Date().toLocaleDateString('de-DE')}</span></h3>
                  {hasUnreadMessages && (
                    <div className="mb-4 p-4 border border-neutral-700 bg-neutral-900 rounded-xl flex items-center justify-center transition-colors animate-fade-in">
                      <div className="flex items-center gap-3"><div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div><span className="font-medium text-white uppercase tracking-widest text-sm">Kalender Aktuell</span></div>
                    </div>
                  )}
                  <div className="space-y-3 md:space-y-4">
                    {getEventsForDate(new Date().toISOString().split('T')[0]).length > 0 ? (
                      getEventsForDate(new Date().toISOString().split('T')[0]).sort((a,b) => (a.time||'').localeCompare(b.time||'')).map(event => (
                        <div key={event.id} onClick={() => openEditEventModal(event)} className="flex items-center gap-4 md:gap-6 p-4 border border-neutral-800 hover:border-neutral-500 transition-colors rounded-lg bg-black cursor-pointer group">
                          {event.type === 'shift' ? (
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: event.color }}>
                               <Clock className="w-5 h-5 text-black opacity-60" />
                            </div>
                          ) : (
                            <div className="text-neutral-400 font-mono text-sm md:text-base w-12 text-right">{event.time}</div>
                          )}
                          <div className="w-px h-10 bg-neutral-800 group-hover:bg-neutral-600 transition-colors"></div>
                          <div className="flex-1 overflow-hidden">
                             <p className="font-medium text-white truncate">{event.title}</p>
                             <p className="text-xs text-neutral-500 mt-0.5 truncate">{event.type === 'shift' ? getCalendarById(event.calendarId)?.name : event.type} {event.desc && `• ${event.desc}`}</p>
                          </div>
                        </div>
                      ))
                    ) : (<p className="text-neutral-500 text-sm italic p-4 text-center border border-dashed border-neutral-800 rounded-lg">Keine Termine für heute.</p>)}
                  </div>
                </div>
              </div>
            )}

            {currentView === 'calendar' && (
              <div className="flex-1 flex flex-col h-full w-full max-w-7xl mx-auto animate-fade-in select-none">
                
                {/* Mobile Active Calendar Selector */}
                <div className="md:hidden flex items-center px-4 py-2 border-b border-neutral-800 bg-neutral-950 overflow-x-auto no-scrollbar gap-2 shrink-0">
                   <span className="text-xs text-neutral-500 uppercase font-semibold mr-2 shrink-0">Aktiv:</span>
                   <button onClick={() => setActiveCalendarId('default')} className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeCalendarId === 'default' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}>Privat</button>
                   {customCalendars.map(cal => (
                      <button key={cal.id} onClick={() => setActiveCalendarId(cal.id)} className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeCalendarId === cal.id ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}>{cal.name}</button>
                   ))}
                </div>

                <header className="h-16 md:h-20 border-b border-neutral-800 flex items-center justify-between px-4 md:px-8 shrink-0">
                  <div className="flex items-center gap-2 md:gap-6">
                    <h2 className="text-lg md:text-2xl font-light w-32 md:w-48">{MONATE[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                    <div className="flex items-center gap-1 md:gap-2">
                      <button onClick={prevMonth} className="p-1.5 md:p-2 hover:bg-neutral-900 rounded-full transition-colors border border-transparent hover:border-neutral-800"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /></button>
                      <button onClick={goToToday} className="px-3 py-1.5 text-xs md:text-sm border border-neutral-800 hover:bg-neutral-900 rounded-md transition-colors">Heute</button>
                      <button onClick={nextMonth} className="p-1.5 md:p-2 hover:bg-neutral-900 rounded-full transition-colors border border-transparent hover:border-neutral-800"><ChevronRight className="w-5 h-5 md:w-6 md:h-6" /></button>
                    </div>
                  </div>
                </header>

                {/* VIEW TOGGLE & SUCHE */}
                <div className="border-b border-neutral-800 bg-neutral-950 px-4 md:px-8 py-2 flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setCalendarViewMode('month'); setCalendarSearchQuery(''); }} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${calendarViewMode === 'month' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}>
                      <CalendarIcon className="w-4 h-4 inline-block mr-1" /> Monat
                    </button>
                    <button onClick={() => setCalendarViewMode('agenda')} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${calendarViewMode === 'agenda' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}>
                      <AlignLeft className="w-4 h-4 inline-block mr-1" /> Agenda
                    </button>
                  </div>

                  {calendarViewMode === 'agenda' ? (
                    <div className="flex items-center gap-2 flex-1 justify-end min-w-[220px]">
                      <select value={agendaRange} onChange={(e) => setAgendaRange(e.target.value)} className="bg-black border border-neutral-800 text-white text-xs rounded-md px-2 py-2 focus:outline-none">
                        <option value="7">Nächste 7 Tage</option>
                        <option value="30">Nächste 30 Tage</option>
                        <option value="month">Dieser Monat</option>
                      </select>
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input value={calendarSearchQuery} onChange={(e) => setCalendarSearchQuery(e.target.value)} placeholder="Suche Termine..." className="w-full bg-black border border-neutral-800 text-white text-xs rounded-md pl-9 pr-3 py-2 focus:outline-none focus:border-neutral-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="ml-auto">
                      <button onClick={() => { setCalendarViewMode('agenda'); setAgendaRange('30'); }} className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-800 hover:border-neutral-500 bg-neutral-900">
                        <Search className="w-4 h-4" /> Suchen
                      </button>
                    </div>
                  )}
                </div>


                {/* ACTIVE CALENDAR BAR & PINSEL */}
                {calendarViewMode === 'month' && activeCalForView && activeCalForView.type === 'shift' && (
                  <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-2 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                const nextState = !isPaintbrushActive;
                                setIsPaintbrushActive(nextState);
                                if (nextState && activeCalForView.shifts?.length > 0) setSelectedPaintShift(activeCalForView.shifts[0]);
                            }} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isPaintbrushActive ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'}`}
                        >
                           <Paintbrush className="w-4 h-4" /> Pinsel
                        </button>
                        {isPaintbrushActive && selectedPaintShift && (
                           <select 
                              value={selectedPaintShift.id} 
                              onChange={e => {
                                 if (e.target.value === 'delete') setSelectedPaintShift({ id: 'delete', name: 'Löschen' });
                                 else setSelectedPaintShift(activeCalForView.shifts.find(s => s.id === e.target.value));
                              }}
                              className="bg-black border border-neutral-700 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none"
                           >
                              {activeCalForView.shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              <option value="delete">Frei / Löschen</option>
                           </select>
                        )}
                     </div>
                     {isPaintbrushActive && <span className="text-[10px] text-neutral-500 uppercase tracking-widest animate-pulse hidden sm:inline-block">Streichen zum Malen</span>}
                  </div>
                )}

                <div className="flex-1 flex flex-col bg-neutral-900 gap-px p-px" style={{ display: calendarViewMode === 'month' ? 'flex' : 'none' }}>
                  <div className="grid grid-cols-7 gap-px shrink-0">{WOCHENTAGE.map(tag => <div key={tag} className="bg-black py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold uppercase tracking-wider text-neutral-500">{tag}</div>)}</div>
                  <div 
                    className={`flex-1 grid grid-cols-7 gap-px overflow-y-auto ${isPaintbrushActive ? 'touch-none' : ''}`}
                    onMouseLeave={handlePaintEnd}
                  >
                    {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (<div key={`empty-${i}`} className="bg-black/40 p-1 md:p-2 min-h-[80px] md:min-h-[120px]"></div>))}
                    {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                      const day = i + 1; const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayEvents = getEventsForDate(dateStr);
                      const isToday = new Date().toISOString().split('T')[0] === dateStr;
                      return (
                        <div 
                           key={day} 
                           data-date={dateStr}
                           onContextMenu={(e) => handleDayContextMenu(e, dateStr)}
                           onMouseDown={(e) => {
                              handleTouchStart(dateStr);
                              if (isPaintbrushActive) handlePaintStart(e, dateStr);
                           }}
                           onMouseEnter={(e) => { if (isPaintbrushActive) handlePaintMove(e, dateStr); }}
                           onMouseUp={(e) => { handleTouchEnd(); if (isPaintbrushActive) handlePaintEnd(); }}
                           onTouchStart={(e) => {
                              handleTouchStart(dateStr);
                              if (isPaintbrushActive) handlePaintStart(e, dateStr);
                           }}
                           onTouchMove={(e) => {
                              if (isPaintbrushActive) handlePaintMove(e, dateStr);
                           }}
                           onTouchEnd={(e) => { handleTouchEnd(); if (isPaintbrushActive) handlePaintEnd(); }}
                           onClick={() => {
                              if (!isPaintbrushActive) handleDayClick(dateStr);
                           }}
                           className={`bg-black p-1 md:p-2 min-h-[80px] md:min-h-[120px] transition-colors cursor-pointer group relative flex flex-col ${isPaintbrushActive ? 'hover:bg-neutral-900' : 'hover:bg-neutral-950'}`}
                        >
                          <div
                            className={`text-xs md:text-sm font-medium w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-white text-black' : 'text-neutral-400 group-hover:text-white'}`}
                            onMouseDown={(e) => {
                              if (day === 5) { e.stopPropagation(); startSecretGate(); }
                            }}
                            onMouseUp={() => { if (day === 5) endSecretGate(); }}
                            onMouseLeave={() => { if (day === 5) endSecretGate(); }}
                            onTouchStart={(e) => {
                              if (day === 5) { e.stopPropagation(); startSecretGate(); }
                            }}
                            onTouchEnd={() => { if (day === 5) endSecretGate(); }}
                            onTouchCancel={() => { if (day === 5) endSecretGate(); }}
                            onClick={(e) => {
                              if (day === 5 && secretGateTriggered.current) {
                                e.preventDefault();
                                e.stopPropagation();
                                secretGateTriggered.current = false;
                              }
                            }}
                          >
                            {day}
                          </div>
                          <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar pointer-events-none">
                            {dayEvents.map(event => (
                              event.type === 'shift' ? (
                                 <div key={event.id} className="text-[10px] md:text-xs px-1.5 py-1 rounded text-black font-semibold truncate text-center shadow-sm" style={{ backgroundColor: event.color }}>
                                    {event.title}
                                 </div>
                              ) : (
                                 <div key={event.id} className="text-[9px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 truncate">
                                   <span className="text-neutral-500 mr-1">{event.time}</span>{event.title}
                                 </div>
                              )
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-black" style={{ display: calendarViewMode === 'agenda' ? 'block' : 'none' }}>
                  {(() => {
                    const today = new Date().toISOString().split('T')[0];
                    let start = today;
                    let end = today;
                    if (agendaRange === '7') end = addDaysStr(today, 6);
                    else if (agendaRange === '30') end = addDaysStr(today, 29);
                    else {
                      const y = currentDate.getFullYear();
                      const m = currentDate.getMonth();
                      start = formatDateStr(new Date(y, m, 1));
                      end = formatDateStr(new Date(y, m + 1, 0));
                    }

                    let items = getOccurrencesInRange(start, end);
                    const q = (calendarSearchQuery || '').trim().toLowerCase();
                    if (q) {
                      items = items.filter(ev => (
                        (ev.title || '').toLowerCase().includes(q) ||
                        (ev.desc || '').toLowerCase().includes(q) ||
                        (ev.type || '').toLowerCase().includes(q) ||
                        (ev.time || '').toLowerCase().includes(q)
                      ));
                    }

                    const map = {};
                    items.forEach(ev => {
                      if (!map[ev.date]) map[ev.date] = [];
                      map[ev.date].push(ev);
                    });
                    const dates = Object.keys(map).sort();

                    return (
                      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Agenda</p>
                            <h3 className="text-lg md:text-xl font-medium text-white">
                              {agendaRange === 'month' ? `${MONATE[currentDate.getMonth()]} ${currentDate.getFullYear()}` : `${start} – ${end}`}
                            </h3>
                          </div>
                          <button onClick={() => openNewEventModal()} className="text-xs bg-white text-black px-3 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Neu
                          </button>
                        </div>

                        {dates.length === 0 ? (
                          <div className="p-10 text-center border border-dashed border-neutral-800 rounded-2xl text-neutral-500">
                            Keine Termine gefunden.
                          </div>
                        ) : (
                          dates.map(dateStr => (
                            <div key={dateStr} className="border border-neutral-900 rounded-2xl overflow-hidden bg-neutral-950/30">
                              <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-900 flex items-center justify-between">
                                <div className="font-medium text-white">{new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'short' })}</div>
                                <div className="text-xs text-neutral-500">{map[dateStr].length} Termine</div>
                              </div>
                              <div className="divide-y divide-neutral-900">
                                {map[dateStr].sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(ev => (
                                  <div key={ev.id} onClick={() => openEditEventModal(ev, ev._occurrenceDate)} className="p-4 hover:bg-neutral-950 cursor-pointer flex items-start gap-4">
                                    {ev.type === 'shift' ? (
                                      <div className="w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: ev.color }} />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg shrink-0 bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-neutral-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="font-medium text-white truncate">{ev.title}</div>
                                        {ev._isInstance && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 uppercase tracking-widest">Wdh</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-neutral-500 mt-1 truncate">
                                        {ev.type === 'shift' ? 'Schicht' : (ev.time ? `${ev.time} · ` : '')}{ev.type || 'Privat'}{ev.desc ? ` · ${ev.desc}` : ''}
                                      </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0 mt-1" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}

            {currentView === 'settings' && (
              <div className="p-6 md:p-10 max-w-3xl mx-auto w-full animate-fade-in">
                <h2 className="text-3xl md:text-4xl font-light mb-10">Einstellungen</h2>
                <div className="space-y-10">
                  
                  {/* KALENDER VERWALTUNG */}
                  <section>
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-4">
                       <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Meine Kalender & Schichten</h3>
                       <button onClick={() => { setCalForm({ id: null, name: '', type: 'normal', shifts: [] }); setIsCalManageModalOpen(true); }} className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-gray-200 transition-colors">+ Neu</button>
                    </div>
                    
                    <div className="space-y-3">
                       <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                          <div>
                             <p className="font-medium text-white flex items-center gap-2">Privat <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full uppercase">Standard</span></p>
                             <p className="text-xs text-neutral-500 mt-1">Dein persönlicher Standard-Kalender.</p>
                          </div>
                       </div>
                       
                       {customCalendars.filter(c => c.ownerId === user.uid).map(cal => (
                          <div key={cal.id} className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                             <div>
                                <p className="font-medium text-white flex items-center gap-2">{cal.name} {cal.type==='shift' && <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-900/50 px-2 py-0.5 rounded-full uppercase">Schichtplan</span>}</p>
                                <p className="text-xs text-neutral-500 mt-1">Freigegeben für: {Object.keys(cal.sharedWith || {}).length} Nutzer</p>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => { setShareCalData(cal); setIsShareCalModalOpen(true); }} className="p-2 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><Share2 className="w-4 h-4"/></button>
                                <button onClick={() => { setCalForm(cal); setIsCalManageModalOpen(true); }} className="p-2 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><Settings className="w-4 h-4"/></button>
                                <button onClick={() => deleteCalendar(cal.id)} className="p-2 border border-red-900/30 bg-red-900/10 rounded-lg text-red-500 hover:bg-red-900/30 transition-colors"><Trash2 className="w-4 h-4"/></button>
                             </div>
                          </div>
                       ))}
                       {customCalendars.filter(c => c.ownerId !== user.uid).map(cal => (
                          <div key={cal.id} className="bg-black border border-neutral-800 rounded-xl p-4 flex items-center justify-between opacity-80">
                             <div>
                                <p className="font-medium text-white flex items-center gap-2">{cal.name} <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full uppercase">Geteilt mit dir</span></p>
                                <p className="text-xs text-neutral-500 mt-1">Rechte: {cal.sharedWith[user.uid] === 'write' ? 'Lesen & Schreiben' : 'Nur Lesen'}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                  </section>



                  <section>
                    <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Benachrichtigungen</h3>
                    <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">Kalender-Erinnerungen</p>
                          <p className="text-xs text-neutral-500 mt-1">Standard-Erinnerung gilt für neue Termine (und für Termine mit „Standard“). Pro Termin kannst du es im Termin-Modal überschreiben.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { try { requestNotificationPermission(user); } catch(e) {} }}
                          className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm hover:text-white transition-colors"
                        >
                          Erlauben
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Standard-Erinnerung</label>
                          <select
                            value={(() => {
                              const v = (userProfile && typeof userProfile.defaultReminderMinutes === 'number') ? String(userProfile.defaultReminderMinutes) : 'none';
                              return v;
                            })()}
                            onChange={async (e) => {
                              try {
                                const v = e.target.value;
                                const next = (v === 'none') ? null : (parseInt(v, 10) || 0);
                                await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), { defaultReminderMinutes: next }, { merge: true });
                                showToast('Gespeichert');
                              } catch (err) {
                                showToast('Fehler');
                              }
                            }}
                            className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                          >
                            <option value="none">Keine</option>
                            <option value="0">Bei Beginn</option>
                            <option value="5">5 Minuten vorher</option>
                            <option value="10">10 Minuten vorher</option>
                            <option value="15">15 Minuten vorher</option>
                            <option value="30">30 Minuten vorher</option>
                            <option value="60">1 Stunde vorher</option>
                            <option value="120">2 Stunden vorher</option>
                            <option value="1440">1 Tag vorher</option>
                          </select>
                        </div>
                      </div>

                      

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Benachrichtigungston</label>
                          <select
                            value={(() => {
                              const v = (userProfile && userProfile.notificationSoundMode) ? String(userProfile.notificationSoundMode) : 'system';
                              return (v === 'silent') ? 'silent' : 'system';
                            })()}
                            onChange={async (e) => {
                              try {
                                const v = e.target.value;
                                await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), { notificationSoundMode: v }, { merge: true });
                                showToast('Gespeichert');
                              } catch (err) {
                                showToast('Fehler');
                              }
                            }}
                            className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                          >
                            <option value="system">System (Standard)</option>
                            <option value="silent">Stumm</option>
                          </select>
                          <p className="mt-2 text-[11px] text-neutral-500">In der PWA ist kein eigener Klingelton möglich – du kannst nur Systemton nutzen oder stumm schalten.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Push-Ziel</label>
                          <select
                            value={(() => {
                              const v = (userProfile && userProfile.pushTarget) ? String(userProfile.pushTarget) : 'auto';
                              return (v === 'android' || v === 'web' || v === 'both') ? v : 'auto';
                            })()}
                            onChange={async (e) => {
                              try {
                                const v = e.target.value;
                                const next = (v === 'auto') ? null : v;
                                await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), { pushTarget: next }, { merge: true });
                                showToast('Gespeichert');
                              } catch (err) {
                                showToast('Fehler');
                              }
                            }}
                            className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                          >
                            <option value="auto">Automatisch</option>
                            <option value="web">Nur Web/PWA</option>
                            <option value="android">Nur Android (APK)</option>
                            <option value="both">Beide</option>
                          </select>
                          <p className="mt-2 text-[11px] text-neutral-500">Automatisch = oxynoti sendet an die vorhandenen Tokens (Android/Web).</p>
                        </div>
                      </div>

<div className="text-[11px] text-neutral-500">
                        Status: <span className="text-neutral-300">{('Notification' in window) ? (Notification.permission || 'default') : 'nicht unterstützt'}</span>
                      </div>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Datenschutz & Account</h3>
                    <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div><p className="font-medium text-white">Angemeldet als: {user?.email}</p>{userProfile && <p className="text-sm text-neutral-400">Alias: {userProfile.username}</p>}</div>
                      <button onClick={handleLogout} className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm hover:text-white transition-colors">Abmelden</button>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Import / Export (.ics)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5">
                        <Download className="w-6 h-6 text-white mb-4" /><h4 className="font-medium text-white mb-1">Kalender exportieren</h4><p className="text-xs text-neutral-500 mb-4 h-8">Lade deine Termine als Standard .ics Datei herunter.</p>
                        <div className="flex gap-2"><button onClick={() => exportICS(true)} className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-sm hover:bg-neutral-800 transition-colors">Alle</button><button onClick={() => exportICS(false)} className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-sm hover:bg-neutral-800 transition-colors">Nur Heute</button></div>
                      </div>
                      <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5 relative overflow-hidden group">
                        <Upload className="w-6 h-6 text-white mb-4" /><h4 className="font-medium text-white mb-1">Datei importieren</h4><p className="text-xs text-neutral-500 mb-4 h-8">Füge Termine aus einer externen .ics Datei hinzu.</p>
                        <div className="relative"><button className="w-full px-3 py-2 bg-white text-black rounded-md text-sm font-medium group-hover:bg-gray-200 transition-colors text-center">Datei auswählen</button><input type="file" accept=".ics" onChange={handleImportICS} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /></div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {currentView === 'secret_chat' && (
              <ErrorBoundary onReset={() => { setActiveChat(null); setSecretView('list'); setCurrentView('calendar'); }}>
              <div className="fixed inset-0 z-50 bg-black flex flex-col animate-slide-up" style={{ height: 'var(--app-height, 100vh)' }}>
                
                {/* Geheimer Chat Header */}
                <header className="h-16 md:h-20 border-b border-neutral-800 flex items-center px-4 md:px-8 shrink-0 bg-neutral-950">
                  {secretView === 'chat' && activeChat ? (
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setActiveChat(null); setSecretView('list'); }} className="text-neutral-400 hover:text-white transition-colors mr-2">
                        <ArrowLeft className="w-6 h-6" /> 
                      </button>
                      
                      <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowPartnerStats(true)}>
                        {getChatPartnerAvatar(activeChat) ? (
                          <img src={getChatPartnerAvatar(activeChat)} className="w-10 h-10 rounded-full border border-neutral-700 object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase">{initialsFrom(getChatPartnerName(activeChat))}</div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-white leading-tight">{getChatPartnerName(activeChat)}</span>
                          {(activeChatData && getTypingUsers(activeChatData).length > 0) ? (
                             <span className="text-[11px] text-green-400 animate-pulse font-medium">
                               {isGroupChat(activeChatData) ? (getTypingUsers(activeChatData).length === 1 ? `${getProfile(getTypingUsers(activeChatData)[0])?.username || 'Jemand'} tippt...` : `${getTypingUsers(activeChatData).length} tippen...`) : 'tippt...'}
                             </span>
                          ) : (
                             <span className="text-[11px] text-neutral-500">
                               {isGroupChat(activeChatData) ? (() => { const ids = getChatParticipants(activeChatData); const onlineCount = ids.filter(id => getPresence(id).online).length; return `${onlineCount} online • ${ids.length} Mitglieder`; })() : (() => { const pr = getPresence(partnerId); if (pr.online) return 'online'; if (pr.lastSeen) return `zuletzt gesehen ${formatTime(pr.lastSeen)}`; return 'offline'; })()}
                             </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : secretView === 'settings' ? (
                    <button onClick={() => setSecretView('list')} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
                      <ArrowLeft className="w-5 h-5" /> <span className="font-medium text-white">Chat Profil</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3"><MessageSquare className="w-5 h-5 text-white" /><h2 className="text-lg md:text-xl font-medium text-white">Sichere Verbindung</h2></div>
                  )}
                  
                  <div className="ml-auto flex items-center gap-4">
                    {userProfile && secretView === 'list' && (
                      <button onClick={() => setSecretView('settings')} className="text-neutral-500 hover:text-white transition-colors p-2">
                        <Settings className="w-5 h-5" />
                      </button>
                    )}
                    {secretView === 'chat' && activeChat && (
                      <button onClick={() => { setIsMessageSearchOpen(v => !v); setTimeout(() => document.getElementById('msgSearchInput')?.focus(), 0); }} className={`text-neutral-500 hover:text-white transition-colors p-2 ${isMessageSearchOpen ? 'bg-neutral-900 rounded-lg' : ''}`} title="Chat durchsuchen">
                        <Search className="w-5 h-5" />
                      </button>
                    )}
                    {secretView === 'chat' && activeChat && userProfile && (
                      <button
                        onClick={() => toggleMuteChat(activeChat.id)}
                        className="text-neutral-500 hover:text-white transition-colors p-2"
                        title={(Array.isArray(userProfile?.mutedChatIds) && userProfile.mutedChatIds.includes(activeChat.id)) ? 'Stumm aus' : 'Stumm schalten'}
                      >
                        {(Array.isArray(userProfile?.mutedChatIds) && userProfile.mutedChatIds.includes(activeChat.id)) ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </button>
                    )}
                    <button onClick={() => { setActiveChat(null); setCurrentView('calendar'); }} className="text-neutral-500 hover:text-white text-2xl leading-none p-2">&times;</button>
                  </div>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {!userProfile ? (
                    <div className="flex-1 flex items-center justify-center p-6"><div className="max-w-md w-full border border-neutral-800 p-8 rounded-xl bg-neutral-950/50 text-center"><Lock className="w-8 h-8 mx-auto mb-4 text-neutral-500" /><h3 className="text-xl font-medium mb-2">Identität festlegen</h3><p className="text-sm text-neutral-500 mb-6">Wähle einen einzigartigen Benutzernamen.</p>
                    <form onSubmit={saveUsername}>
                      <input type="text" name="username" defaultValue={userProfile?.displayName || userProfile?.username || user?.email?.split('@')[0] || ''} placeholder="Dein Benutzername" required maxLength={20} className="w-full bg-black border border-neutral-700 text-white placeholder-neutral-600 rounded-lg px-4 py-3 text-center focus:outline-none focus:border-white transition-colors mb-4" />
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-4">
                        <div>Deine Chat-ID:</div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-200">{userProfile?.friendCode || '-----'}</span>
                          <button type="button" onClick={() => { const v = String(userProfile?.friendCode||''); if (v) { navigator.clipboard?.writeText(v).then(()=>showToast('Chat-ID kopiert')); } }} className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-200 hover:bg-neutral-800">Kopieren</button>
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors">Bestätigen</button>
                    </form>
                    </div></div>
                  
                  ) : secretView === 'settings' ? (
                    <div className="flex-1 overflow-y-auto p-6 max-w-2xl w-full mx-auto space-y-8">
                      <div className="flex flex-col items-center border border-neutral-800 rounded-xl p-8 bg-neutral-950/50">
                        <div className="relative mb-6">
                          {userProfile.avatarBase64 ? (
                            <img
                              src={userProfile.avatarThumbBase64 || userProfile.avatarBase64}
                              className="w-24 h-24 rounded-full border-2 border-neutral-700 object-cover cursor-zoom-in"
                              alt="Profilbild"
                              onClick={() => openImageViewer(userProfile.avatarFullBase64 || userProfile.avatarBase64 || userProfile.avatarThumbBase64)}
                            />
                          ) : (
                            <div className="w-24 h-24 bg-neutral-900 border-2 border-neutral-700 rounded-full flex items-center justify-center text-3xl font-medium text-neutral-500">{initialsFrom(userProfile?.displayName || userProfile?.username || userProfile?.email || '')}</div>
                          )}
                          <label className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full cursor-pointer hover:bg-gray-200 shadow-lg">
                            <Camera className="w-4 h-4" />
                            <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleAvatarUpload} />
                          </label>
                        </div>
                        <form onSubmit={updateProfileSettings} className="w-full max-w-xs space-y-4">
                          <input type="text" name="displayName" defaultValue={userProfile.displayName || userProfile.username || ''} required className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-center focus:outline-none focus:border-white transition-colors" />
                          <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Chat‑ID (5‑stellig)</span>
                              <span className="font-mono text-white text-sm">{userProfile?.friendCode || '-----'}</span>
                            </div>
                            <button type="button" onClick={() => { const v = String(userProfile?.friendCode||''); if (v && v !== '-----') { navigator.clipboard?.writeText(v).then(()=>showToast('Chat-ID kopiert')); } }} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200 transition-colors">
                              Kopieren
                            </button>
                          </div>
                          <p className="text-[11px] text-neutral-500 text-center">Freunde im Chat fügst du über diese Chat‑ID hinzu. Kalender‑Freunde werden per E‑Mail geteilt.</p>

                          <button type="submit" className="w-full bg-neutral-800 text-white font-medium py-3 rounded-lg hover:bg-neutral-700 transition-colors">Profil speichern</button>
                        </form>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-950/50">
                          <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Gesendet</p>
                          <p className="text-2xl font-light text-white">{chatStats.sent}</p>
                        </div>
                        <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-950/50">
                          <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Empfangen</p>
                          <p className="text-2xl font-light text-white">{chatStats.received}</p>
                        </div>
                        <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-950/50">
                          <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Total</p>
                          <p className="text-2xl font-light text-white">{chatStats.total}</p>
                        </div>
                      </div>
                    </div>

                  ) : secretView === 'list' ? (
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl w-full mx-auto">
                      <div className="relative mb-8"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" /><input type="text" placeholder="Neuen Chat starten (5-stellige Chat-ID eingeben)..." value={chatSearchQuery} onChange={(e) => setChatSearchQuery(normalizeChatId(e.target.value))} className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-full pl-12 pr-4 py-3 focus:outline-none focus:border-neutral-500 transition-colors" />
                        <div className="mt-2 px-4 text-xs text-neutral-500">Tipp: Gib die <span className="text-neutral-300">5-stellige Chat-ID</span> exakt ein. Es werden keine Vorschläge angezeigt.</div>
                        
                        {chatFriendLoading && (
                          <div className="mt-3 px-4 text-xs text-neutral-500">Suche...</div>
                        )}
                        {!chatFriendLoading && chatFriendError && (
                          <div className="mt-3 px-4 text-xs text-red-400">{chatFriendError}</div>
                        )}
                        {!chatFriendLoading && chatFriendResult && (
                          <div className="absolute top-full left-0 w-full mt-2 bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-2xl z-10">
                            <div onClick={() => startChatWithProfile(chatFriendResult)} className="p-4 hover:bg-neutral-800 cursor-pointer flex items-center gap-3">
                              <div className="w-10 h-10 bg-black border border-neutral-700 rounded-full flex items-center justify-center text-neutral-400 font-medium uppercase overflow-hidden">
                                {chatFriendResult.avatarBase64 ? (
                                  <img
                                    src={chatFriendResult.avatarThumbBase64 || chatFriendResult.avatarBase64}
                                    className="w-full h-full object-cover cursor-zoom-in"
                                    alt="Profilbild"
                                    onClick={(e) => { e.stopPropagation(); openImageViewer(chatFriendResult.avatarFullBase64 || chatFriendResult.avatarBase64 || chatFriendResult.avatarThumbBase64); }}
                                  />
                                ) : initialsFrom(chatFriendResult.displayName || chatFriendResult.username || chatFriendResult.email || '')}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-white">{chatFriendResult.displayName || chatFriendResult.username || chatFriendResult.email}</span>
                                <span className="text-[11px] text-neutral-500 font-mono">Chat-ID: {String(chatFriendResult.friendCode || '').padStart(5,'0')}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end mb-6 px-2">
                        <button onClick={() => { setShowCreateGroup(true); setGroupDraftName(''); setGroupDraftMembers([]); setGroupMemberSearch(''); }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors">
                          <Users className="w-4 h-4" /> Gruppe erstellen
                        </button>
                      </div>
                      <h4 className="text-xs uppercase tracking-widest text-neutral-600 mb-4 font-semibold px-2">Verlauf</h4>
                      <div className="space-y-2">
                        {sortedMyChats.length === 0 ? (
                          <div className="p-8 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-sm">Noch keine Chats vorhanden.</div>
                        ) : (
                          <>
                            {pinnedChatIds.length > 0 && (
                              <div className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-widest text-neutral-600">Pinned</div>
                            )}
                            {sortedMyChats.map(chat => {
                              const isPinned = pinnedChatIds.includes(chat.id);
                              const mutedChatIds = (userProfile && Array.isArray(userProfile.mutedChatIds)) ? userProfile.mutedChatIds : [];
                              const isMuted = mutedChatIds.includes(chat.id);
                              return (
                                <div key={chat.id} onClick={() => { setActiveChat(chat); setSecretView('chat'); }} className="p-4 border border-neutral-800 hover:border-neutral-500 rounded-xl bg-black hover:bg-neutral-950 transition-colors cursor-pointer flex items-center gap-4">
                                  <div className="w-12 h-12 bg-neutral-900 border border-neutral-700 rounded-full flex items-center justify-center text-neutral-300 font-medium uppercase shrink-0 overflow-hidden">
                                    {getChatPartnerAvatar(chat) ? (
                                    <img
                                      src={getChatPartnerAvatar(chat)}
                                      className="w-full h-full object-cover cursor-zoom-in"
                                      alt="Profilbild"
                                      onClick={(e) => { e.stopPropagation(); openImageViewer(getChatPartnerAvatarFull(chat) || getChatPartnerAvatar(chat)); }}
                                    />
                                  ) : initialsFrom(getChatPartnerName(chat))}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <h4 className="font-medium text-white truncate">{getChatPartnerName(chat)}</h4>
                                    {chat.lastMessageSenderId !== user.uid && chat.updatedAt > lastChatVisit ? (
                                      <span className="inline-block mt-1 px-2 py-0.5 bg-white text-black text-[10px] font-bold rounded-sm uppercase tracking-wider">Neu</span>
                                    ) : (
                                      <p className="text-xs text-neutral-500 truncate mt-0.5">Tippen zum Öffnen...</p>
                                    )}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); toggleMuteChat(chat.id); }} className={`p-2 rounded-lg border transition-colors ${isMuted ? 'bg-neutral-950 text-white border-neutral-500' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-500'}`} title={isMuted ? 'Stumm aus' : 'Stumm schalten'}>
                                    {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }} className={`p-2 rounded-lg border transition-colors ${isPinned ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-500'}`} title={isPinned ? 'Unpin' : 'Pin'}>
                                    <Pin className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto border-x border-neutral-900 overflow-hidden" onClick={() => setSelectedMessageId(null)}>
                      {isMessageSearchOpen && (
                        <div className="px-4 py-2 bg-neutral-950 border-b border-neutral-900 flex items-center gap-2 shrink-0">
                          <Search className="w-4 h-4 text-neutral-500" />
                          <input
                            id="msgSearchInput"
                            value={messageSearchQuery}
                            onChange={(e) => setMessageSearchQuery(e.target.value)}
                            placeholder="Nachrichten durchsuchen..."
                            className="flex-1 bg-black border border-neutral-800 text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:border-neutral-500"
                          />
                          <button onClick={() => { setMessageSearchQuery(''); setMessageMatchIndex(0); }} className="p-2 text-neutral-400 hover:text-white" title="Leeren">
                            <X className="w-4 h-4" />
                          </button>
                          {(messageSearchQuery || '').trim() !== '' && (
                            <div className="flex items-center gap-1 text-xs text-neutral-500">
                              <button type="button" onClick={() => { if (messageMatches.length === 0) return; setMessageMatchIndex(i => (i - 1 + messageMatches.length) % messageMatches.length); }} className="p-2 hover:text-white" title="Vorheriger Treffer">
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="min-w-[64px] text-center">{messageMatches.length === 0 ? '0/0' : `${Math.min(messageMatchIndex + 1, messageMatches.length)}/${messageMatches.length}`}</span>
                              <button type="button" onClick={() => { if (messageMatches.length === 0) return; setMessageMatchIndex(i => (i + 1) % messageMatches.length); }} className="p-2 hover:text-white" title="Nächster Treffer">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 flex flex-col">
                        {chatMessages.map((msg) => {
                          const isMe = msg.senderId === user.uid;
                          const showActions = selectedMessageId === msg.id;
                          
                          return (
                            <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div 
                                onClick={(e) => { e.stopPropagation(); setSelectedMessageId(showActions ? null : msg.id); }}
                                className={`max-w-[85%] rounded-2xl p-3 cursor-pointer transition-colors relative ${isMe ? 'bg-white text-black rounded-tr-sm hover:bg-gray-200' : 'bg-neutral-900 border border-neutral-800 text-white rounded-tl-sm hover:bg-neutral-800'}${isMessageSearchOpen && (messageSearchQuery || '').trim() && (msg.text || '').toLowerCase().includes((messageSearchQuery || '').trim().toLowerCase()) ? ' ring-2 ring-white/70' : ''}`}
                              >
                                {/* Selbstzerstörungs-Indikator */}
                                {msg.selfDestruct && (
                                  <div className="text-[10px] text-red-500 font-bold mb-2 flex items-center gap-1">
                                    <Bomb className="w-3 h-3" /> Zerstört sich nach Lesen
                                  </div>
                                )}
{!msg.deleted && msg.image && (
                                  <img
                                    src={msg.image}
                                    alt="Upload"
                                    className="rounded-lg mb-2 max-h-64 object-contain cursor-zoom-in"
                                    onClick={(e) => { e.stopPropagation(); openImageViewer(msg.image); }}
                                  />
                                )}
                                {!msg.deleted && msg.audio && <audio src={msg.audio} controls className="mb-2 w-full" />}
                                
                                {/* Termin-Kachel Rendering */}
                                {!msg.deleted && msg.event && (
                                  <div className={`mt-2 p-3 rounded-xl border ${isMe ? 'bg-black/10 border-black/20' : 'bg-black/40 border-neutral-700'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <CalendarIcon className="w-4 h-4" />
                                      <span className="font-bold">{msg.event.title}</span>
                                    </div>
                                    <div className="text-xs mb-3 opacity-80">
                                      {msg.event.date} um {msg.event.time} Uhr
                                    </div>
                                    {!isMe && (
                                      <button onClick={(e) => { e.stopPropagation(); acceptSharedEvent(msg.event); }} className="w-full bg-white text-black py-1.5 rounded-md text-xs font-bold hover:bg-gray-200 transition-colors">
                                        Zusagen & Eintragen
                                      </button>
                                    )}
                                  </div>
                                )}

                                {msg.deleted ? (
                                  <p className={`text-sm italic whitespace-pre-wrap ${isMe ? 'text-neutral-600' : 'text-neutral-500'}`}>
                                    Nachricht gelöscht
                                  </p>
                                ) : (
                                  msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                )}
                                
                                <div className={`flex items-center gap-1 mt-1 justify-end opacity-60 ${isMe ? 'text-black' : 'text-neutral-400'}`}>
                                  {msg.deleted && <span className="text-[9px] mr-1">(gelöscht)</span>}
                                  {!msg.deleted && msg.edited && <span className="text-[9px] mr-1">(bearbeitet)</span>}
                                  <span className="text-[10px] block text-right">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                  {isMe && (
                                    <span className="text-[10px] ml-1">
                                      {(() => {
                                        const chat = activeChatData || activeChat;
                                        const group = isGroupChat(chat);
                                        if (group) {
                                          const ids = getChatParticipants(chat);
                                          const lastRead = (activeChatData && activeChatData.lastRead) ? activeChatData.lastRead : (chat && chat.lastRead) ? chat.lastRead : {};
                                          const denom = Math.max(0, ids.length - 1);
                                          const seenCount = ids.filter(id => id !== user.uid && (lastRead?.[id] || 0) >= (msg.timestamp || 0)).length;
                                          if (seenCount > 0) return `gesehen von ${seenCount}/${denom}`;
                                          return 'gesendet';
                                        }
                                        if (msg.readAt) return `gesehen um ${formatTime(msg.readAt)}`;
                                        if (msg.read) return 'gesehen';
                                        if (msg.deliveredAt) return `zugestellt um ${formatTime(msg.deliveredAt)}`;
                                        if (msg.delivered) return 'zugestellt';
                                        return 'gesendet';
                                      })()}
                                    </span>
                                  )}
                                </div>

                                {showActions && (
                                  <div className={`absolute top-full mt-1 flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-lg p-1 z-10 shadow-xl ${isMe ? 'right-0' : 'left-0'}`}>
                                    
                                    {isMe && !msg.deleted && !msg.pending && !String(msg.id || '').startsWith('local_') && !msg.image && !msg.audio && !msg.event && (
                                      <button onClick={(e) => { e.stopPropagation(); setEditingMessage(msg); setNewMessageText(msg.text); setSelectedMessageId(null); document.getElementById('chatInput').focus(); }} className="p-2 text-white hover:bg-neutral-700 rounded-md" title="Bearbeiten"><Edit2 className="w-4 h-4" /></button>
                                    )}
                                    {isMe && !msg.deleted && !msg.pending && !String(msg.id || '').startsWith('local_') && (
                                      <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }} className="p-2 text-red-400 hover:bg-neutral-700 rounded-md" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="p-4 bg-neutral-950 border-t border-neutral-900 shrink-0">
                        {editingMessage && (
                          <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2 px-3 rounded-t-xl text-xs text-neutral-400 border-b-0">
                            <span className="truncate">Nachricht bearbeiten...</span>
                            <button onClick={() => { setEditingMessage(null); setNewMessageText(''); }} className="hover:text-white shrink-0 ml-2"><X className="w-4 h-4"/></button>
                          </div>
                        )}

                        <form onSubmit={(e) => sendMessage(e)} className="flex items-end gap-2 relative">
                          <div className={`relative shrink-0 flex gap-1 ${editingMessage ? 'hidden' : ''} overflow-x-auto no-scrollbar`}>
                            <label className="cursor-pointer p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-500 transition-colors rounded-full flex items-center justify-center shrink-0" title="Bild senden">
                              <ImageIcon className="w-5 h-5 text-neutral-400" /><input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleImageUpload} />
                            </label>

                            <label className="cursor-pointer p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-500 transition-colors rounded-full flex items-center justify-center shrink-0" title="Foto machen">
                              <Camera className="w-5 h-5 text-neutral-400" /><input type="file" accept="image/*,.heic,.heif" capture="environment" className="hidden" onChange={handleImageUpload} />
                            </label>
                            
                            <button type="button" onClick={() => setIsShareEventModalOpen(true)} className="p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-500 transition-colors rounded-full flex items-center justify-center text-neutral-400 hover:text-white shrink-0" title="Termin teilen">
                              <CalendarPlus className="w-5 h-5" />
                            </button>

                            <button type="button" onClick={() => setSelfDestruct(!selfDestruct)} className={`p-3 border transition-colors rounded-full flex items-center justify-center shrink-0 hidden sm:flex ${selfDestruct ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-500 text-neutral-400'}`} title="Snapchat-Modus (10s)">
                              <Bomb className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <div className="flex-1 relative">
                            {isRecording ? (
                              <div className="w-full bg-red-950 border border-red-900 text-red-500 rounded-2xl pl-4 pr-12 py-3 flex items-center justify-between animate-pulse">
                                <span className="text-sm font-medium">Aufnahme läuft...</span>
                              </div>
                            ) : (
                              <textarea 
                                id="chatInput"
                                value={newMessageText} 
                                onChange={handleTyping} 
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} 
                                placeholder="Nachricht..." 
                                rows="1" 
                                className={`w-full bg-black border border-neutral-800 text-white pl-4 pr-24 py-3 focus:outline-none focus:border-neutral-500 transition-colors resize-none overflow-y-auto block text-sm ${(editingMessage) ? 'rounded-b-2xl rounded-t-none border-t-0' : 'rounded-2xl'} ${selfDestruct ? 'border-red-900/50 focus:border-red-500' : ''}`} 
                                style={{ minHeight: '44px', maxHeight: '120px' }} 
                              />
                            )}
                            
                            <div className="absolute right-1 bottom-1 flex items-center">
                              {!newMessageText.trim() && !editingMessage && (
                                <button 
                                  type="button" 
                                  onClick={isRecording ? stopRecording : startRecording} 
                                  className={`p-2 rounded-full transition-colors ${isRecording ? 'text-red-500 hover:bg-red-900/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                                >
                                  {isRecording ? <Square className="w-5 h-5" fill="currentColor" /> : <Mic className="w-5 h-5" />}
                                </button>
                              )}
                              
                              {(!isRecording && (newMessageText.trim() || editingMessage)) && (
                                <button
                                  type="submit"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onPointerDown={(e) => e.preventDefault()}
                                  className="p-2 text-white hover:bg-neutral-800 rounded-full transition-colors"
                                  title="Senden"
                                >
                                  <Send className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </ErrorBoundary>
            )}
          </main>

          
          {/* WETTER MODAL */}
          {isWeatherModalOpen && (
            <div className="fixed inset-0 z-[75] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={() => { setIsWeatherModalOpen(false); setSearchResults([]); }}>
              <div className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">Wetter</p>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-neutral-400" /> {location.name}</h3>
                  </div>
                  <button onClick={() => { setIsWeatherModalOpen(false); setSearchResults([]); }} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="Schließen">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-black border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-light">{weather ? `${Math.round(weather.temperature)}°` : '--°'}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {weather ? `Wind ${Math.round(weather.windspeed || 0)} km/h` : 'Lade Daten…'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {getWeatherIcon(weather?.weathercode, "w-12 h-12 text-white")}
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">Vorhersage</h4>
                  <div className="space-y-2">
                    {(dailyForecast?.time || []).slice(0, 7).map((d, i) => (
                      <div key={d} className="flex items-center justify-between bg-black border border-neutral-800 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 text-[11px] font-semibold text-neutral-300">{formatDayName(d)}</div>
                          <div className="flex items-center gap-2">
                            {getWeatherIcon(dailyForecast?.weathercode?.[i], "w-5 h-5 text-white")}
                            <span className="text-xs text-neutral-400">{new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="text-sm tabular-nums">
                          <span className="text-white">{Math.round(dailyForecast?.temperature_2m_max?.[i] ?? 0)}°</span>
                          <span className="text-neutral-600 mx-1">/</span>
                          <span className="text-neutral-400">{Math.round(dailyForecast?.temperature_2m_min?.[i] ?? 0)}°</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">Standort suchen</h4>
                  <form onSubmit={handleSearchLocation} className="flex gap-2">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ort (z.B. Zürich)…"
                      className="flex-1 bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                    />
                    <button type="submit" className="px-4 py-3 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                      <Search className="w-4 h-4" />
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="mt-3 bg-black border border-neutral-800 rounded-xl overflow-hidden">
                      {searchResults.map((loc) => (
                        <button
                          key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                          onClick={() => { selectLocation(loc); }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-neutral-900 transition-colors border-b border-neutral-900 last:border-0"
                        >
                          <span className="text-white font-medium">{loc.name}</span>
                          <span className="text-neutral-500 text-xs ml-2">{loc.admin1 ? `${loc.admin1}` : ''} {loc.country ? `• ${loc.country}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={async () => { await fetchWeather(); showToast("Aktualisiert"); }}
                    className="flex-1 py-3 rounded-lg text-sm bg-neutral-900 border border-neutral-800 hover:border-neutral-500 text-neutral-300 hover:text-white transition-colors"
                  >
                    Aktualisieren
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsWeatherModalOpen(false); setSearchResults([]); }}
                    className="flex-1 py-3 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EVENT MODAL */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[85] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={closeEventModal}>
              <div className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">{eventToEdit ? 'Bearbeiten' : 'Neu'}</p>
                    <h3 className="text-lg font-medium text-white">{eventToEdit ? 'Termin bearbeiten' : 'Neuer Termin'}</h3>
                  </div>
                  <button onClick={closeEventModal} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="Schließen">
                    <X className="w-5 h-5" />
                  </button>
                </div>


                {eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && (
                  <div className="mb-4 p-4 bg-black border border-neutral-800 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-2">Änderung gilt für</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEventEditScope('single'); setEventForm(prev => ({ ...prev, date: selectedDateForEvent })); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${eventEditScope === 'single' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}>Nur dieses Datum</button>
                      <button type="button" onClick={() => { setEventEditScope('series'); setEventForm(prev => ({ ...prev, date: eventToEdit.date })); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${eventEditScope === 'series' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}>Ganze Serie</button>
                    </div>
                    <p className="mt-2 text-[11px] text-neutral-500">Aktuelles Datum: <span className="text-neutral-300">{selectedDateForEvent}</span></p>
                  </div>
                )}

                <form onSubmit={saveEvent} className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Titel</label>
                    <input
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="z.B. Arzttermin"
                      className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Datum</label>
                      <input
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                        disabled={ eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' }
                        className={`mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500 ${eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Zeit</label>
                      <input
                        type="time"
                        value={eventForm.time}
                        onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                        className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                      />
                    </div>
                  </div>

                  <div className="bg-black border border-neutral-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Erinnerung</label>
                      {!eventForm.time && <span className="text-[10px] text-neutral-500">benötigt Uhrzeit</span>}
                    </div>
                    <select
                      value={(eventForm.reminderMode === 'custom') ? String(eventForm.reminderMinutes ?? 15) : (eventForm.reminderMode === 'none' ? 'none' : 'default')}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'default') {
                          setEventForm(prev => ({ ...prev, reminderMode: 'default' }));
                        } else if (v === 'none') {
                          setEventForm(prev => ({ ...prev, reminderMode: 'none', reminderMinutes: 15 }));
                        } else {
                          const m = parseInt(v, 10);
                          setEventForm(prev => ({ ...prev, reminderMode: 'custom', reminderMinutes: isNaN(m) ? 15 : m }));
                        }
                      }}
                      className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                    >
                      <option value="default">Standard (Einstellungen)</option>
                      <option value="none">Keine</option>
                      <option value="0">Bei Beginn</option>
                      <option value="5">5 Minuten vorher</option>
                      <option value="10">10 Minuten vorher</option>
                      <option value="15">15 Minuten vorher</option>
                      <option value="30">30 Minuten vorher</option>
                      <option value="60">1 Stunde vorher</option>
                      <option value="120">2 Stunden vorher</option>
                      <option value="1440">1 Tag vorher</option>
                    </select>
                    <p className="mt-2 text-[11px] text-neutral-500">Hinweis: In der PWA funktionieren Erinnerungen zuverlässig, wenn Benachrichtigungen erlaubt sind und Onyx mindestens im Hintergrund aktiv ist.</p>
                  </div>


                  <div className="bg-black border border-neutral-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Wiederholung</label>
                      {eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' && (
                        <span className="text-[10px] text-neutral-500">nur in Serie änderbar</span>
                      )}
                    </div>
                    <select
                      value={eventForm.recurrenceFreq}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEventForm(prev => {
                          const next = { ...prev, recurrenceFreq: v };
                          if (v === 'NONE') {
                            next.recurrenceInterval = 1; next.recurrenceByWeekdays = []; next.recurrenceUntil = '';
                          } else if (v === 'WEEKLY') {
                            if (!Array.isArray(next.recurrenceByWeekdays) || next.recurrenceByWeekdays.length === 0) {
                              const wd = next.date ? weekdayIndexMon0(next.date) : 0;
                              next.recurrenceByWeekdays = [wd];
                            }
                            if (!next.recurrenceInterval) next.recurrenceInterval = 1;
                          } else {
                            next.recurrenceByWeekdays = [];
                            if (!next.recurrenceInterval) next.recurrenceInterval = 1;
                          }
                          return next;
                        });
                      }}
                      disabled={ eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' }
                      className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                    >
                      <option value="NONE">Keine</option>
                      <option value="DAILY">Täglich</option>
                      <option value="WEEKLY">Wöchentlich</option>
                      <option value="MONTHLY">Monatlich</option>
                    </select>

                    {eventForm.recurrenceFreq !== 'NONE' && (
                      <div className="mt-3 space-y-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Intervall</label>
                            <input
                              type="number"
                              min="1"
                              value={eventForm.recurrenceInterval}
                              onChange={(e) => setEventForm(prev => ({ ...prev, recurrenceInterval: parseInt(e.target.value || '1', 10) || 1 }))}
                              disabled={ eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' }
                              className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Bis (optional)</label>
                            <input
                              type="date"
                              value={eventForm.recurrenceUntil}
                              onChange={(e) => setEventForm(prev => ({ ...prev, recurrenceUntil: e.target.value }))}
                              disabled={ eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' }
                              className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                            />
                          </div>
                        </div>

                        {eventForm.recurrenceFreq === 'WEEKLY' && (
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Wochentage</label>
                            <div className="mt-2 grid grid-cols-7 gap-1">
                              {WOCHENTAGE.map((wd, idx) => (
                                <button
                                  key={wd}
                                  type="button"
                                  onClick={() => setEventForm(prev => {
                                    const set = new Set(Array.isArray(prev.recurrenceByWeekdays) ? prev.recurrenceByWeekdays : []);
                                    if (set.has(idx)) set.delete(idx); else set.add(idx);
                                    return { ...prev, recurrenceByWeekdays: Array.from(set).sort((a,b) => a-b) };
                                  })}
                                  disabled={ eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' }
                                  className={`py-2 rounded-md text-[10px] font-semibold border transition-colors ${eventForm.recurrenceByWeekdays.includes(idx) ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}
                                >
                                  {wd}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Kategorie</label>
                    <input
                      list="eventTypeList"
                      value={eventForm.type}
                      onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                      placeholder="z.B. Arbeit"
                      className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                    />
                    <datalist id="eventTypeList">
                      <option value="Privat" />
                      <option value="Arbeit" />
                      <option value="Projekt" />
                      <option value="Geburtstag" />
                      <option value="Erinnerung" />
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Beschreibung</label>
                    <textarea
                      value={eventForm.desc}
                      onChange={(e) => setEventForm(prev => ({ ...prev, desc: e.target.value }))}
                      placeholder="Optional…"
                      rows={3}
                      className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Kalender</label>
                    <select
                      value={eventForm.calendarId}
                      onChange={(e) => setEventForm(prev => ({ ...prev, calendarId: e.target.value }))}
                      disabled={ eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' }
                      className={`mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500 ${eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="default">Privat (Standard)</option>
                      {customCalendars
                        .filter(c => c.type !== 'shift' && (c.ownerId === user.uid || c.sharedWith?.[user.uid] === 'write'))
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.ownerId !== user.uid ? ' (geteilt)' : ''}
                          </option>
                        ))
                      }
                    </select>
                    <p className="mt-1 text-[11px] text-neutral-500">{(eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single') ? 'Hinweis: Einzelnes Vorkommen kann nicht in einen anderen Kalender verschoben werden.' : 'Schichtpläne können nur über die Tagesauswahl bearbeitet werden.'}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {eventToEdit ? (
                      (eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date) ? (
                        <>
                          <button type="button" onClick={() => deleteEvent('single')} className="py-3 px-4 rounded-lg text-sm text-red-300 bg-red-500/10 border border-red-900/40 hover:bg-red-500/20 transition-colors">
                            Dieses Datum
                          </button>
                          <button type="button" onClick={() => deleteEvent('series')} className="py-3 px-4 rounded-lg text-sm text-red-500 bg-red-500/10 border border-red-900/40 hover:bg-red-500/20 transition-colors">
                            Serie
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => deleteEvent('series')} className="py-3 px-4 rounded-lg text-sm text-red-500 bg-red-500/10 border border-red-900/40 hover:bg-red-500/20 transition-colors">
                          Löschen
                        </button>
                      )
                    ) : (
                      <button type="button" onClick={closeEventModal} className="py-3 px-4 rounded-lg text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 hover:text-white transition-colors">
                        Abbrechen
                      </button>
                    )}
                    <button type="submit" className="flex-1 py-3 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors">
                      Speichern
                    </button>
                  </div>

                  {eventToEdit && (
                    <button type="button" onClick={closeEventModal} className="w-full py-3 rounded-lg text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 hover:text-white transition-colors">
                      Schließen
                    </button>
                  )}
                </form>


{eventToEdit && (
  <div className="mt-4 pt-4 border-t border-neutral-800">
    <div className="flex gap-2 mb-3">
      <button
        type="button"
        onClick={() => { setShowEventComments(v => !v); setShowEventPoll(false); }}
        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${showEventComments ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}
      >
        💬 Kommentare
      </button>
      <button
        type="button"
        onClick={() => { setShowEventPoll(v => !v); setShowEventComments(false); initPollDraftFromEvent(modalEvent || eventToEdit); }}
        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${showEventPoll ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}
      >
        🗳️ Abstimmung
      </button>
    </div>

    {showEventComments && (
      <div className="bg-black border border-neutral-800 rounded-2xl p-3">
        <div className="h-48 overflow-auto space-y-2 pr-1">
          {eventComments.length === 0 ? (
            <div className="text-xs text-neutral-500">Noch keine Kommentare.</div>
          ) : eventComments.map((c) => (
            <div
              key={c.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${c.senderId === user.uid ? 'bg-white text-black ml-auto' : 'bg-neutral-900 text-white'}`}
            >
              <div className="text-[10px] opacity-70 mb-1">{c.senderId === user.uid ? 'Du' : (c.senderName || 'User')}</div>
              <div className="text-sm whitespace-pre-wrap">{c.text}</div>
              <div className="text-[10px] opacity-60 mt-1">{c.timestamp ? new Date(c.timestamp).toLocaleString('de-CH') : ''}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Kommentar..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
          <button
            type="button"
            onClick={sendEventComment}
            className="px-3 py-2 rounded-lg bg-white text-black font-semibold text-sm"
          >
            Senden
          </button>
        </div>
      </div>
    )}

    {showEventPoll && (
      <div className="bg-black border border-neutral-800 rounded-2xl p-3 space-y-3">
        {modalEvent && modalEvent.poll && modalEvent.poll.status === 'closed' && (
          <div className="text-xs text-neutral-400">
            Letzte Abstimmung geschlossen ✅
          </div>
        )}

        {(!modalEvent || !modalEvent.poll || modalEvent.poll.status !== 'open') ? (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">
              3 Vorschläge senden → Mitglieder mit <span className="text-white">Schreibrecht</span> im Kalender stimmen ab. Gewinner wird automatisch gesetzt.
            </p>

            {[0,1,2].map((i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="date"
                  value={pollDraft[i]?.date || ''}
                  onChange={(e) => setPollDraft(prev => prev.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x))}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                />
                <input
                  type="time"
                  value={pollDraft[i]?.time || ''}
                  onChange={(e) => setPollDraft(prev => prev.map((x, idx) => idx === i ? { ...x, time: e.target.value } : x))}
                  className="w-28 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                />
              </div>
            ))}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={pollBusy}
                onClick={createPollForEvent}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm ${pollBusy ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-black'}`}
              >
                Vorschläge senden
              </button>
              <button
                type="button"
                onClick={() => initPollDraftFromEvent(modalEvent || eventToEdit)}
                className="px-3 py-2 rounded-lg border border-neutral-800 text-neutral-300 text-sm hover:border-neutral-500"
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-neutral-400">
                Abstimmung läuft • {Object.keys(modalEvent.poll.votes || {}).length}/{(modalEvent.poll.voterIds || []).length} Stimmen
              </div>
              <button
                type="button"
                disabled={pollBusy}
                onClick={finalizePollForEvent}
                className={`px-3 py-2 rounded-lg font-semibold text-xs ${pollBusy ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-black'}`}
              >
                Gewinner übernehmen
              </button>
            </div>

            <div className="space-y-2">
              {(modalEvent.poll.options || []).map((opt) => {
                const myVote = (modalEvent.poll.votes || {})[user.uid] || '';
                const counts = countVotes(modalEvent.poll.votes || {});
                const c = counts[opt.id] || 0;
                const voted = myVote === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => voteInPoll(opt.id)}
                    className={`w-full text-left border rounded-xl px-3 py-2 ${voted ? 'border-white bg-neutral-900' : 'border-neutral-800 hover:border-neutral-500'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white">{opt.date} • {opt.time}</div>
                      <div className="text-xs text-neutral-400">{c} Vote{c === 1 ? '' : 's'}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-neutral-500">
              Du hast {((modalEvent.poll.votes || {})[user.uid]) ? 'abgestimmt ✅' : 'noch nicht abgestimmt'}.
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}
              </div>
            </div>
          )}

          {/* KALENDER VERWALTEN MODAL */}
          {isCalManageModalOpen && (
            <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={() => setIsCalManageModalOpen(false)}>
              <div className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">{calForm?.id ? 'Bearbeiten' : 'Neu'}</p>
                    <h3 className="text-lg font-medium text-white">{calForm?.id ? 'Kalender bearbeiten' : 'Neuer Kalender'}</h3>
                  </div>
                  <button onClick={() => setIsCalManageModalOpen(false)} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="Schließen">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={saveCalendarSettings} className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Name</label>
                    <input
                      value={calForm?.name || ''}
                      onChange={(e) => setCalForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="z.B. Arbeit / Schule / Team"
                      className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Typ</label>
                    <select
                      value={calForm?.type || 'normal'}
                      onChange={(e) => setCalForm(prev => ({ ...prev, type: e.target.value, shifts: prev.shifts || [] }))}
                      className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                    >
                      <option value="normal">Normal (Termine)</option>
                      <option value="shift">Schichtplan (Farben)</option>
                    </select>
                    <p className="mt-1 text-[11px] text-neutral-500">Schichtplan: Tippen wechselt Schichten, lang drücken öffnet Auswahl, „Pinsel“ malt mehrere Tage.</p>
                  </div>

                  {calForm?.type === 'shift' && (
                    <div className="bg-black border border-neutral-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">Schichten</h4>
                        <button type="button" onClick={addShiftToForm} className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-gray-200 transition-colors">
                          + Schicht
                        </button>
                      </div>

                      {(calForm.shifts || []).length === 0 ? (
                        <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-4 text-center">
                          Noch keine Schichten. Füge mindestens eine hinzu.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[45vh] overflow-y-auto no-scrollbar pr-1">
                          {(calForm.shifts || []).map((sh) => (
                            <div key={sh.id} className="border border-neutral-800 rounded-xl p-3 bg-neutral-950/30">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={sh.color || '#ffffff'}
                                  onChange={(e) => updateShiftInForm(sh.id, 'color', e.target.value)}
                                  className="w-12 h-10 bg-transparent border border-neutral-800 rounded-lg"
                                  title="Farbe"
                                />
                                <input
                                  value={sh.name || ''}
                                  onChange={(e) => updateShiftInForm(sh.id, 'name', e.target.value)}
                                  placeholder="Name (z.B. Früh)"
                                  className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                                />
                                <button type="button" onClick={() => removeShiftFromForm(sh.id)} className="p-2 border border-red-900/30 bg-red-900/10 rounded-lg text-red-500 hover:bg-red-900/30 transition-colors" title="Entfernen">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="mt-2">
                                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Zeit</label>
                                <input
                                  type="time"
                                  value={sh.time || '08:00'}
                                  onChange={(e) => updateShiftInForm(sh.id, 'time', e.target.value)}
                                  className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setIsCalManageModalOpen(false)} className="flex-1 py-3 rounded-lg text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 hover:text-white transition-colors">
                      Abbrechen
                    </button>
                    <button type="submit" className="flex-1 py-3 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors">
                      Speichern
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* KALENDER TEILEN MODAL */}
          {isShareCalModalOpen && shareCalData && (
            <div className="fixed inset-0 z-[82] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={() => { setIsShareCalModalOpen(false); setShareUsername(''); }}>
              <div className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">Teilen</p>
                    <h3 className="text-lg font-medium text-white">{shareCalData.name}</h3>
                  </div>
                  <button onClick={() => { setIsShareCalModalOpen(false); setShareUsername(''); }} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="Schließen">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={shareCalendar} className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">E-Mail</label>
                    <input
                      value={shareUsername}
                      onChange={(e) => setShareUsername(e.target.value)}
                      placeholder="E-Mail Adresse (z.B. name@mail.com)"
                      className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                      required
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">Hinweis: Der andere Nutzer muss sich einmal registriert haben, damit sein Profil über E-Mail gefunden wird.</p>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Rechte</label>
                    <select
                      value={sharePerm}
                      onChange={(e) => setSharePerm(e.target.value)}
                      className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                    >
                      <option value="read">Nur Lesen</option>
                      <option value="write">Lesen & Schreiben</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full py-3 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors">
                    Freigeben
                  </button>
                </form>

                <div className="mt-5">
                  <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">Aktive Freigaben</h4>
                  {Object.keys(shareCalData.sharedWith || {}).length === 0 ? (
                    <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-4 text-center">
                      Noch keine Freigaben.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[35vh] overflow-y-auto no-scrollbar pr-1">
                      {Object.entries(shareCalData.sharedWith || {}).map(([uid, perm]) => (
                        <div key={uid} className="flex items-center justify-between bg-black border border-neutral-800 rounded-xl px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-white font-medium">{getProfile(uid)?.username || shortId(uid,6)}</span>
                            <span className="text-[11px] text-neutral-500">{perm === 'write' ? 'Lesen & Schreiben' : 'Nur Lesen'}</span>
                          </div>
                          <button onClick={() => unshareCalendar(shareCalData.id, uid)} className="p-2 border border-red-900/30 bg-red-900/10 rounded-lg text-red-500 hover:bg-red-900/30 transition-colors" title="Entfernen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => { setIsShareCalModalOpen(false); setShareUsername(''); }}
                    className="w-full py-3 rounded-lg text-sm bg-neutral-900 border border-neutral-800 hover:border-neutral-500 text-neutral-300 hover:text-white transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* SCHICHT AUSWAHL MODAL (Langes Drücken) */}
          {shiftModalData && (
             <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={() => setShiftModalData(null)}>
                <div className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-xs rounded-t-2xl sm:rounded-xl p-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                   <h3 className="text-white font-medium mb-1 text-center">Schicht wählen</h3>
                   <p className="text-neutral-500 text-xs text-center mb-4 border-b border-neutral-800 pb-3">{new Date(shiftModalData.dateStr).toLocaleDateString('de-DE')}</p>
                   
                   <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                      {shiftModalData.shifts.map(s => (
                         <button key={s.id} onClick={() => handleShiftModalSelect(s)} className="w-full py-3 rounded-xl text-sm font-semibold text-black transition-transform active:scale-95 shadow-sm" style={{backgroundColor: s.color}}>
                            {s.name} <span className="font-normal opacity-70 ml-2">{s.time}</span>
                         </button>
                      ))}
                      <button onClick={() => handleShiftModalSelect('delete')} className="w-full py-3 rounded-xl text-sm font-medium text-red-500 bg-red-500/10 border border-red-900/50 hover:bg-red-500/20 mt-4 transition-colors">
                         Frei / Löschen
                      </button>
                   </div>
                </div>
             </div>
          )}

          {showCreateGroup && (
            <div className="fixed inset-0 z-[75] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
                <button onClick={() => setShowCreateGroup(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-medium text-white mb-1">Gruppe erstellen</h3>
                <p className="text-xs text-neutral-500 mb-6">Mindestens 3 Teilnehmer (du + 2)</p>

                <label className="text-xs text-neutral-400">Gruppenname</label>
                <input value={groupDraftName} onChange={(e) => setGroupDraftName(e.target.value)} placeholder="z.B. Team, Familie…" className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500 mt-2" />

                <div className="mt-5">
                  <label className="text-xs text-neutral-400">Mitglieder hinzufügen</label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input value={groupMemberSearch} onChange={(e) => setGroupMemberSearch(e.target.value)} placeholder="Name suchen…" className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-neutral-500" />
                  </div>

                  {(groupMemberSearch || '').trim() !== '' && (
                    <div className="mt-2 max-h-52 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl">
                      {allProfiles
                        .filter(p => p.id !== user.uid)
                        .filter(p => (p.username || '').toLowerCase().includes(groupMemberSearch.toLowerCase()))
                        .filter(p => !(groupDraftMembers || []).includes(p.id))
                        .slice(0, 20)
                        .map(p => (
                          <div key={p.id} onClick={() => { setGroupDraftMembers(prev => Array.from(new Set([...(prev || []), p.id]))); setGroupMemberSearch(''); }} className="p-3 border-b border-neutral-800 last:border-0 hover:bg-neutral-800 cursor-pointer flex items-center gap-3">
                            <div className="w-9 h-9 bg-black border border-neutral-700 rounded-full flex items-center justify-center text-neutral-400 font-medium uppercase overflow-hidden">
                              {p.avatarBase64 ? (
                                 <img
                                   src={p.avatarThumbBase64 || p.avatarBase64}
                                   className="w-full h-full object-cover cursor-zoom-in"
                                   alt="Profilbild"
                                   onClick={(e) => { e.stopPropagation(); openImageViewer(p.avatarFullBase64 || p.avatarBase64 || p.avatarThumbBase64); }}
                                 />
                               ) : (p.username || '?').substring(0,2)}
                            </div>
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{p.username}</div>
                              <div className="text-xs text-neutral-500">{getPresence(p.id).online ? 'online' : (getPresence(p.id).lastSeen ? `zuletzt ${formatTime(getPresence(p.id).lastSeen)}` : 'offline')}</div>
                            </div>
                            <Plus className="w-4 h-4 text-neutral-400" />
                          </div>
                        ))}
                      {allProfiles.filter(p => p.id !== user.uid).filter(p => (p.username || '').toLowerCase().includes(groupMemberSearch.toLowerCase())).filter(p => !(groupDraftMembers || []).includes(p.id)).length === 0 && (
                        <div className="p-3 text-neutral-500 text-sm text-center">Kein Treffer</div>
                      )}
                    </div>
                  )}

                  {(groupDraftMembers || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {groupDraftMembers.map(id => {
                        const p = getProfile(id);
                        return (
                          <span key={id} className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-white text-xs px-3 py-1.5 rounded-full">
                            {(p?.username || 'User').substring(0, 18)}
                            <button onClick={(e) => { e.stopPropagation(); setGroupDraftMembers(prev => (prev || []).filter(x => x !== id)); }} className="text-neutral-400 hover:text-white">×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-2">
                  <button onClick={() => setShowCreateGroup(false)} className="flex-1 bg-neutral-900 border border-neutral-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-neutral-800">Abbrechen</button>
                  <button onClick={() => createGroupChat()} disabled={(groupDraftMembers || []).length < 2} className={`flex-1 py-3 rounded-xl text-sm font-semibold ${((groupDraftMembers || []).length < 2) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}`}>
                    Erstellen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PARTNER STATS MODAL */}
          {showPartnerStats && activeChat && (
             <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
                   <button onClick={() => setShowPartnerStats(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X className="w-5 h-5"/></button>
                   <div className="flex flex-col items-center mb-8">
                     {getChatPartnerAvatar(activeChat) ? (
                        <img
                        src={getChatPartnerAvatar(activeChat)}
                        className="w-20 h-20 rounded-full border-2 border-neutral-700 object-cover mb-4 cursor-zoom-in"
                        alt="Profilbild"
                        onClick={(e) => { e.stopPropagation(); openImageViewer(getChatPartnerAvatarFull(activeChat) || getChatPartnerAvatar(activeChat)); }}
                      />
                      ) : (
                        <div className="w-20 h-20 bg-neutral-900 border-2 border-neutral-700 rounded-full flex items-center justify-center text-2xl font-bold text-white uppercase mb-4">{initialsFrom(getChatPartnerName(activeChat))}</div>
                      )}
                      <h3 className="text-xl font-medium text-white">{getChatPartnerName(activeChat)}</h3>
                      <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Chat Analyse</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     {isGroupChat(activeChatData || activeChat) ? (
                       <>
                         <div className="bg-black border border-neutral-800 p-4 rounded-xl text-center">
                           <p className="text-xs text-neutral-500 uppercase mb-1">Mitglieder</p>
                           <p className="text-2xl font-light text-white">{getChatParticipants(activeChatData || activeChat).length}</p>
                         </div>
                         <div className="bg-black border border-neutral-800 p-4 rounded-xl text-center">
                           <p className="text-xs text-neutral-500 uppercase mb-1">Online</p>
                           <p className="text-2xl font-light text-white">{getChatParticipants(activeChatData || activeChat).filter(id => getPresence(id).online).length}</p>
                         </div>
                       </>
                     ) : (
                       <>
                         <div className="bg-black border border-neutral-800 p-4 rounded-xl text-center">
                           <p className="text-xs text-neutral-500 uppercase mb-1">Von Dir</p>
                           <p className="text-2xl font-light text-white">{chatMessages.filter(m => m.senderId === user.uid).length}</p>
                         </div>
                         <div className="bg-black border border-neutral-800 p-4 rounded-xl text-center">
                           <p className="text-xs text-neutral-500 uppercase mb-1">Von {safeTrim(getChatPartnerName(activeChat), "Unbekannt").slice(0,6)}.</p>
                           <p className="text-2xl font-light text-white">{chatMessages.filter(m => m.senderId !== user.uid).length}</p>
                         </div>
                       </>
                     )}
                   </div>

                   {isGroupChat(activeChatData || activeChat) && (
                     <div className="mt-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                       <p className="text-xs text-neutral-500 uppercase tracking-widest mb-3">Mitglieder</p>
                       <div className="max-h-48 overflow-y-auto space-y-2">
                         {getChatParticipants(activeChatData || activeChat).map(uid => {
                           const p = getProfile(uid);
                           const pr = getPresence(uid);
                           const me = uid === user.uid;
                           return (
                             <div key={uid} className="flex items-center gap-3 p-2 rounded-lg bg-black/40 border border-neutral-800">
                               <div className="w-9 h-9 bg-neutral-900 border border-neutral-700 rounded-full flex items-center justify-center text-neutral-300 font-medium uppercase overflow-hidden shrink-0">
                                 {p?.avatarBase64 ? <img src={p.avatarThumbBase64 || p.avatarBase64} className="w-full h-full object-cover"/> : (p?.username || '?').substring(0,2)}
                               </div>
                               <div className="flex-1">
                                 <div className="text-sm text-white font-medium truncate">{me ? 'Du' : (p?.username || 'Unbekannt')}</div>
                                 <div className="text-[11px] text-neutral-500">{pr.online ? 'online' : (pr.lastSeen ? `zuletzt ${formatTime(pr.lastSeen)}` : 'offline')}</div>
                               </div>
                               {isChatAdmin(activeChatData || activeChat) && !me && (
                                 <div className="flex items-center gap-1">
                                   <button onClick={() => toggleAdmin(activeChatData || activeChat, uid)} className="text-[11px] px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-200 hover:border-neutral-500">{(activeChatData || activeChat)?.admins?.includes(uid) ? 'Admin' : 'Admin?'}</button>
                                   <button onClick={() => removeMemberFromGroup(activeChatData || activeChat, uid)} className="text-[11px] px-2 py-1 rounded-md bg-red-500/10 border border-red-900/50 text-red-400 hover:bg-red-500/20">Entfernen</button>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                       {isChatAdmin(activeChatData || activeChat) && (
                         <div className="mt-4">
                           <label className="text-xs text-neutral-400">Gruppenname</label>
                           <div className="flex gap-2 mt-2">
                             <input defaultValue={(activeChatData || activeChat)?.title || ''} id="groupTitleInput" className="flex-1 bg-black border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500" />
                             <button onClick={() => updateGroupTitle(activeChatData || activeChat, document.getElementById('groupTitleInput')?.value)} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-200">Speichern</button>
                           </div>
                           <div className="mt-3">
                             <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                               <input value={groupEditSearch} onChange={(e) => setGroupEditSearch(e.target.value)} placeholder="Mitglied hinzufügen…" className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-neutral-500" />
                             </div>
                             {(groupEditSearch || '').trim() !== '' && (
                               <div className="mt-2 max-h-40 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl">
                                 {allProfiles
                                   .filter(p => p.id !== user.uid)
                                   .filter(p => (p.username || '').toLowerCase().includes(groupEditSearch.toLowerCase()))
                                   .filter(p => !getChatParticipants(activeChatData || activeChat).includes(p.id))
                                   .slice(0, 15)
                                   .map(p => (
                                     <div key={p.id} onClick={() => { addMemberToGroup(activeChatData || activeChat, p.id); setGroupEditSearch(''); }} className="p-3 border-b border-neutral-800 last:border-0 hover:bg-neutral-800 cursor-pointer flex items-center gap-3">
                                       <div className="w-9 h-9 bg-black border border-neutral-700 rounded-full flex items-center justify-center text-neutral-400 font-medium uppercase overflow-hidden">
                                         {p.avatarBase64 ? (
                                 <img
                                   src={p.avatarThumbBase64 || p.avatarBase64}
                                   className="w-full h-full object-cover cursor-zoom-in"
                                   alt="Profilbild"
                                   onClick={(e) => { e.stopPropagation(); openImageViewer(p.avatarFullBase64 || p.avatarBase64 || p.avatarThumbBase64); }}
                                 />
                               ) : (p.username || '?').substring(0,2)}
                                       </div>
                                       <span className="font-medium text-white text-sm">{p.username}</span>
                                       <Plus className="w-4 h-4 text-neutral-400 ml-auto" />
                                     </div>
                                   ))}
                                 {allProfiles.filter(p => p.id !== user.uid).filter(p => (p.username || '').toLowerCase().includes(groupEditSearch.toLowerCase())).filter(p => !getChatParticipants(activeChatData || activeChat).includes(p.id)).length === 0 && (
                                   <div className="p-3 text-neutral-500 text-sm text-center">Kein Treffer</div>
                                 )}
                               </div>
                             )}
                           </div>
                         </div>
                       )}
                       <div className="mt-4 flex gap-2">
                         <button onClick={() => leaveGroup(activeChatData || activeChat)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800">Gruppe verlassen</button>
                       </div>
                     </div>
                   )}

                   <div className="mt-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-center flex items-center justify-center gap-3">
                     <Activity className="w-5 h-5 text-neutral-400" />
                     <p className="text-sm text-neutral-300">Total <strong className="text-white ml-1">{chatMessages.length}</strong> Nachrichten</p>
                   </div>
                </div>
             </div>
          )}

          {isShareEventModalOpen && (
            <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-neutral-950 border border-neutral-800 w-full max-w-sm rounded-xl p-6 shadow-2xl animate-fade-in">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><CalendarPlus className="w-5 h-5"/> Termin teilen</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const ev = { title: fd.get('title'), date: fd.get('date'), time: fd.get('time'), type: 'Chat-Einladung' };
                    sendMessage(null, null, null, ev);
                    setIsShareEventModalOpen(false);
                  }} className="space-y-4">
                    <input type="text" name="title" required placeholder="Titel (z.B. Kino heute?)" className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500" />
                    <div className="flex gap-2">
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500" />
                      <input type="time" name="time" required defaultValue="18:00" className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setIsShareEventModalOpen(false)} className="flex-1 py-3 rounded-lg text-sm text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 transition-colors">Abbrechen</button>
                      <button type="submit" className="flex-1 py-3 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors">In Chat senden</button>
                    </div>
                  </form>
               </div>
            </div>
          )}

          {/* IMAGE VIEWER (Vollbild) */}
          {isImageViewerOpen && imageViewerSrc && (
            <div
              className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={closeImageViewer}
            >
              <button
                onClick={(e) => { e.stopPropagation(); closeImageViewer(); }}
                className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/70 border border-neutral-700 text-white hover:bg-neutral-800 transition-colors"
                aria-label="Schließen"
                title="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={imageViewerSrc}
                alt="Bild"
                className="max-h-[90vh] max-w-[95vw] object-contain rounded-2xl border border-neutral-800 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      );
    }


export default AmoledCalendarApp;
