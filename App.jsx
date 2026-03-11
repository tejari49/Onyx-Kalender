import React, { useState, useEffect, useRef } from 'react';

    import { 
      Calendar as CalendarIcon, Home, Settings, Plus, ChevronLeft, ChevronRight, ChevronDown, Video, AlignLeft, Users, Clock, Cloud, Sun, Moon, CloudRain, Info, LogOut, MapPin, Search, Download, Upload, Bell, BellOff, Trash2, CheckCircle2, AlertCircle, Mail, Lock, MessageSquare, Send, Image as ImageIcon, Camera, ArrowLeft, Edit2, CornerUpLeft, X, User, RefreshCw, Mic, Square, Play, Pause, Activity, Bomb, CalendarPlus, Share2, Paintbrush, Pin, Timer, BarChart3, Briefcase, StopCircle, GripVertical, ChevronUp, CheckSquare, ListTodo, NotebookText, ShoppingCart, Grip,
      Copy, Link2, History, UserMinus, Star
    } from 'lucide-react';

    import { initializeApp } from "firebase/app";
    import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "firebase/auth";
    import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, setDoc, getDoc, getDocs, arrayUnion, arrayRemove, where, limit, orderBy, serverTimestamp, runTransaction, startAfter, increment } from "firebase/firestore";
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
    const BASE_PATH = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/Onyx-Kalender/';

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const DEFAULT_EXTRAS_ORDER = ['smartday','workclock','focus','week','freewindows','goals','sollist','notes','weather'];

    function normalizeShoppingItems(input) {
      const rows = Array.isArray(input) ? input : [];
      return rows.map((item, idx) => ({
        id: String(item?.id || `item_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`),
        text: String(item?.text || ''),
        qty: String(item?.qty || ''),
        price: item?.price === 0 ? '0' : String(item?.price || ''),
        done: item?.done === true,
        checkedAt: Number(item?.checkedAt || 0) || 0,
      }));
    }

    function normalizeShoppingLists(input) {
      const rows = Array.isArray(input) ? input : [];
      return rows.map((list, idx) => ({
        id: String(list?.id || `shop_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`),
        title: String(list?.title || 'Einkaufsliste'),
        store: String(list?.store || ''),
        createdAt: Number(list?.createdAt || Date.now()) || Date.now(),
        updatedAt: Number(list?.updatedAt || Date.now()) || Date.now(),
        items: normalizeShoppingItems(list?.items),
      })).sort((a,b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    }

    function formatCurrencyCHF(value) {
      const num = Number(value || 0);
      if (!Number.isFinite(num)) return 'CHF 0.00';
      return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(num);
    }

    function normalizeDailyGoals(input) {
      const arr = Array.isArray(input) ? input : [];
      const out = arr.slice(0, 6).map((item, idx) => ({
        id: String(item?.id || `goal_${idx + 1}`),
        text: String(item?.text || ''),
        done: item?.done === true,
      }));
      while (out.length < 3) out.push({ id: `goal_${out.length + 1}`, text: '', done: false });
      return out;
    }

    function normalizeExtrasOrder(input) {
      const raw = Array.isArray(input) ? input.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean) : [];
      const seen = new Set();
      const ordered = [];
      for (const key of [...raw, ...DEFAULT_EXTRAS_ORDER]) {
        if (!DEFAULT_EXTRAS_ORDER.includes(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        ordered.push(key);
      }
      return ordered;
    }

    function reorderExtraKeys(list, draggedKey, targetKey) {
      const src = normalizeExtrasOrder(list);
      const from = src.indexOf(String(draggedKey || ''));
      const to = src.indexOf(String(targetKey || ''));
      if (from < 0 || to < 0 || from === to) return src;
      const next = src.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    }


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
      "Kleine Schritte, groÃŸe Wirkung.",
      "Wenn&apos;s brennt: Wasser. Wenn&apos;s chaotisch ist: Kalender.",
      "Planung ist die halbe Miete â€“ die andere HÃ¤lfte ist Kaffee."
    ];

    const stableHash = (str) => {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0);
    };

    const _bufToHex = (buffer) => {
      const bytes = new Uint8Array(buffer);
      let out = '';
      for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
      return out;
    };

    const sha256Hex = async (input) => {
      const s = String(input ?? '');
      try {
        if (crypto?.subtle?.digest) {
          const enc = new TextEncoder();
          const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
          return _bufToHex(buf);
        }
      } catch (_) {}
      // Fallback: not cryptographically strong, but avoids hard crash in rare environments.
      return String(stableHash(s));
    };

    const randomToken = (byteLen = 16) => {
      try {
        const arr = new Uint8Array(byteLen);
        crypto.getRandomValues(arr);
        let str = '';
        for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
        // base64url
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      } catch (_) {
        return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      }
    };

    const pickQuoteForDay = (quotes, dayKey) => {
      const list = (Array.isArray(quotes) && quotes.length) ? quotes : DEFAULT_QUOTES;
      const idx = stableHash(String(dayKey)) % list.length;
      return list[idx];
    };


    const MONATE = ["Januar", "Februar", "MÃ¤rz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
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
                <h3 className="text-lg font-semibold mb-2">Ups â€“ ein Fehler ist passiert</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Die Ansicht konnte nicht gerendert werden. Du kannst zurÃ¼ckgehen oder neu laden.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-white text-black font-semibold py-2 rounded-xl hover:bg-gray-200 transition-colors"
                    onClick={() => {
                      this.setState({ hasError: false, error: null });
                      try { this.props.onReset && this.props.onReset(); } catch (e) {}
                    }}
                  >
                    ZurÃ¼ck
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
console.log('[Onyx-Kalender] build v27 loaded @', new Date().toISOString());

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

    function shortId(id, n = 6) {
      const s = String(id || '');
      if (s.length <= n) return s;
      return s.slice(0, n);
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
      const [settingsTab, setSettingsTab] = useState('calendars');
      const [settingsQuery, setSettingsQuery] = useState('');
      const [settingsShareCalId, setSettingsShareCalId] = useState('default');
      const [uiTheme, setUiTheme] = useState(() => {
        try {
          const stored = localStorage.getItem('onyx_theme');
          if (stored === 'light' || stored === 'dark') return stored;
          const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          return prefersDark ? 'dark' : 'light';
        } catch (_) { return 'dark'; }
      });
      const [extrasSectionsOpen, setExtrasSectionsOpen] = useState({
        basics: true,
        home: false,
        planning: false,
        notes: false,
      });

      useEffect(() => {
        try {
          document.documentElement.setAttribute('data-theme', uiTheme);
          localStorage.setItem('onyx_theme', uiTheme);
        } catch (_) {}
      }, [uiTheme]);

      const [currentDate, setCurrentDate] = useState(new Date());
      
      const [weather, setWeather] = useState(null);
      const [dailyForecast, setDailyForecast] = useState(null);
      const [hourlyForecast, setHourlyForecast] = useState(null);
      const [selectedForecastDay, setSelectedForecastDay] = useState(null);
      const [location, setLocation] = useState({ name: 'OberbÃ¼ren, SG', lat: 47.45, lon: 9.11 });
      const [workClockActive, setWorkClockActive] = useState(null);
      const [workClockSessions, setWorkClockSessions] = useState([]);
      const [workClockTick, setWorkClockTick] = useState(Date.now());
      const [workClockModalOpen, setWorkClockModalOpen] = useState(false);
      const [workClockDraftTitle, setWorkClockDraftTitle] = useState('');
      const [workClockDraftUsePreset, setWorkClockDraftUsePreset] = useState(true);
      const [workClockPresetInput, setWorkClockPresetInput] = useState('BÃ¼ro\nBaustelle\nSupport');
      const [workClockDraftLevel, setWorkClockDraftLevel] = useState('mittel');
      const [workClockSaving, setWorkClockSaving] = useState(false);
      const [workClockEditOpen, setWorkClockEditOpen] = useState(false);
      const [workClockEditingSession, setWorkClockEditingSession] = useState(null);
      const [workClockEditTitle, setWorkClockEditTitle] = useState('');
      const [workClockEditUsePreset, setWorkClockEditUsePreset] = useState(true);
      const [workClockEditLevel, setWorkClockEditLevel] = useState('mittel');
      const [workClockEditStartValue, setWorkClockEditStartValue] = useState('');
      const [workClockEditEndValue, setWorkClockEditEndValue] = useState('');
      const [workClockDeletingId, setWorkClockDeletingId] = useState('');
      const [dailyFact, setDailyFact] = useState('');
      const [quotes, setQuotes] = useState([]);
      const [focusDurationMin, setFocusDurationMin] = useState(25);
      const [focusState, setFocusState] = useState(null);
      const [focusTick, setFocusTick] = useState(Date.now());
      const [focusHistory, setFocusHistory] = useState([]);
      const [quickNotes, setQuickNotes] = useState('');
      const [dailyGoals, setDailyGoals] = useState(() => normalizeDailyGoals([]));
      const [weeklyTargetHours, setWeeklyTargetHours] = useState('42');
      const [extrasSlotOrder, setExtrasSlotOrder] = useState(() => normalizeExtrasOrder(DEFAULT_EXTRAS_ORDER));
      const [extrasUpdatedAt, setExtrasUpdatedAt] = useState(0);
      const [draggedExtraSlot, setDraggedExtraSlot] = useState('');
      const [shoppingLists, setShoppingLists] = useState([]);
      const [shoppingListsUpdatedAt, setShoppingListsUpdatedAt] = useState(0);
      const [activeShoppingListId, setActiveShoppingListId] = useState('');
      const [plusMenuOpen, setPlusMenuOpen] = useState(false);
      const [shoppingListModalOpen, setShoppingListModalOpen] = useState(false);
      const [shoppingDraftTitle, setShoppingDraftTitle] = useState('Neue Einkaufsliste');
      const [shoppingDraftStore, setShoppingDraftStore] = useState('');
      const [shoppingSaving, setShoppingSaving] = useState(false);
      const [shoppingQuickItem, setShoppingQuickItem] = useState('');
      const [isStandalone, setIsStandalone] = useState(false);
      const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
      const [canInstallPwa, setCanInstallPwa] = useState(false);

      // Push diagnostics (helps to debug when users report "Push geht nicht")
      const [pushDiag, setPushDiag] = useState({ sw: 'unknown', controlling: false, lastError: '', lastTokenAt: 0, lastReceivedAt: 0, lastReceivedTitle: '' });
      const [pushTest, setPushTest] = useState({ id: '', status: '', lastError: '', updatedAt: 0 });
      const [diagTestsOpen, setDiagTestsOpen] = useState(false);

      // Account alias editor
      const [aliasEditOpen, setAliasEditOpen] = useState(false);
      const [aliasDraft, setAliasDraft] = useState('');
      const [aliasEditError, setAliasEditError] = useState('');
      const [aliasSaving, setAliasSaving] = useState(false);

      // Password editor
      const [pwEditOpen, setPwEditOpen] = useState(false);
      const [pwCurrent, setPwCurrent] = useState('');
      const [pwNew, setPwNew] = useState('');
      const [pwNew2, setPwNew2] = useState('');
      const [pwError, setPwError] = useState('');
      const [pwSaving, setPwSaving] = useState(false);
      const [pwResetSent, setPwResetSent] = useState(false);




function getSupportedAudioRecorderConfig() {
  const MR = (typeof window !== 'undefined' && window.MediaRecorder) ? window.MediaRecorder : null;
  const isIOS = (typeof navigator !== 'undefined') && /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const supports = (mime) => {
    try { return !!(MR && MR.isTypeSupported && MR.isTypeSupported(mime)); }
    catch (_) { return false; }
  };
  if (isIOS) {
    if (supports('audio/mp4')) return { mimeType: 'audio/mp4', audioBitsPerSecond: 128000 };
    if (supports('audio/webm;codecs=opus')) return { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 };
    if (supports('audio/webm')) return { mimeType: 'audio/webm', audioBitsPerSecond: 96000 };
    return { mimeType: '', audioBitsPerSecond: 96000 };
  }
  if (supports('audio/webm;codecs=opus')) return { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 };
  if (supports('audio/ogg;codecs=opus')) return { mimeType: 'audio/ogg;codecs=opus', audioBitsPerSecond: 128000 };
  if (supports('audio/mp4')) return { mimeType: 'audio/mp4', audioBitsPerSecond: 128000 };
  if (supports('audio/webm')) return { mimeType: 'audio/webm', audioBitsPerSecond: 96000 };
  return { mimeType: '', audioBitsPerSecond: 96000 };
}

      const isIosUA = (typeof navigator !== 'undefined') && /iphone|ipad|ipod/i.test(navigator.userAgent || '');
      
      const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
      const [searchQuery, setSearchQuery] = useState('');
      const [searchResults, setSearchResults] = useState([]);
      const activeShoppingList = shoppingLists.find((row) => row.id === activeShoppingListId) || shoppingLists[0] || null;

      // --- BILD-VOLLBILD VIEWER ---
      const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
      const [imageViewerSrc, setImageViewerSrc] = useState(null);
      const [chatMediaItems, setChatMediaItems] = useState([]);
      const [chatMediaLoading, setChatMediaLoading] = useState(false);
      const [isChatMediaGalleryOpen, setIsChatMediaGalleryOpen] = useState(false);
      const [chatMediaViewerIndex, setChatMediaViewerIndex] = useState(0);

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

      function openChatMediaViewer(index = 0) {
        const items = Array.isArray(chatMediaItems) ? chatMediaItems : [];
        if (!items.length) return;
        const safeIndex = Math.max(0, Math.min(index, items.length - 1));
        setChatMediaViewerIndex(safeIndex);
        setIsChatMediaGalleryOpen(true);
      }

      function closeChatMediaViewer() {
        setIsChatMediaGalleryOpen(false);
      }

      function moveChatMediaViewer(dir = 1) {
        const items = Array.isArray(chatMediaItems) ? chatMediaItems : [];
        if (!items.length) return;
        setChatMediaViewerIndex((prev) => {
          const next = prev + dir;
          if (next < 0) return items.length - 1;
          if (next >= items.length) return 0;
          return next;
        });
      }

      useEffect(() => {
        if (!isChatMediaGalleryOpen) return;
        const onKey = (e) => {
          if (e.key === 'Escape') closeChatMediaViewer();
          if (e.key === 'ArrowLeft') moveChatMediaViewer(-1);
          if (e.key === 'ArrowRight') moveChatMediaViewer(1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [isChatMediaGalleryOpen, chatMediaItems]);

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
const autoFinalizedPollsRef = useRef({});

const eventModalScrollRef = useRef(null);

const [pollDraft, setPollDraft] = useState([
  { date: '', time: '' },
  { date: '', time: '' },
  { date: '', time: '' }
]);
const [pollBusy, setPollBusy] = useState(false);
const [createPollOnSave, setCreatePollOnSave] = useState(false);
const [pollDeadlineDate, setPollDeadlineDate] = useState('');
const [pollDeadlineTime, setPollDeadlineTime] = useState('');
const [pollAutoFinalize, setPollAutoFinalize] = useState(true);
      const [selectedDateForEvent, setSelectedDateForEvent] = useState(null);
      const [eventToEdit, setEventToEdit] = useState(null);
      const [eventModalMode, setEventModalMode] = useState('create'); // 'create' | 'view' | 'edit'
      const [eventCanEdit, setEventCanEdit] = useState(true);
      const [calendarViewMode, setCalendarViewMode] = useState('month'); // 'month' | 'agenda'
      const [calendarSearchQuery, setCalendarSearchQuery] = useState('');
      const [agendaRange, setAgendaRange] = useState('7'); // '7' | '30' | 'month'
      const [eventEditScope, setEventEditScope] = useState('series'); // 'series' | 'single'

      // Ensure event modal starts at top on open (mobile: content can exceed viewport)
      useEffect(() => {
        if (!isModalOpen) return;
        const t = setTimeout(() => {
          try {
            if (eventModalScrollRef.current) {
              eventModalScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            }
          } catch (e) {}
        }, 0);
        return () => clearTimeout(t);
      }, [isModalOpen, eventModalMode, eventToEdit]);


      const [eventForm, setEventForm] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        durationMinutes: '',
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


      // --- NATÃœRLICHE SPRACHE / SCHNELLEINGABE (Event) ---
      const [quickEventText, setQuickEventText] = useState('');
      const [quickEventPreview, setQuickEventPreview] = useState(null);

      const [isCalManageModalOpen, setIsCalManageModalOpen] = useState(false);
      const [calForm, setCalForm] = useState({ id: null, name: '', type: 'normal', color: '', shifts: [] });
      
      const [isShareCalModalOpen, setIsShareCalModalOpen] = useState(false);
      const [shareCalData, setShareCalData] = useState(null);
      const [shareUsername, setShareUsername] = useState('');
      const [sharePerm, setSharePerm] = useState('read');

      // --- PRIVACY-FIRST SHARING (Public Links) ---
      const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
      const [shareLinkDraft, setShareLinkDraft] = useState({
        kind: 'calendar', // 'calendar' | 'event'
        calId: 'default',
        calName: 'Privat',
        eventId: null,
        eventSnapshot: null, // {title,date,time,location,durationMinutes,desc}
        mode: 'busy', // calendar: 'busy' | 'full' (busy-only is the privacy default)
        protection: 'magic', // 'none' | 'passcode' | 'magic'
        passcode: '',
        expiresInDays: 7,
        noExpiry: false,
      });
      const [shareLinkCreated, setShareLinkCreated] = useState(null); // { url, token }
      const [shareLinks, setShareLinks] = useState([]);

      // Public share route (works without login)
      const [publicShareToken, setPublicShareToken] = useState(null);
      const [publicShareKey, setPublicShareKey] = useState('');
      const [publicShareDoc, setPublicShareDoc] = useState(null);
      const [publicShareLoading, setPublicShareLoading] = useState(false);
      const [publicShareError, setPublicShareError] = useState('');
      const [publicShareAuthed, setPublicShareAuthed] = useState(false);
      const [publicSharePasscode, setPublicSharePasscode] = useState('');

      // Audit log
      const [auditEntries, setAuditEntries] = useState([]);
      const [auditCalId, setAuditCalId] = useState('default');
      const [auditCalEntries, setAuditCalEntries] = useState([]);

      // NEU: Pinsel Tool & Langes DrÃ¼cken
      const [isPaintbrushActive, setIsPaintbrushActive] = useState(false);
      const [selectedPaintShift, setSelectedPaintShift] = useState(null);
      const [shiftModalData, setShiftModalData] = useState(null); // { dateStr, calId, shifts }
      const isPaintingRef = useRef(false);
      const paintedDaysRef = useRef(new Set());

      // --- GEHEIMER CHAT STATES ---
      const [secretView, setSecretView] = useState('list');
      const [userProfile, setUserProfile] = useState(null);
      const dashboardName = (userProfile && (userProfile?.displayName || userProfile?.username)) ? (userProfile?.displayName || userProfile?.username) : (user?.email ? user?.email.split('@')[0] : '');
      const todayKey = new Date().toISOString().split('T')[0];
      const [allProfiles, setAllProfiles] = useState([]);
      const [chatSearchQuery, setChatSearchQuery] = useState('');
      const [chatFriendResult, setChatFriendResult] = useState(null);
      const [chatFriendLoading, setChatFriendLoading] = useState(false);
      const [chatFriendError, setChatFriendError] = useState('');
      const chatFriendLookupTimer = useRef(null);
      const secretPanicBypassUntilRef = useRef(0);

      const [myChats, setMyChats] = useState([]);
      const [activeChat, setActiveChat] = useState(null);
      const [chatMessages, setChatMessages] = useState([]);
      const [newMessageText, setNewMessageText] = useState('');
      const [editingMessage, setEditingMessage] = useState(null);
      const [replyToMessage, setReplyToMessage] = useState(null); // { id, senderId, text, image, audio, event }
      const [playingAudioId, setPlayingAudioId] = useState(null);
      const [selectedMessageId, setSelectedMessageId] = useState(null); 
      const [selfDestruct, setSelfDestruct] = useState(false);
      const [isShareEventModalOpen, setIsShareEventModalOpen] = useState(false);
      
      const [isRecording, setIsRecording] = useState(false);
      const mediaRecorderRef = useRef(null);
      const audioChunksRef = useRef([]);

      const typingTimeoutRef = useRef(null);
      const messagesEndRef = useRef(null);
      const chatScrollRef = useRef(null);

      // --- Chat scroll UX ---
      // Keep the viewport stable when prepending older messages and avoid auto-jumping to bottom
      const chatIsPrependingRef = useRef(false);
      const chatStickToBottomRef = useRef(true);
      const chatScrollRestoreRef = useRef({ prevHeight: 0, prevTop: 0 });
      const chatOldestCursorRef = useRef(null);
      const chatLoadedMoreRef = useRef(false);
      const chatAutoLoadLockRef = useRef(false);
      const CHAT_PAGE_SIZE = 25;
      const [chatHasMore, setChatHasMore] = useState(false);
      const [chatLoadingMore, setChatLoadingMore] = useState(false);
      const [chatTotalCount, setChatTotalCount] = useState(0);


      // --- IN-APP CHAT PING (SOUND / VIBRATION) ---
      const audioCtxRef = useRef(null);
      const userProfileRef = useRef(null);
      const extrasCloudReadyRef = useRef(false);
      const extrasCloudTimerRef = useRef(null);
      const activeChatIdRef = useRef(null);
      const currentViewRef = useRef(null);
      const lastChatPingRef = useRef({});
      
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
      const [messageSearchFilter, setMessageSearchFilter] = useState('all');
      const quickReactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

      const [chatMetaPrefs, setChatMetaPrefs] = useState(() => {
        try {
          const raw = localStorage.getItem('onyx_msg_meta');
          if (raw) {
            const j = JSON.parse(raw);
            if (j && typeof j === 'object') {
              return {
                showTime: j.showTime !== false,
                receipts: ['off','compact','full'].includes(j.receipts) ? j.receipts : 'compact'
              };
            }
          }
        } catch (_) {}
        return { showTime: true, receipts: 'compact' };
      });
      const [isChatMetaMenuOpen, setIsChatMetaMenuOpen] = useState(false);
      const chatMetaMenuRef = useRef(null);



      const [lastChatVisit, setLastChatVisit] = useState(() => {
        const stored = localStorage.getItem('onyx_last_chat_visit');
        return stored ? parseInt(stored, 10) : 0;
      });

      const [toasts, setToasts] = useState([]);
      const pressTimer = useRef(null);
      const isLongPressAction = useRef(false);
      const secretPressTimer = useRef(null);
      const secretGateTriggered = useRef(false);
      const [secretPinModalOpen, setSecretPinModalOpen] = useState(false);
      const [secretPinInput, setSecretPinInput] = useState('');
      const [secretPinError, setSecretPinError] = useState('');
      const [secretPinBusy, setSecretPinBusy] = useState(false);
      const [secretPinSetupCurrent, setSecretPinSetupCurrent] = useState('');
      const [secretPinSetupNew, setSecretPinSetupNew] = useState('');
      const [secretPinSetupConfirm, setSecretPinSetupConfirm] = useState('');
      const [secretPinActionBusy, setSecretPinActionBusy] = useState(false);

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
    // React registriert Touch-Events oft als passive -> preventDefault wÃ¼rde warnen
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
    location: '',
    durationMinutes: '',
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
  try { setQuickEventText(''); setQuickEventPreview(null); } catch(_) {}
setShowEventComments(false);
setShowEventPoll(false);
setEventComments([]);
setNewCommentText('');
setCreatePollOnSave(false);
  setPollDeadlineDate('');
  setPollDeadlineTime('');
  setPollAutoFinalize(true);
initPollDraftFromEvent({ date: d, time: '', calendarId: targetCalId });
  setEventModalMode('create');
  setEventCanEdit(true);
  setIsModalOpen(true);
};

const persistDisplayName = async (rawName, opts = {}) => {
  if (!user) return;
  const uname = String(rawName || '').trim();
  if (!uname) return showToast('Bitte Namen eingeben');
  if (uname.length < 2) return showToast('Name zu kurz');
  if (uname.length > 40) return showToast('Max. 40 Zeichen');

  try {
    const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid);
    const dataToSave = {
      displayName: uname,
      uid: user?.uid,
      email: user?.email,
      emailLower: (user?.email || '').toLowerCase(),
      updatedAt: Date.now(),
    };

    // IMPORTANT:
    // username is a stable alias/handle and should NOT be overwritten on every name change.
    // Only set it once if missing/empty (legacy compatibility).
    try {
      const existingAlias = (userProfile && typeof userProfile?.username === 'string') ? userProfile?.username.trim() : '';
      if (!existingAlias || existingAlias.length < 2) {
        dataToSave.username = uname.slice(0, 20);
        dataToSave.usernameLower = String(dataToSave.username).toLowerCase();
      }
    } catch (_) {}
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
      localStorage.setItem(`onyx_displayName_${user?.uid}`, uname);
      if (dataToSave.username) localStorage.setItem(`onyx_username_${user?.uid}`, dataToSave.username);
    } catch (_) {}

    // Best-effort: displayName in bestehenden Chats aktualisieren (damit es Ã¼berall konsistent ist)
    try {
      const updates = myChats.slice(0, 75).map(c => {
        if (!c?.id) return null;
        return updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', c.id), { [`displayNames.${user?.uid}`]: uname }).catch(()=>{});
      }).filter(Boolean);
      await Promise.all(updates);
    } catch (_) {}

    showToast((opts && opts.toast) ? opts.toast : 'Profil gespeichert');
  } catch (err) {
    console.error('persistDisplayName failed', err);
    showToast('Fehler beim Speichern');
  }
};

const sanitizeAlias = (raw) => {
  const s = String(raw ?? '').trim();
  // Allow: letters, numbers, dot, underscore, dash. Spaces become underscore.
  const underscored = s.replace(/\s+/g, '_');
  const cleaned = underscored.replace(/[^a-zA-Z0-9._-]/g, '');
  return cleaned.slice(0, 20);
};

const persistAliasUsername = async (rawAlias) => {
  if (!user) return;
  const nextAlias = sanitizeAlias(rawAlias);
  if (!nextAlias) { setAliasEditError('Bitte Alias eingeben'); return; }
  if (nextAlias.length < 2) { setAliasEditError('Alias zu kurz'); return; }
  try {
    setAliasSaving(true);
    setAliasEditError('');
    const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid);

    const patch = {
      username: nextAlias,
      usernameLower: nextAlias.toLowerCase(),
      updatedAt: Date.now(),
    };

    // If displayName is empty, keep UI consistent by setting it once.
    if (!userProfile?.displayName || String(userProfile?.displayName).trim().length < 2) {
      patch.displayName = nextAlias;
    }

    await setDoc(profileRef, patch, { merge: true });

    // Update local state + fallback storage
    try { setUserProfile(prev => ({ ...(prev || {}), ...patch })); } catch (_) {}
    try {
      localStorage.setItem(`onyx_username_${user?.uid}`, nextAlias);
      if (patch.displayName) localStorage.setItem(`onyx_displayName_${user?.uid}`, patch.displayName);
    } catch (_) {}

    // Best-effort: update chat displayNames if we don't have a dedicated displayName
    try {
      const nameForChats = (patch.displayName || userProfile?.displayName || nextAlias);
      const updates = (myChats || []).slice(0, 75).map(c => {
        if (!c?.id) return null;
        return updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', c.id), { [`displayNames.${user?.uid}`]: nameForChats }).catch(()=>{});
      }).filter(Boolean);
      await Promise.all(updates);
    } catch (_) {}

    showToast('Alias aktualisiert');
    setAliasEditOpen(false);
  } catch (e) {
    console.warn('persistAliasUsername failed', e);
    setAliasEditError('Speichern fehlgeschlagen');
  } finally {
    try { setAliasSaving(false); } catch (_) {}
  }

};

const hasPasswordProvider = () => {
  try {
    const u = auth.currentUser;
    if (!u) return false;
    const pd = Array.isArray(u.providerData) ? u.providerData : [];
    return pd.some(p => p && p.providerId === 'password');
  } catch (_) { return false; }
};

const doSendPasswordReset = async () => {
  try {
    const u = auth.currentUser;
    if (!u || !u.email) return showToast('Keine Eâ€‘Mail');
    await sendPasswordResetEmail(auth, u.email);
    setPwResetSent(true);
    showToast('Resetâ€‘Mail gesendet');
  } catch (e) {
    console.warn('sendPasswordResetEmail failed', e);
    showToast('Reset fehlgeschlagen');
  }
};

const doChangePassword = async () => {
  try {
    setPwSaving(true);
    setPwError('');
    const u = auth.currentUser;
    if (!u || !u.email) { setPwError('Nicht angemeldet'); return; }
    const cur = String(pwCurrent || '');
    const n1 = String(pwNew || '');
    const n2 = String(pwNew2 || '');
    if (n1.length < 6) { setPwError('Neues Passwort zu kurz (min. 6 Zeichen)'); return; }
    if (n1 !== n2) { setPwError('PasswÃ¶rter stimmen nicht Ã¼berein'); return; }
    if (!cur) { setPwError('Aktuelles Passwort fehlt'); return; }

    const cred = EmailAuthProvider.credential(u.email, cur);
    await reauthenticateWithCredential(u, cred);
    await updatePassword(u, n1);

    setPwCurrent(''); setPwNew(''); setPwNew2('');
    setPwEditOpen(false);
    showToast('Passwort aktualisiert');
  } catch (e) {
    console.warn('doChangePassword failed', e);
    const msg = String(e?.code || e?.message || e);
    if (msg.includes('auth/wrong-password')) setPwError('Aktuelles Passwort ist falsch');
    else if (msg.includes('auth/too-many-requests')) setPwError('Zu viele Versuche â€“ spÃ¤ter erneut');
    else if (msg.includes('auth/requires-recent-login')) setPwError('Bitte neu anmelden und erneut versuchen');
    else setPwError('Ã„nderung fehlgeschlagen');
  } finally {
    try { setPwSaving(false); } catch (_) {}
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
      pushTarget: 'web',
    };
    // displayName setzen (fÃ¼r BegrÃ¼ÃŸung). Nur Ã¼berschreiben, wenn leer/kurz.
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
            // friendCodes-Registry nicht erlaubt -> uniqueness best-effort Ã¼ber profiles Query
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
  setCreatePollOnSave(false);
  setEventModalMode('create');
  setEventCanEdit(true);
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
  // Abstimmung 2.0: optionale Deadline
  setPollDeadlineDate(addDaysStr(baseDate, 2));
  setPollDeadlineTime(baseTime || '18:00');
  setPollAutoFinalize(true);
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

// --- Abstimmung 2.0 (Matrix: Fix/Kann/Nein) ---
const POLL_STATE = { YES: 'yes', MAYBE: 'maybe', NO: 'no' };
const isPollState = (v) => v === POLL_STATE.YES || v === POLL_STATE.MAYBE || v === POLL_STATE.NO;

const makeDeadlineAt = (dateStr, timeStr) => {
  const d = (dateStr || '').trim();
  if (!d) return null;
  const t = (timeStr || '').trim() || '23:59';
  const ms = new Date(`${d}T${t}`).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const computePollTally = (poll, fallbackVoterIds = []) => {
  const p = poll || {};
  const version = Number(p.version || 1);
  const options = Array.isArray(p.options) ? p.options : [];
  const voterIds = Array.isArray(p.voterIds) ? p.voterIds : (Array.isArray(fallbackVoterIds) ? fallbackVoterIds : []);
  const votes = (p.votes && typeof p.votes === 'object') ? p.votes : {};
  const deadlineAt = (typeof p.deadlineAt === 'number') ? p.deadlineAt : null;
  const now = Date.now();
  const deadlinePassed = !!(deadlineAt && now >= deadlineAt);

  if (version < 2) {
    const counts = countVotes(votes);
    const byOptionId = {};
    for (const opt of options) {
      const yes = counts[opt.id] || 0;
      byOptionId[opt.id] = { yes, maybe: 0, no: 0, score: yes * 2 };
    }
    const allVoted = voterIds.length > 0 && voterIds.every((uid) => !!votes[uid]);
    let winnerOptionId = null;
    let best = -1;
    for (const opt of options) {
      const c = counts[opt.id] || 0;
      if (c > best) { best = c; winnerOptionId = opt.id; }
    }
    return {
      version,
      byOptionId,
      voterIds,
      votes,
      deadlineAt,
      deadlinePassed,
      allResponded: allVoted,
      respondedCount: Object.keys(votes || {}).length,
      totalVoters: voterIds.length,
      canFinalizeNow: allVoted || deadlinePassed,
      winnerOptionId,
    };
  }

  const byOptionId = {};
  const safeVoterIds = voterIds.filter(Boolean);
  for (const opt of options) {
    let yes = 0, maybe = 0, no = 0;
    for (const uid of safeVoterIds) {
      const row = votes[uid];
      const s = (row && typeof row === 'object') ? row[opt.id] : null;
      if (s === POLL_STATE.YES) yes++;
      else if (s === POLL_STATE.MAYBE) maybe++;
      else if (s === POLL_STATE.NO) no++;
    }
    // Scoring: ein einziges "Nein" macht den Slot praktisch unattraktiv
    const score = (no > 0 ? -1000 : 0) + (yes * 2) + maybe;
    byOptionId[opt.id] = { yes, maybe, no, score };
  }

  const allResponded = safeVoterIds.length > 0 && safeVoterIds.every((uid) => {
    const row = votes[uid];
    if (!row || typeof row !== 'object') return false;
    for (const opt of options) {
      if (!isPollState(row[opt.id])) return false;
    }
    return true;
  });

  let winnerOptionId = null;
  let bestScore = -1e15;
  let bestYes = -1;
  let bestMaybe = -1;
  let bestNo = 1e15;
  for (const opt of options) {
    const t = byOptionId[opt.id] || { yes: 0, maybe: 0, no: 0, score: 0 };
    if (
      (t.score > bestScore) ||
      (t.score === bestScore && t.yes > bestYes) ||
      (t.score === bestScore && t.yes === bestYes && t.maybe > bestMaybe) ||
      (t.score === bestScore && t.yes === bestYes && t.maybe === bestMaybe && t.no < bestNo)
    ) {
      bestScore = t.score;
      bestYes = t.yes;
      bestMaybe = t.maybe;
      bestNo = t.no;
      winnerOptionId = opt.id;
    }
  }

  return {
    version,
    byOptionId,
    voterIds: safeVoterIds,
    votes,
    deadlineAt,
    deadlinePassed,
    allResponded,
    respondedCount: safeVoterIds.filter((uid) => votes[uid] && typeof votes[uid] === 'object').length,
    totalVoters: safeVoterIds.length,
    canFinalizeNow: allResponded || deadlinePassed,
    winnerOptionId,
  };
}

const formatDeadlineShort = (deadlineAt) => {
  if (!deadlineAt) return '';
  try {
    return new Date(deadlineAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
};


const computePollVoterIdsForEvent = (ev) => {
  if (!user) return [];
  const calId = (ev && ev.calendarId) ? ev.calendarId : 'default';
  if (calId === 'default') return [user?.uid];

  const cal = getCalendarById(calId);
  const voters = new Set();
  if (cal && cal.ownerId) voters.add(cal.ownerId);

  // Nur "write" Mitglieder voten lassen, damit Firestore Rules nicht geÃ¶ffnet werden mÃ¼ssen
  if (cal && cal.sharedWith && typeof cal.sharedWith === 'object') {
    for (const [uid, perm] of Object.entries(cal.sharedWith)) {
      if (perm === 'write') voters.add(uid);
    }
  }

  voters.add(user?.uid);
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
    const senderName = (userProfile && (userProfile?.displayName || userProfile?.username)) ? (userProfile?.displayName || userProfile?.username) : (user?.email ? user?.email.split('@')[0] : 'User');
    await addDoc(ref, {
      text: txt,
      senderId: user?.uid,
      senderName,
      timestamp: Date.now(),
    });
    setNewCommentText('');
    // Quick feed fields for calendar bottom panel
    try {
      await updateDoc(eventDocRefFor(calId, eventToEdit.id), {
        lastCommentAt: Date.now(),
        lastCommentText: txt.slice(0, 240),
        lastCommentById: user?.uid,
        lastCommentByName: senderName,
        updatedAt: Date.now()
      });
    } catch (_) {}
  } catch (e) {
    showToast("Kommentar konnte nicht gesendet werden");
  }
}

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

  if (opts.length < 2) return showToast("Bitte mind. 2 VorschlÃ¤ge");

  const voterIds = computePollVoterIdsForEvent(eventToEdit);
  const deadlineAt = makeDeadlineAt(pollDeadlineDate, pollDeadlineTime);

  setPollBusy(true);
  try {
    await updateDoc(eventDocRefFor(calId, eventToEdit.id), {
      poll: {
        version: 2,
        voteMode: 'matrix',
        status: 'open',
        createdAt: Date.now(),
        createdBy: user?.uid,
        voterIds,
        options: opts,
        votes: {},
        winnerOptionId: null,
        closedAt: null,
        deadlineAt: deadlineAt || null,
        autoFinalizeAtDeadline: !!pollAutoFinalize,
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

const upgradePollToV2 = async (ev) => {
  if (!user || !ev || !ev.id) return;
  const calId = ev.calendarId || 'default';
  if (calId !== 'default' && !canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  setPollBusy(true);
  try {
    await runTransaction(db, async (tx) => {
      const ref = eventDocRefFor(calId, ev.id);
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() || {};
      const poll = data.poll || null;
      if (!poll || poll.status !== 'open') return;
      if (Number(poll.version || 1) >= 2) return;
      // Preserve legacy votes for debugging, but restart voting clean
      tx.update(ref, {
        'poll.version': 2,
        'poll.voteMode': 'matrix',
        'poll.legacyVotes': poll.votes || {},
        'poll.votes': {},
        'poll.votesUpdatedAt': Date.now(),
        updatedAt: Date.now()
      });
    });
    showToast('Abstimmung auf 2.0 umgestellt');
  } catch (e) {
    showToast('Upgrade fehlgeschlagen');
  } finally {
    setPollBusy(false);
  }
};

const voteInPoll = async (optionId, state = POLL_STATE.YES) => {
  if (!user || !eventToEdit) return;
  const calId = eventToEdit.calendarId || 'default';
  if (calId !== 'default' && !canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  const pollVer = Number((typeof modalEvent !== 'undefined' && modalEvent && modalEvent.poll && modalEvent.poll.version) ? modalEvent.poll.version : (eventToEdit.poll ? (eventToEdit.poll.version || 1) : 1));

  try {
    if (pollVer >= 2) {
      await updateDoc(eventDocRefFor(calId, eventToEdit.id), {
        [`poll.votes.${user?.uid}.${optionId}`]: state,
        [`poll.votesUpdatedAt`]: Date.now(),
        updatedAt: Date.now()
      });
    } else {
      await updateDoc(eventDocRefFor(calId, eventToEdit.id), {
        [`poll.votes.${user?.uid}`]: optionId,
        [`poll.votesUpdatedAt`]: Date.now(),
        updatedAt: Date.now()
      });
    }
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
      const tally = computePollTally(poll, voterIds);
      if (!tally.canFinalizeNow) return;

      const winnerId = tally.winnerOptionId;
      const winner = (Array.isArray(poll.options) ? poll.options : []).find(o => o.id === winnerId);
      if (!winner) return;

      tx.update(ref, {
        date: winner.date,
        time: winner.time,
        updatedAt: Date.now(),
        'poll.status': 'closed',
        'poll.winnerOptionId': winnerId,
        'poll.closedAt': Date.now(),
        'poll.closedBy': user?.uid,
        'poll.autoFinalized': false
      });
    });
    showToast("Gewinner Ã¼bernommen");
  } catch (e) {
    showToast("Finalisieren fehlgeschlagen");
  } finally {
    setPollBusy(false);
  }
};

// --- POLL helpers for calendar bottom panel ---
const voteInPollForSpecificEvent = async (ev, optionId, state = POLL_STATE.YES) => {
  if (!user || !ev || !ev.id) return;
  const calId = ev.calendarId || 'default';
  if (calId !== 'default' && !canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  const pollVer = Number(ev?.poll?.version || 1);

  try {
    if (pollVer >= 2) {
      await updateDoc(eventDocRefFor(calId, ev.id), {
        [`poll.votes.${user?.uid}.${optionId}`]: state,
        [`poll.votesUpdatedAt`]: Date.now(),
        updatedAt: Date.now()
      });
    } else {
      await updateDoc(eventDocRefFor(calId, ev.id), {
        [`poll.votes.${user?.uid}`]: optionId,
        [`poll.votesUpdatedAt`]: Date.now(),
        updatedAt: Date.now()
      });
    }
  } catch (e) {
    showToast("Vote fehlgeschlagen");
  }
};

const finalizePollForSpecificEvent = async (ev) => {
  if (!user || !ev || !ev.id) return;
  const calId = ev.calendarId || 'default';
  if (calId !== 'default' && !canWriteCalendar(calId)) return showToast("Keine Schreibrechte");

  setPollBusy(true);
  try {
    await runTransaction(db, async (tx) => {
      const ref = eventDocRefFor(calId, ev.id);
      const snap = await tx.get(ref);
      if (!snap.exists()) return;

      const data = snap.data() || {};
      const poll = data.poll || null;
      if (!poll || poll.status !== 'open') return;

      const voterIds = Array.isArray(poll.voterIds) ? poll.voterIds : computePollVoterIdsForEvent({ ...ev, ...data });
      const tally = computePollTally(poll, voterIds);
      if (!tally.canFinalizeNow) return;

      const winnerId = tally.winnerOptionId;
      const winner = (Array.isArray(poll.options) ? poll.options : []).find(o => o.id === winnerId);
      if (!winner) return;

      tx.update(ref, {
        date: winner.date,
        time: winner.time,
        updatedAt: Date.now(),
        'poll.status': 'closed',
        'poll.winnerOptionId': winnerId,
        'poll.closedAt': Date.now(),
        'poll.closedBy': user?.uid,
        'poll.autoFinalized': false
      });
    });
    showToast("Gewinner Ã¼bernommen");
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
    return collection(db, 'artifacts', APP_ID, 'users', user?.uid, 'events');
  }
  return collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId, 'events');
};

function eventDocRefFor(calId, eventId) {
  if (!user) return null;
  if (calId === 'default') {
    return doc(db, 'artifacts', APP_ID, 'users', user?.uid, 'events', eventId);
  }
  return doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId, 'events', eventId);
};

// --- AUDIT LOG ---
const writeUserAudit = async (entry) => {
  try {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user?.uid, 'auditLogs'), {
      ts: serverTimestamp(),
      tsMs: Date.now(),
      uid: user?.uid,
      ...entry,
    });
  } catch (_) {}
};

const writeCalendarAudit = async (calId, entry) => {
  try {
    if (!user) return;
    if (!calId || calId === 'default') return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId, 'auditLogs'), {
      ts: serverTimestamp(),
      tsMs: Date.now(),
      uid: user?.uid,
      calId,
      ...entry,
    });
  } catch (_) {}
};

const writeAudit = async ({ calId, action, targetType, targetId, summary, details }) => {
  const payload = {
    action: String(action || ''),
    targetType: String(targetType || ''),
    targetId: String(targetId || ''),
    summary: String(summary || ''),
    details: details && typeof details === 'object' ? details : null,
  };
  await writeUserAudit(payload);
  await writeCalendarAudit(calId, payload);
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

  const locationVal = (eventForm.location || '').trim();
  let durationMinutesVal = null;
  try {
    const raw = eventForm.durationMinutes;
    if (raw !== '' && raw !== null && typeof raw !== 'undefined') {
      const n = parseInt(String(raw), 10);
      if (!isNaN(n) && n >= 0) durationMinutesVal = n;
    }
  } catch (_) { durationMinutesVal = null; }

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

  // Nur dieses Vorkommen Ã¤ndern (Override)
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
          location: locationVal,
          durationMinutes: durationMinutesVal,
          type: typeVal,
          desc: descVal,
          reminderMode: reminderModeVal,
          reminderMinutes: reminderMinutesVal
        }
      };
      const ex = Array.isArray(eventToEdit.exDates) ? eventToEdit.exDates : [];
      const nextEx = ex.filter(d => d !== selectedDateForEvent);
      await updateDoc(eventDocRefFor(fromCalId, eventToEdit.id), { overrides: nextOverrides, exDates: nextEx, updatedAt: Date.now() });
      await writeAudit({ calId: fromCalId, action: 'event.update.instance', targetType: 'event', targetId: eventToEdit.id, summary: `Termin geÃ¤ndert (nur ${selectedDateForEvent}): ${title}` });
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
    location: locationVal,
    durationMinutes: durationMinutesVal,
    type: typeVal,
    desc: descVal,
    reminderMode: reminderModeVal,
    reminderMinutes: reminderMinutesVal,
    updatedAt: Date.now(),
    recurrence: recurrence || null,
    exDates: isEditing ? (Array.isArray(eventToEdit.exDates) ? eventToEdit.exDates : []) : [],
    overrides: isEditing ? (eventToEdit.overrides && typeof eventToEdit.overrides === 'object' ? eventToEdit.overrides : {}) : {}
  };

  // Optional: Abstimmung direkt beim Erstellen
  if (!eventToEdit && createPollOnSave) {
    const opts = (pollDraft || []).map((o, idx) => ({
      id: `opt_${Date.now()}_${idx}`,
      date: (o?.date || '').trim(),
      time: (o?.time || '').trim(),
    })).filter(o => o.date && o.time);

    if (opts.length < 2) return showToast("Bitte mind. 2 VorschlÃ¤ge");

    const voterIds = computePollVoterIdsForEvent({ calendarId: targetCalId });
    const deadlineAt = makeDeadlineAt(pollDeadlineDate, pollDeadlineTime);
    payload.poll = {
      version: 2,
      voteMode: 'matrix',
      status: 'open',
      createdAt: Date.now(),
      createdBy: user?.uid,
      voterIds,
      options: opts,
      votes: {},
      winnerOptionId: null,
      closedAt: null,
      deadlineAt: deadlineAt || null,
      autoFinalizeAtDeadline: !!pollAutoFinalize,
      autoFinalized: false,
    };

    // Wenn keine Zeit gesetzt ist, nimm den ersten Vorschlag als Anzeige-Default
    if (!payload.time && opts[0]?.time) payload.time = opts[0].time;
    if (!payload.date && opts[0]?.date) payload.date = opts[0].date;
  }

  try {
    if (eventToEdit) {
      const fromCalId = eventToEdit.calendarId || 'default';
      const toCalId = targetCalId;

      if (!canWriteCalendar(fromCalId)) return showToast("Keine Schreibrechte");

      if (fromCalId === toCalId) {
        await updateDoc(eventDocRefFor(fromCalId, eventToEdit.id), payload);
        await writeAudit({ calId: fromCalId, action: 'event.update', targetType: 'event', targetId: eventToEdit.id, summary: `Termin gespeichert: ${title}` });
        showToast("Termin gespeichert");
      } else {
        // Move between calendars: create new + delete old
        const colRef = eventCollectionRefFor(toCalId);
        const newRef = await addDoc(colRef, {
          ...payload,
          createdAt: eventToEdit.createdAt || Date.now(),
          movedAt: Date.now()
        });
        await deleteDoc(eventDocRefFor(fromCalId, eventToEdit.id));
        await writeAudit({ calId: fromCalId, action: 'event.move', targetType: 'event', targetId: eventToEdit.id, summary: `Termin verschoben: ${title} â†’ ${getCalendarById(toCalId)?.name || toCalId}`, details: { toCalId, newEventId: newRef?.id || null } });
        showToast("Termin verschoben");
        setActiveCalendarId(toCalId);
      }
    } else {
      const colRef = eventCollectionRefFor(targetCalId);
      const newRef = await addDoc(colRef, { ...payload, createdAt: Date.now() });
      await writeAudit({ calId: targetCalId, action: 'event.create', targetType: 'event', targetId: newRef?.id || '', summary: `Termin erstellt: ${title}` });
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
    if (!confirm("Dieses Vorkommen lÃ¶schen?")) return;
    try {
      const ex = Array.isArray(eventToEdit.exDates) ? eventToEdit.exDates : [];
      const nextEx = ex.includes(selectedDateForEvent) ? ex : [...ex, selectedDateForEvent];
      const existingOverrides = (eventToEdit.overrides && typeof eventToEdit.overrides === 'object') ? eventToEdit.overrides : {};
      const { [selectedDateForEvent]: _removed, ...rest } = existingOverrides || {};
      await updateDoc(eventDocRefFor(calId, eventToEdit.id), { exDates: nextEx, overrides: rest, updatedAt: Date.now() });
      await writeAudit({ calId, action: 'event.delete.instance', targetType: 'event', targetId: eventToEdit.id, summary: `Vorkommen gelÃ¶scht (${selectedDateForEvent}): ${eventToEdit.title || ''}` });
      showToast("Vorkommen gelÃ¶scht");
      closeEventModal();
    } catch (err) {
      showToast("Fehler beim LÃ¶schen");
    }
    return;
  }

  if (!confirm("Termin lÃ¶schen?")) return;
  try {
    await deleteDoc(eventDocRefFor(calId, eventToEdit.id));
    await writeAudit({ calId, action: 'event.delete', targetType: 'event', targetId: eventToEdit.id, summary: `Termin gelÃ¶scht: ${eventToEdit.title || ''}` });
    showToast("Termin gelÃ¶scht");
    closeEventModal();
  } catch (err) {
    showToast("Fehler beim LÃ¶schen");
  }
};


const openShiftPicker = (dateStr) => {
  const activeCal = getCalendarById(activeCalendarId);
  if (!activeCal || activeCal.type !== 'shift') return;
  if (activeCal.id !== 'default' && activeCal.ownerId !== user?.uid && activeCal.sharedWith?.[user?.uid] !== 'write') {
    return showToast("Nur Lesezugriff auf diesen Kalender.");
  }
  if (!activeCal.shifts || activeCal.shifts.length === 0) return showToast("Keine Schichten konfiguriert.");
  setShiftModalData({ dateStr, calId: activeCal.id, shifts: activeCal.shifts });
};

// --- GEHEIMER CHAT (Long Press auf Tag-Zahl 5 fÃ¼r 3s) ---
const revealSecretChat = () => {
  setSelectedMessageId(null);
  setIsMessageSearchOpen(false);
  setIsChatMetaMenuOpen(false);
  setSecretPinError('');
  setSecretPinInput('');
  setActiveChat(null);
  setSecretView('list');
  setCurrentView('secret_chat');
};

const hideSecretChatNow = (toast = 'Secret Chat versteckt') => {
  setSelectedMessageId(null);
  setIsMessageSearchOpen(false);
  setIsChatMetaMenuOpen(false);
  setActiveChat(null);
  setSecretView('list');
  setCurrentView('calendar');
  if (toast) showToast(toast);
};

const requestSecretEntry = () => {
  const pinEnabled = !!(userProfile?.secretPinEnabled && userProfile?.secretPinHash);
  if (pinEnabled) {
    setSecretPinError('');
    setSecretPinInput('');
    setSecretPinModalOpen(true);
    return;
  }
  revealSecretChat();
};

const verifySecretPinAndEnter = async () => {
  const raw = String(secretPinInput || '').trim();
  if (!/^\d{4,8}$/.test(raw)) {
    setSecretPinError('PIN muss 4 bis 8 Ziffern haben');
    return;
  }
  try {
    setSecretPinBusy(true);
    setSecretPinError('');
    const candidate = await sha256Hex(raw);
    if (candidate !== userProfile?.secretPinHash) {
      setSecretPinError('PIN falsch');
      return;
    }
    setSecretPinModalOpen(false);
    setSecretPinInput('');
    revealSecretChat();
  } catch (e) {
    console.warn('verifySecretPinAndEnter failed', e);
    setSecretPinError('PIN konnte nicht geprÃ¼ft werden');
  } finally {
    setSecretPinBusy(false);
  }
};

const saveSecretPinSettings = async () => {
  if (!user?.uid) return;
  const nextPin = String(secretPinSetupNew || '').trim();
  const confirmPin = String(secretPinSetupConfirm || '').trim();
  const currentPin = String(secretPinSetupCurrent || '').trim();
  const hasExistingPin = !!(userProfile?.secretPinEnabled && userProfile?.secretPinHash);

  if (!/^\d{4,8}$/.test(nextPin)) return showToast('PIN muss 4 bis 8 Ziffern haben');
  if (nextPin !== confirmPin) return showToast('PIN-BestÃ¤tigung stimmt nicht Ã¼berein');
  if (hasExistingPin) {
    if (!/^\d{4,8}$/.test(currentPin)) return showToast('Aktuelle PIN eingeben');
    const currentHash = await sha256Hex(currentPin);
    if (currentHash !== userProfile?.secretPinHash) return showToast('Aktuelle PIN ist falsch');
  }

  try {
    setSecretPinActionBusy(true);
    const nextHash = await sha256Hex(nextPin);
    const patch = { secretPinEnabled: true, secretPinHash: nextHash, updatedAt: Date.now() };
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), patch, { merge: true });
    setUserProfile(prev => ({ ...(prev || {}), ...patch }));
    setSecretPinSetupCurrent('');
    setSecretPinSetupNew('');
    setSecretPinSetupConfirm('');
    showToast(hasExistingPin ? 'Secret PIN geÃ¤ndert' : 'Secret PIN aktiviert');
  } catch (e) {
    console.warn('saveSecretPinSettings failed', e);
    showToast('PIN konnte nicht gespeichert werden');
  } finally {
    setSecretPinActionBusy(false);
  }
};

const disableSecretPin = async () => {
  if (!user?.uid) return;
  const currentPin = String(secretPinSetupCurrent || '').trim();
  if (!(userProfile?.secretPinEnabled && userProfile?.secretPinHash)) return;
  if (!/^\d{4,8}$/.test(currentPin)) return showToast('Aktuelle PIN eingeben');
  try {
    setSecretPinActionBusy(true);
    const currentHash = await sha256Hex(currentPin);
    if (currentHash !== userProfile?.secretPinHash) {
      showToast('Aktuelle PIN ist falsch');
      return;
    }
    const patch = { secretPinEnabled: false, secretPinHash: '' , updatedAt: Date.now() };
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), patch, { merge: true });
    setUserProfile(prev => ({ ...(prev || {}), ...patch }));
    setSecretPinSetupCurrent('');
    setSecretPinSetupNew('');
    setSecretPinSetupConfirm('');
    showToast('Secret PIN deaktiviert');
  } catch (e) {
    console.warn('disableSecretPin failed', e);
    showToast('PIN konnte nicht deaktiviert werden');
  } finally {
    setSecretPinActionBusy(false);
  }
};

const toggleSecretAutoHide = async () => {
  if (!user?.uid) return;
  const nextValue = !(userProfile?.secretPanicOnHide !== false);
  const patch = { secretPanicOnHide: nextValue, updatedAt: Date.now() };
  try {
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), patch, { merge: true });
    setUserProfile(prev => ({ ...(prev || {}), ...patch }));
    showToast(nextValue ? 'Auto-Panic aktiv' : 'Auto-Panic aus');
  } catch (e) {
    console.warn('toggleSecretAutoHide failed', e);
    showToast('Einstellung konnte nicht gespeichert werden');
  }
};

const temporarilySuspendSecretAutoHide = (ms = 30000) => {
  try {
    if (currentView !== 'secret_chat') return;
    if (userProfile?.secretPanicOnHide === false) return;
    const ttl = Math.max(3000, Number(ms || 0));
    secretPanicBypassUntilRef.current = Date.now() + ttl;
  } catch (_) {}
};

const startSecretGate = () => {
  secretGateTriggered.current = false;
  if (secretPressTimer.current) clearTimeout(secretPressTimer.current);
  secretPressTimer.current = setTimeout(() => {
    secretGateTriggered.current = true;
    requestSecretEntry();
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

      const activeChatData = activeChat?.id ? (Array.isArray(myChats) ? myChats.find(c => c && c.id === activeChat.id) : null) : null;

      const getTypingUsers = (chat) => {
        if (!chat || !chat.typing) return [];
        const now = Date.now();
        const typingMap = chat.typing || {};
        const typingAt = chat.typingAt || {};
        return Object.keys(typingMap).filter(uid => uid !== user?.uid && typingMap[uid] === true && (now - (typingAt[uid] || 0) < 6500));
      };

      const partnerId = (activeChatData && !isGroupChat(activeChatData) && Array.isArray(activeChatData.participants)) ? activeChatData.participants.find(id => id !== user?.uid) : null;
      const isPartnerTyping = activeChatData ? (getTypingUsers(activeChatData).length > 0) : false;

      const refreshDailyFact = () => {
        const list = (quotes && quotes.length) ? quotes : DEFAULT_QUOTES;
        const q = list[Math.floor(Math.random() * list.length)];
        setDailyFact(q);
        try { localStorage.setItem('onyx_quote_override', q); localStorage.setItem('onyx_quote_override_day', todayKey); } catch(e) {}
      };

      const toggleTheme = () => setUiTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
      const isExtraFieldEnabled = (field) => {
        const defaultOn = !['workClockHomeEnabled'].includes(field);
        return ((userProfile && Object.prototype.hasOwnProperty.call(userProfile, field)) ? userProfile[field] : defaultOn) === true;
      };
      const saveExtraFieldToggle = async (field) => {
        try {
          const next = !isExtraFieldEnabled(field);
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { [field]: next, updatedAt: Date.now() }, { merge: true });
          setUserProfile(prev => ({ ...(prev || {}), [field]: next }));
          showToast(next ? 'Aktiviert' : 'Deaktiviert');
        } catch (_) { showToast('Fehler'); }
      };
      const toggleExtrasSection = (key) => setExtrasSectionsOpen((prev) => ({ ...(prev || {}), [key]: !prev?.[key] }));


      const pinnedChatIds = (userProfile && Array.isArray(userProfile?.pinnedChats)) ? userProfile?.pinnedChats : [];
      const hiddenChatIds = (userProfile && Array.isArray(userProfile?.hiddenChats)) ? userProfile?.hiddenChats : [];
      const friendIds = (userProfile && Array.isArray(userProfile?.friends)) ? userProfile?.friends : [];
      const blockedUserIds = (userProfile && Array.isArray(userProfile?.blockedUsers)) ? userProfile?.blockedUsers : [];
      const friendRequestIncomingIds = (userProfile && Array.isArray(userProfile?.friendRequestsIncoming)) ? userProfile?.friendRequestsIncoming : [];
      const friendRequestSentIds = (userProfile && Array.isArray(userProfile?.friendRequestsSent)) ? userProfile?.friendRequestsSent : [];
      const sortedMyChats = [...myChats]
        .filter(c => c && c.id && !hiddenChatIds.includes(c.id))
        .filter((c) => {
          if (isGroupChat(c)) return true;
          const otherUid = Array.isArray(c?.participants) ? c.participants.find((id) => id !== user?.uid) : null;
          return !otherUid || !blockedUserIds.includes(otherUid);
        })
        .sort((a, b) => {
        const ap = pinnedChatIds.includes(a.id) ? 1 : 0;
        const bp = pinnedChatIds.includes(b.id) ? 1 : 0;
        if (bp !== ap) return bp - ap;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });

      const messageHasLink = (m) => {
        const t = String(m?.text || '');
        return /(https?:\/\/|www\.)\S+/i.test(t);
      };

      const messageTypeMatchesFilter = (m, filter) => {
        if (!m) return false;
        const f = String(filter || 'all');
        if (f === 'all') return true;
        if (f === 'media') return !!(m.image);
        if (f === 'audio') return !!m.audio;
        if (f === 'links') return messageHasLink(m);
        if (f === 'favorites') return Array.isArray(m?.starredBy) && m.starredBy.includes(user?.uid);
        return true;
      };

      const escapeRegExp = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      function renderHighlightedText(text, query, opts = {}) {
        const q = String(query || '').trim();
        if (!q) return text;
        const src = String(text || '');
        if (!src) return src;
        const re = new RegExp(escapeRegExp(q), 'ig');
        const out = [];
        let last = 0;
        let m;
        let k = 0;
        while ((m = re.exec(src)) !== null) {
          const start = m.index ?? 0;
          const end = start + (m[0] || '').length;
          if (start > last) out.push(src.slice(last, start));
          const matchText = src.slice(start, end);
          const isMe = !!opts.isMe;
          const isActive = !!opts.active;
          const cls = isActive
            ? (isMe ? 'bg-black text-white' : 'bg-white text-black') + ' rounded px-0.5'
            : (isMe ? 'bg-black/20 text-black' : 'bg-white/25 text-white') + ' rounded px-0.5';
          out.push(<span key={`hl_${k++}`} className={cls}>{matchText}</span>);
          last = end;
          if (re.lastIndex === start) re.lastIndex++; // safety
        }
        if (last < src.length) out.push(src.slice(last));
        return out;
      };



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
      try { ensureWebPushToken(currentUser, { forcePrompt: false }); } catch(_) {}
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
        const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid);
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
        setMessageSearchFilter('all');
        setIsChatMetaMenuOpen(false);
      }, [activeChat?.id, secretView]);

      // Chat meta prefs: load/save (per user)
      useEffect(() => {
        if (!user?.uid) return;
        try {
          const key = `onyx_msg_meta_${user?.uid}`;
          const raw = localStorage.getItem(key) || localStorage.getItem('onyx_msg_meta');
          if (raw) {
            const j = JSON.parse(raw);
            if (j && typeof j === 'object') {
              setChatMetaPrefs({
                showTime: j.showTime !== false,
                receipts: ['off','compact','full'].includes(j.receipts) ? j.receipts : 'compact'
              });
            }
          }
        } catch (_) {}
      }, [user?.uid]);

      useEffect(() => {
        if (!user?.uid) return;
        try {
          const key = `onyx_msg_meta_${user?.uid}`;
          localStorage.setItem(key, JSON.stringify(chatMetaPrefs));
          localStorage.setItem('onyx_msg_meta', JSON.stringify(chatMetaPrefs));
        } catch (_) {}
      }, [chatMetaPrefs, user?.uid]);

      useEffect(() => {
        if (!isChatMetaMenuOpen) return;
        const onDown = (e) => {
          try {
            if (chatMetaMenuRef.current && !chatMetaMenuRef.current.contains(e.target)) {
              setIsChatMetaMenuOpen(false);
            }
          } catch (_) {}
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown, { passive: true });
        return () => {
          document.removeEventListener('mousedown', onDown);
          document.removeEventListener('touchstart', onDown);
        };
      }, [isChatMetaMenuOpen]);

      useEffect(() => {
        setMessageMatchIndex(0);
      }, [messageSearchQuery, messageSearchFilter]);

      useEffect(() => {
        if (!isMessageSearchOpen) return;
        if (!messageMatches || messageMatches.length === 0) return;
        const idx = Math.max(0, Math.min(messageMatchIndex, messageMatches.length - 1));
        const id = messageMatches[idx].id;
        setTimeout(() => {
          const el = document.getElementById(`msg-${id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
      }, [messageMatchIndex, messageSearchQuery, messageSearchFilter, isMessageSearchOpen, messageMatches]);


      useEffect(() => {
        setIsPaintbrushActive(false);
      }, [activeCalendarId]);

      // --- Hash routing for public shares (#/share/<token>?k=<magicKey>) ---
      useEffect(() => {
        const parseHash = () => {
          try {
            const h = String(window.location.hash || '');
            // Example: #/share/AbCdEf123?k=xyz
            const m = h.match(/^#\/share\/([A-Za-z0-9_-]{8,})/);
            const token = m ? m[1] : null;
            let key = '';
            try {
              const qs = h.includes('?') ? h.split('?').slice(1).join('?') : '';
              if (qs) {
                const params = new URLSearchParams(qs);
                key = params.get('k') || '';
              }
            } catch (_) {}
            setPublicShareToken(token);
            setPublicShareKey(key);
          } catch (_) {
            setPublicShareToken(null);
            setPublicShareKey('');
          }
        };
        parseHash();
        window.addEventListener('hashchange', parseHash);
        return () => window.removeEventListener('hashchange', parseHash);
      }, []);

      // Load public share doc (works without login)
      useEffect(() => {
        (async () => {
          if (!publicShareToken) {
            setPublicShareDoc(null);
            setPublicShareError('');
            setPublicShareAuthed(false);
            setPublicSharePasscode('');
            return;
          }
          setPublicShareLoading(true);
          setPublicShareError('');
          setPublicShareDoc(null);
          setPublicShareAuthed(false);

          try {
            const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'shares', publicShareToken);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
              setPublicShareError('Link nicht gefunden');
              setPublicShareLoading(false);
              return;
            }
            const data = snap.data() || {};

            // Expiry / revoke
            if (data.revokedAtMs) {
              setPublicShareError('Dieser Link wurde widerrufen');
              setPublicShareLoading(false);
              return;
            }
            if (data.expiresAtMs && Date.now() > data.expiresAtMs) {
              setPublicShareError('Dieser Link ist abgelaufen');
              setPublicShareLoading(false);
              return;
            }

            setPublicShareDoc({ id: snap.id, ...data });

            // Restore auth if previously verified (passcode)
            try {
              const ok = sessionStorage.getItem(`onyx_share_ok_${publicShareToken}`);
              if (ok === '1') setPublicShareAuthed(true);
            } catch (_) {}
          } catch (e) {
            console.warn('[Share] load failed', e);
            setPublicShareError('Fehler beim Laden');
          } finally {
            setPublicShareLoading(false);
          }
        })();
      }, [publicShareToken, publicShareKey]);

      const verifyPublicSharePasscode = async () => {
        try {
          const d = publicShareDoc || {};
          const pc = String(publicSharePasscode || '').trim();
          if (!pc) return;
          const salt = String(d.passcodeSalt || '');
          const expected = String(d.passcodeHash || '');
          if (!salt || !expected) return;
          const got = await sha256Hex(`${salt}|${pc}`);
          if (got === expected) {
            setPublicShareAuthed(true);
            try { sessionStorage.setItem(`onyx_share_ok_${publicShareToken}`, '1'); } catch (_) {}
          } else {
            showToast('Passcode falsch');
          }
        } catch (_) {
          showToast('Fehler');
        }
      };

      // --- ALLGEMEINE DATEN SYNC ---
      useEffect(() => {
        if (!user) return;

        const eventsRef = collection(db, 'artifacts', APP_ID, 'users', user?.uid, 'events');
        const unsubscribeEvents = onSnapshot(query(eventsRef), (snapshot) => {
          const loadedEvents = [];
          snapshot.forEach((doc) => loadedEvents.push({ id: doc.id, calendarId: 'default', ...doc.data() }));
          setEvents(loadedEvents);
        });

        const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (!docSnap.exists()) return;
          const incoming = { id: docSnap.id, ...docSnap.data() };
          setUserProfile(prev => {
            try {
              const localAlias = String(localStorage.getItem(`onyx_username_${user?.uid}`) || '').trim();
              const localDisplayName = String(localStorage.getItem(`onyx_displayName_${user?.uid}`) || '').trim();
              const prevAlias = String(prev?.username || '').trim();
              const incomingAlias = String(incoming?.username || '').trim();
              const prevUpdatedAt = Number(prev?.updatedAt || 0);
              const incomingUpdatedAt = Number(incoming?.updatedAt || 0);
              const merged = { ...(prev || {}), ...incoming };

              if (prevAlias && incomingAlias && prevAlias !== incomingAlias && prevUpdatedAt > incomingUpdatedAt) {
                merged.username = prevAlias;
                merged.usernameLower = String(prevAlias).toLowerCase();
              }

              if (localAlias && (!merged.username || incomingUpdatedAt < prevUpdatedAt || localAlias !== incomingAlias)) {
                merged.username = localAlias;
                merged.usernameLower = String(localAlias).toLowerCase();
              }

              if (localDisplayName && !merged.displayName) {
                merged.displayName = localDisplayName;
              }
              try {
                const localClockRaw = localStorage.getItem(`onyx_work_clock_active_${user?.uid}`);
                if (localClockRaw) {
                  const localClock = JSON.parse(localClockRaw);
                  const incomingClock = incoming?.workClockActive || null;
                  if (localClock?.startedAt && (!incomingClock?.startedAt || Number(localClock.startedAt) >= Number(incomingClock.startedAt || 0))) {
                    merged.workClockActive = localClock;
                  }
                }
              } catch (_) {}
              return merged;
            } catch (_) {
              return incoming;
            }
          });
        });

        const allProfilesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles');
        const unsubscribeAllProfiles = onSnapshot(query(allProfilesRef), (snapshot) => {
          const loaded = [];
          snapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() }));
          setAllProfiles(loaded);
        });

        const chatsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats');
        const chatsQ = query(chatsRef, where('participants', 'array-contains', user?.uid));
        const unsubscribeChats = onSnapshot(chatsQ, (snapshot) => {
          const loadedChats = [];
          snapshot.forEach(doc => loadedChats.push({ id: doc.id, ...doc.data() }));
          const safeChats = loadedChats.filter(chat => chat && chat.id).map((chat) => ({ ...chat, participants: Array.isArray(chat.participants) ? chat.participants.filter(Boolean) : [], admins: Array.isArray(chat.admins) ? chat.admins.filter(Boolean) : [] }));
          safeChats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          setMyChats(safeChats);
        });

        // Public share links created by this user
        const sharesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'shares');
        const sharesQ = query(sharesRef, where('createdByUid', '==', user?.uid), limit(100));
        const unsubscribeShares = onSnapshot(sharesQ, (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
          setShareLinks(list);
        }, (err) => {
          // permission-denied is ok if rules are strict; feature still works for logged-in users if allowed
          console.warn('[Sharing] shares subscribe failed', err?.code || err);
          setShareLinks([]);
        });

        // Personal audit log (your actions)
        const auditRef = collection(db, 'artifacts', APP_ID, 'users', user?.uid, 'auditLogs');
        const auditQ = query(auditRef, orderBy('tsMs', 'desc'), limit(80));
        const unsubscribeAudit = onSnapshot(auditQ, (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.tsMs || 0) - (a.tsMs || 0));
          setAuditEntries(list);
        }, (err) => {
          console.warn('[Audit] subscribe failed', err?.code || err);
          setAuditEntries([]);
        });

        const calRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars');

        // ðŸ”’ Wichtig fÃ¼r sichere Firestore Rules:
        // Wir dÃ¼rfen NICHT die komplette calendars Collection lesen und client-side filtern,
        // sonst scheitert die Query mit permission-denied.
        const ownerQ = query(calRef, where('ownerId', '==', user?.uid));
        const sharedQ = query(calRef, where('sharedWith.' + user?.uid, 'in', ['read', 'write']));

        let ownerCals = [];
        let sharedCals = [];

        const normalizeShift = (shift, index = 0) => ({
          id: String(shift?.id || `shift_${index}_${Math.random().toString(36).slice(2, 8)}`),
          name: String(shift?.name || 'Schicht'),
          color: String(shift?.color || '#ffffff'),
          time: String(shift?.time || ''),
        });

        const normalizeCalendar = (calendar, index = 0) => ({
          id: String(calendar?.id || `calendar_${index}_${Math.random().toString(36).slice(2, 8)}`),
          name: String(calendar?.name || 'Kalender'),
          type: String(calendar?.type || 'normal'),
          ownerId: calendar?.ownerId ?? null,
          color: String(calendar?.color || ''),
          sharedWith: (calendar?.sharedWith && typeof calendar.sharedWith === 'object') ? calendar.sharedWith : {},
          shifts: Array.isArray(calendar?.shifts) ? calendar.shifts.filter(Boolean).map(normalizeShift) : [],
        });

        const recomputeCals = () => {
          const byId = new Map();
          (ownerCals || []).filter(Boolean).map(normalizeCalendar).forEach(c => byId.set(c.id, c));
          (sharedCals || []).filter(Boolean).map(normalizeCalendar).forEach(c => byId.set(c.id, c));
          const merged = Array.from(byId.values()).filter(Boolean);
          setCustomCalendars(merged);
          setVisibleCalendars(prev => {
            const newVisible = new Set(Array.isArray(prev) ? prev : []);
            merged.forEach(c => {
              if (c?.id) newVisible.add(c.id);
            });
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

        return () => { unsubscribeEvents(); unsubscribeProfile(); unsubscribeAllProfiles(); unsubscribeChats(); unsubscribeShares(); unsubscribeAudit(); unsubscribeOwnerCals(); unsubscribeSharedCals(); };
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
            } else if (prof.id === user?.uid) {
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
        if (!user || (customCalendars || []).filter(Boolean).length === 0) return;
        
        const unsubscribes = (customCalendars || []).filter(Boolean).map(cal => {
           const calEventsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', cal.id, 'events');
           return onSnapshot(query(calEventsRef), (snapshot) => {
              const evts = [];
              snapshot.forEach(doc => evts.push({ id: doc.id, calendarId: cal.id, ...doc.data() }));
              setSharedEventsMap(prev => ({ ...prev, [cal.id]: evts }));
           });
        });

        return () => unsubscribes.forEach(fn => fn());
      }, [customCalendars, user]);

      // Calendar audit log (shared/owned calendars)
      useEffect(() => {
        if (!user) return;
        if (!auditCalId || auditCalId === 'default') {
          setAuditCalEntries([]);
          return;
        }
        const cal = customCalendars.find(c => c.id === auditCalId);
        if (!cal) {
          setAuditCalEntries([]);
          return;
        }
        const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', auditCalId, 'auditLogs');
        const qy = query(ref, orderBy('tsMs', 'desc'), limit(80));
        const unsub = onSnapshot(qy, (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.tsMs || 0) - (a.tsMs || 0));
          setAuditCalEntries(list);
        }, (err) => {
          console.warn('[Audit] calendar audit subscribe failed', err?.code || err);
          setAuditCalEntries([]);
        });
        return () => { try { unsub(); } catch (_) {} };
      }, [auditCalId, user, customCalendars]);

      // --- CHAT MESSAGES SYNC (Pagination: letzte 25 + Infinite Scroll nach oben) ---
      useEffect(() => {
        if (!activeChat || !user) return;

        // Reset pagination state when switching chats
        chatOldestCursorRef.current = null;
        chatLoadedMoreRef.current = false;
        chatAutoLoadLockRef.current = false;
        setChatHasMore(false);
        setChatLoadingMore(false);

        const messagesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages');
        const latestQ = query(messagesRef, orderBy('timestamp', 'desc'), limit(CHAT_PAGE_SIZE));

        const unsubscribeMessages = onSnapshot(latestQ, (snapshot) => {
          const loadedDesc = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const loaded = [...loadedDesc].reverse(); // ascending

          // Cursor (oldest doc among currently listened page)
          const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
          if (!chatLoadedMoreRef.current) {
            chatOldestCursorRef.current = lastDoc;
          }

          // HasMore: only meaningful when we have a full page
          const couldHaveMore = snapshot.docs.length >= CHAT_PAGE_SIZE;
          // If user already loaded more, we keep hasMore as-is unless we know it is false
          if (!chatLoadedMoreRef.current) setChatHasMore(couldHaveMore);

          const unreadToUpdate = [];
          const deliveredToUpdate = [];

          // Read/delivered marking only for messages in latest window
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() || {};
            if (data.senderId !== user?.uid && !data.read && currentView === 'secret_chat' && secretView === 'chat' && (!Array.isArray(activeChat.participants) || activeChat.participants.length <= 2)) {
              unreadToUpdate.push(docSnap.id);
            }
            if (data.senderId !== user?.uid && !data.deliveredAt && (!Array.isArray(activeChat.participants) || activeChat.participants.length <= 2)) {
              deliveredToUpdate.push(docSnap.id);
            }
          }

          // Merge with older-loaded + pending
          setChatMessages(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const pending = prevList.filter(m => m && m.pending && m.clientMsgId);

            // Keep older messages that are not in the latest page
            const latestIds = new Set(loaded.map(m => m.id));
            const older = prevList.filter(m => m && !m.pending && !latestIds.has(m.id));

            // Remove pending that already got server version
            const serverClientIds = new Set(loaded.map(m => m.clientMsgId).filter(Boolean));
            const pendingFiltered = pending.filter(m => m.clientMsgId && !serverClientIds.has(m.clientMsgId));

            const merged = [...older, ...loaded, ...pendingFiltered];
            merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            return merged;
          });

          // System-Notification fÃ¼r neue eingehende Nachrichten (wenn App nicht im Vordergrund ist)
          try {
            const lastMsg = loaded.length > 0 ? loaded[loaded.length - 1] : null;
            if (lastMsg && lastMsg.senderId !== user?.uid) {
              const mutedChatIds = (userProfile && Array.isArray(userProfile?.mutedChatIds)) ? userProfile?.mutedChatIds : [];
              const isMuted = mutedChatIds.includes(activeChat.id);
              const canNotify = (('Notification' in window) && Notification.permission === 'granted');
              const key = `onyx_last_notify_${activeChat.id}`;
              const lastNotifiedTs = parseInt(localStorage.getItem(key) || '0', 10) || 0;
              const isChatForeground = (currentView === 'secret_chat' && secretView === 'chat' && document.visibilityState === 'visible');
              if (!isMuted && canNotify && !isChatForeground && (lastMsg.timestamp || 0) > lastNotifiedTs) {
                // Secret chat stays secret -> no OS notification for chat messages.
                localStorage.setItem(key, String(lastMsg.timestamp || Date.now()));
              }
            }
          } catch (e) {}

          // lastRead (fÃ¼r Gruppen-Read-Receipts)
          if (currentView === 'secret_chat' && secretView === 'chat' && document.visibilityState === 'visible') {
            const nowMs = Date.now();
            if (nowMs - (lastReadWriteRef.current || 0) > 5000) {
              lastReadWriteRef.current = nowMs;
              updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), { [`lastRead.${user?.uid}`]: nowMs }).catch(()=>{});
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
        let cancelled = false;
        const chatId = activeChat?.id;
        if (!chatId || !user) {
          setChatTotalCount(0);
          setChatMediaItems([]);
          setChatMediaLoading(false);
          return;
        }
        const hintedCount = Number(activeChatData?.messageCount || activeChat?.messageCount || 0);
        if (hintedCount > 0) setChatTotalCount(hintedCount);
        const loadAllChatMeta = async () => {
          setChatMediaLoading(true);
          try {
            const messagesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chatId, 'messages');
            const snap = await getDocs(query(messagesRef, orderBy('timestamp', 'asc')));
            if (cancelled) return;
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const media = all
              .filter(m => m && !m.deleted && !!m.image)
              .map(m => ({
                id: m.id,
                src: m.image,
                timestamp: Number(m.timestamp || 0) || 0,
                senderId: m.senderId || '',
                text: String(m.text || ''),
              }))
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setChatTotalCount(all.length);
            setChatMediaItems(media);
            const currentCount = Number(activeChatData?.messageCount || activeChat?.messageCount || 0);
            const currentMedia = Number(activeChatData?.mediaCount || activeChat?.mediaCount || 0);
            if (all.length !== currentCount || media.length !== currentMedia) {
              updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chatId), {
                messageCount: all.length,
                mediaCount: media.length,
                statsUpdatedAt: Date.now(),
              }).catch(() => {});
            }
          } catch (err) {
            console.warn('CHAT_META_LOAD_ERROR', err);
          } finally {
            if (!cancelled) setChatMediaLoading(false);
          }
        };
        loadAllChatMeta();
        return () => { cancelled = true; };
      }, [activeChat?.id, activeChatData?.messageCount, activeChatData?.mediaCount, user?.uid]);

      const loadMoreChatMessages = async () => {
        try {
          if (!activeChat || !user) return;
          if (chatLoadingMore) return;
          if (!chatHasMore) return;

          const cursor = chatOldestCursorRef.current;
          if (!cursor) return;

          setChatLoadingMore(true);
          chatLoadedMoreRef.current = true;

          // Mark as prepending so the "scroll-to-bottom" effect does not fire
          chatIsPrependingRef.current = true;

          const messagesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages');
          const nextQ = query(messagesRef, orderBy('timestamp', 'desc'), startAfter(cursor), limit(CHAT_PAGE_SIZE));

          const snap = await getDocs(nextQ);
          const docs = snap.docs || [];
          const pageDesc = docs.map(d => ({ id: d.id, ...d.data() }));
          const page = [...pageDesc].reverse();

          // Update cursor to the new oldest doc
          const newCursor = docs.length > 0 ? docs[docs.length - 1] : cursor;
          chatOldestCursorRef.current = newCursor;

          // If we received fewer than page size, no more
          if (docs.length < CHAT_PAGE_SIZE) setChatHasMore(false);

          // Preserve scroll position while prepending
          const scroller = chatScrollRef.current;
          const prevScrollHeight = scroller ? scroller.scrollHeight : 0;
          const prevScrollTop = scroller ? scroller.scrollTop : 0;
          chatScrollRestoreRef.current = { prevHeight: prevScrollHeight, prevTop: prevScrollTop };

          setChatMessages(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const existingIds = new Set(prevList.map(m => m.id));
            const toAdd = page.filter(m => !existingIds.has(m.id));
            const merged = [...toAdd, ...prevList];
            merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            return merged;
          });

          // Wait a tick, then restore position
          setTimeout(() => {
            try {
              const s = chatScrollRef.current;
              if (!s) return;
              const { prevHeight, prevTop } = chatScrollRestoreRef.current || { prevHeight: 0, prevTop: 0 };
              const newHeight = s.scrollHeight;
              const delta = newHeight - prevHeight;
              // Keep the same message at the top of the viewport
              s.scrollTop = prevTop + delta;
            } catch (_) {}
            chatAutoLoadLockRef.current = false;
            chatIsPrependingRef.current = false;
          }, 0);

        } catch (e) {
          console.warn('CHAT_LOAD_MORE_ERROR', e);
        } finally {
          setChatLoadingMore(false);
        }
      };

      // Auto-scroll to bottom ONLY when the user is already near bottom and we are not prepending
      useEffect(() => {
        try {
          if (secretView !== 'chat') return;
          if (chatIsPrependingRef.current) return;
          if (!chatStickToBottomRef.current) return;
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        } catch (_) {}
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
            if (doc.data().senderId === user?.uid) sent++;
            else received++;
          });
        }
        setChatStats({ sent, received, total: sent + received });
      };

      const ensureWebPushToken = async (currentUser, opts = {}) => {
  if (!currentUser) return;
  const forcePrompt = !!opts.forcePrompt;

  const isStandaloneNow = () => {
    try {
      const m = (window.matchMedia && window.matchMedia('(display-mode: standalone)'));
      const dm = !!(m && m.matches);
      const ios = !!(window.navigator && window.navigator.standalone);
      return dm || ios;
    } catch (_) { return false; }
  };

  if (!isStandaloneNow()) return;

  const messaging = await getMessagingSafe();
  if (!messaging) return;
  if (!('Notification' in window)) return;

  if (Notification.permission !== 'granted') {
    if (!forcePrompt) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
  }

  try {
    const swRegistration = await registerPushServiceWorker();
    if (!swRegistration) throw new Error('SERVICE_WORKER_NOT_READY');

    const token = await getToken(messaging, {
      vapidKey: 'BKwrZYTIUNm4rIcYhwED39WT0elWB8774ObVEKrJWhRlglke_ti9Vx3PTGcHjQZJ34HJw0xRK18oO14jZBI2rJI',
      serviceWorkerRegistration: swRegistration
    });

    if (token) {
      const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', currentUser.uid);
      let existingToken = null;
      try {
        const profileSnap = await getDoc(profileRef);
        existingToken = profileSnap.exists() ? profileSnap.data().fcmTokenWeb : null;
      } catch (_) {}
      if (token !== existingToken) console.log('[FCM] Token erneuert');
      await setDoc(
        profileRef,
        {
          fcmTokenWeb: token,
          lastWebTokenAt: Date.now(),
          pushTarget: 'web',
          pushPlatform: navigator.userAgent.includes('Android') ? 'android' : navigator.userAgent.includes('iPhone') ? 'ios' : 'desktop',
          pushBrowser: navigator.userAgent.includes('Chrome') ? 'chrome' : navigator.userAgent.includes('Firefox') ? 'firefox' : navigator.userAgent.includes('Safari') ? 'safari' : 'other',
          lastTokenRefreshAt: Date.now()
        },
        { merge: true }
      );
      setPushDiag(prev => ({ ...prev, lastTokenAt: Date.now(), lastError: '' }));
    } else {
      setPushDiag(prev => ({ ...prev, lastError: 'NO_TOKEN_RETURNED' }));
    }
  } catch (e) {
    console.warn('[FCM] ensure token failed', e?.message || e);
    setPushDiag(prev => ({ ...prev, lastError: (e?.message || String(e)) }));
  }
};

const requestNotificationPermission = async (currentUser) => {
  if (!currentUser) return;

  const isStandaloneNow = () => {
    try {
      const m = (window.matchMedia && window.matchMedia('(display-mode: standalone)'));
      const dm = !!(m && m.matches);
      const ios = !!(window.navigator && window.navigator.standalone);
      return dm || ios;
    } catch (_) { return false; }
  };

  if (!isStandaloneNow()) {
    showToast(isIosUA ? 'iPhone/iPad: Teilen â†’ â€žZum Home-Bildschirmâ€œ installieren, dann Benachrichtigungen aktivieren.' : 'Bitte als PWA installieren, dann Benachrichtigungen aktivieren.');
    return;
  }

  try {
    await ensureWebPushToken(currentUser, { forcePrompt: true });
    showToast('Benachrichtigungen aktiviert âœ…');
  } catch (err) {
    console.log('FCM Error', err);
    showToast('Benachrichtigungen konnten nicht aktiviert werden');
  }
};

      useEffect(() => {
        let unsubscribeMessage = null;

        (async () => {
          const messaging = await getMessagingSafe();
          if (!messaging) return;
	          unsubscribeMessage = onMessage(messaging, (payload) => {
	            const kind = payload?.data?.kind || '';
	            const chatId = payload?.data?.chatId || '';
	            const incomingTitle = payload?.data?.title || payload?.notification?.title || 'Neue Benachrichtigung!';
	            const incomingBody = payload?.data?.body || payload?.notification?.body || '';
	            const tag = payload?.data?.tag || `onyx_${kind || 'push'}_${chatId || 'x'}`;
	            const notifTitle = (kind === 'chat') ? 'Kalender Aktuell ðŸ”' : incomingTitle;

	            // Diagnostics: mark push as received even in foreground (SW only fires in background)
	            try {
	              setPushDiag((prev) => ({
	                ...prev,
	                lastReceivedAt: Date.now(),
	                lastReceivedTitle: String(notifTitle || '')
	              }));
	            } catch (_) {}

	            // Wenn Chat stummgeschaltet ist: keine In-App Benachrichtigung
	            try {
	              const muted = (userProfile && Array.isArray(userProfile?.mutedChatIds)) ? userProfile?.mutedChatIds : [];
	              if (kind === 'chat' && chatId && muted.includes(chatId)) return;
	            } catch (_) {}

	            // Foreground: UI aktualisiert sich via Firestore Listener.
	            // Chat: optional In-App Ping (Sound/Vibration) wenn App sichtbar ist.
	            let __isOpenChat = false;
	            try {
	              const prof = (userProfileRef && userProfileRef.current) ? userProfileRef.current : userProfile;
	              __isOpenChat = (kind === 'chat' && chatId && (currentViewRef?.current === 'secret_chat') && (activeChatIdRef?.current === chatId));
	              if (kind === 'chat' && chatId && document.visibilityState === 'visible' && !__isOpenChat) {
	                const enableSound = !(prof && prof.inAppChatSound === false);
	                const enableVibe = !(prof && prof.inAppChatVibrate === false);
	                if (enableSound || enableVibe) {
	                  try { lastChatPingRef.current[chatId] = Math.max(lastChatPingRef.current[chatId] || 0, Date.now()); } catch (_) {}
	                  try { pingInApp({ sound: enableSound, vibrate: enableVibe }); } catch (_) {}
	                }
	              }
	            } catch (_) {}

	            // Toast als Feedback
	            try {
	              const toastMsg = (kind === 'chat') ? 'Kalender Aktuell ðŸ”' : (incomingBody ? `${notifTitle}: ${incomingBody}` : notifTitle);
	              showToast(toastMsg);
	            } catch (_) {}

	            // System-Notification im Vordergrund nur bei Test/forceShow oder wenn Tab nicht sichtbar.
	            // Optional: auch fÃ¼r Chat im Vordergrund, falls aktiviert.
	            try {
	              const canNotify = ('Notification' in window) && Notification.permission === 'granted';
	              const forceShow = String(payload?.data?.forceShow || '') === '1' || kind === 'test';
	              if (!canNotify) return;

	              // Always show a real OS notification for incoming messages (unless the user is currently inside that conversation).
	              if (kind === 'chat' && chatId && !__isOpenChat) {
	                // Privacy: Chat OS notification should not show preview/body
	                showSystemNotification('Kalender Aktuell ðŸ”', null, tag);
	                return;
	              }

	              // Non-chat pushes (tests, reminders, etc.)
	              if (forceShow || document.visibilityState !== 'visible') {
	                showSystemNotification(notifTitle, (kind === 'chat') ? null : incomingBody, tag);
	              }
	            } catch (_) {}
	          });
        })();

        return () => {
          try { if (unsubscribeMessage) unsubscribeMessage(); } catch (_) {}
        };
      }, [userProfile]);

      function localDateKey(ts = Date.now()) {
        try {
          const d = new Date(ts);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        } catch (_) { return ''; }
      };

      function startOfWeekMs(ts = Date.now()) {
        try {
          const d = new Date(ts);
          const day = d.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          d.setHours(0,0,0,0);
          d.setDate(d.getDate() + diff);
          return d.getTime();
        } catch (_) { return ts; }
      };

      function startOfMonthMs(ts = Date.now()) {
        try {
          const d = new Date(ts);
          d.setHours(0,0,0,0);
          d.setDate(1);
          return d.getTime();
        } catch (_) { return ts; }
      };

      function formatDurationCompact(ms = 0) {
        const totalSec = Math.max(0, Math.round(Number(ms || 0) / 1000));
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
        if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
        return `${seconds}s`;
      };

      function formatDurationVerbose(ms = 0) {
        const totalMin = Math.max(0, Math.round(Number(ms || 0) / 60000));
        const hours = Math.floor(totalMin / 60);
        const minutes = totalMin % 60;
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes} Min.`;
        if (hours > 0) return `${hours}h`;
        return `${minutes} Min.`;
      };

      function getActiveWorkedMs(session, nowTs = Date.now()) {
        try {
          if (!session?.startedAt) return 0;
          const pauseMs = Number(session?.pausedAccumulatedMs || 0);
          const segmentPause = (session?.isPaused && session?.pauseStartedAt) ? Math.max(0, nowTs - Number(session.pauseStartedAt || nowTs)) : 0;
          return Math.max(0, nowTs - Number(session.startedAt || nowTs) - pauseMs - segmentPause);
        } catch (_) { return 0; }
      }


      function getWorkClockStorageKey(uid) {
        return `onyx_work_sessions_${uid}`;
      }

      function getDefaultWorkClockPresets() {
        return ['BÃ¼ro', 'Baustelle', 'Support'];
      }

      function normalizeWorkClockPresets(input) {
        try {
          const raw = Array.isArray(input)
            ? input
            : String(input || '').split(/[\n,;]+/g);
          const clean = raw
            .map(v => String(v || '').trim())
            .filter(Boolean)
            .filter((value, index, arr) => arr.findIndex(x => x.toLowerCase() === value.toLowerCase()) === index);
          return clean.length ? clean.slice(0, 24) : getDefaultWorkClockPresets();
        } catch (_) { return getDefaultWorkClockPresets(); }
      }

      function readWorkClockSessionsLocal(uid) {
        try {
          if (!uid) return [];
          const raw = localStorage.getItem(getWorkClockStorageKey(uid));
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) { return []; }
      }

      function writeWorkClockSessionsLocal(uid, sessions) {
        try {
          if (!uid) return;
          localStorage.setItem(getWorkClockStorageKey(uid), JSON.stringify(Array.isArray(sessions) ? sessions.slice(0, 240) : []));
        } catch (_) {}
      }

      function mergeWorkClockSessions(localRows = [], remoteRows = []) {
        try {
          const map = new Map();
          [...remoteRows, ...localRows].forEach((row) => {
            if (!row) return;
            const key = String(row.id || row.localId || `${row.startedAt || ''}_${row.endedAt || ''}_${row.title || ''}`);
            const prev = map.get(key) || {};
            map.set(key, { ...prev, ...row, id: row.id || prev.id || key, localId: row.localId || prev.localId || key });
          });
          return Array.from(map.values()).sort((a, b) => Number(b?.startedAt || 0) - Number(a?.startedAt || 0));
        } catch (_) { return Array.isArray(remoteRows) ? remoteRows : []; }
      }

      function saveWorkClockSessionLocal(uid, payload) {
        try {
          if (!uid || !payload) return payload;
          const localId = String(payload.localId || `wc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
          const nextRow = { ...payload, localId, id: payload.id || localId, savedLocally: true };
          const current = readWorkClockSessionsLocal(uid).filter(row => String(row.localId || row.id || '') !== localId);
          const merged = [nextRow, ...current].sort((a, b) => Number(b?.startedAt || 0) - Number(a?.startedAt || 0));
          writeWorkClockSessionsLocal(uid, merged);
          return nextRow;
        } catch (_) { return payload; }
      }

      function replaceWorkClockSessionLocal(uid, payload) {
        try {
          if (!uid || !payload) return payload;
          const matchId = String(payload.localId || payload.id || '');
          const current = readWorkClockSessionsLocal(uid);
          const updated = current.map(row => String(row.localId || row.id || '') === matchId ? { ...row, ...payload, id: row.id || payload.id || matchId, localId: row.localId || payload.localId || matchId } : row);
          writeWorkClockSessionsLocal(uid, updated);
          return updated.find(row => String(row.localId || row.id || '') === matchId) || payload;
        } catch (_) { return payload; }
      }

      function removeWorkClockSessionLocal(uid, sessionLike) {
        try {
          if (!uid || !sessionLike) return [];
          const matchIds = new Set([
            String(sessionLike?.localId || ''),
            String(sessionLike?.id || ''),
          ].filter(Boolean));
          const next = readWorkClockSessionsLocal(uid).filter(row => !matchIds.has(String(row.localId || '')) && !matchIds.has(String(row.id || '')));
          writeWorkClockSessionsLocal(uid, next);
          return next;
        } catch (_) { return readWorkClockSessionsLocal(uid); }
      }

      function formatDateTimeInputValue(ts) {
        try {
          if (!ts) return '';
          const d = new Date(Number(ts));
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (_) { return ''; }
      }

      function parseDateTimeInputValue(value) {
        try {
          const ts = new Date(value).getTime();
          return Number.isFinite(ts) ? ts : Date.now();
        } catch (_) { return Date.now(); }
      }

      function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
        try {
          const blob = new Blob([content], { type: mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1200);
        } catch (_) {}
      }

      const persistWorkClockActiveLocal = (payload) => {
        try {
          if (!user?.uid) return;
          const key = `onyx_work_clock_active_${user?.uid}`;
          if (payload) localStorage.setItem(key, JSON.stringify(payload));
          else localStorage.removeItem(key);
        } catch (_) {}
      };

      const saveWorkClockProfilePatch = async (patch) => {
        try {
          if (!user) return;
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), patch, { merge: true });
          setUserProfile(prev => ({ ...(prev || {}), ...patch }));
        } catch (_) {}
      };

      const startWorkClock = async () => {
        if (!user) return;
        const now = Date.now();
        const payload = {
          startedAt: now,
          pausedAccumulatedMs: 0,
          pauseStartedAt: null,
          isPaused: false,
          source: 'manual',
        };
        setWorkClockActive(payload);
        persistWorkClockActiveLocal(payload);
        await saveWorkClockProfilePatch({ workClockActive: payload, updatedAt: now });
        showToast('Stempelung gestartet');
      };

      const toggleWorkClockPause = async () => {
        if (!user || !workClockActive?.startedAt) return;
        const now = Date.now();
        let next = { ...(workClockActive || {}) };
        if (next.isPaused) {
          next.pausedAccumulatedMs = Number(next.pausedAccumulatedMs || 0) + Math.max(0, now - Number(next.pauseStartedAt || now));
          next.pauseStartedAt = null;
          next.isPaused = false;
          showToast('Arbeitszeit lÃ¤uft weiter');
        } else {
          next.isPaused = true;
          next.pauseStartedAt = now;
          showToast('Pause aktiviert');
        }
        setWorkClockActive(next);
        persistWorkClockActiveLocal(next);
        await saveWorkClockProfilePatch({ workClockActive: next, updatedAt: now });
      };

      const requestStopWorkClock = () => {
        if (!workClockActive?.startedAt) return;
        const presets = normalizeWorkClockPresets(userProfile?.workClockTaskOptions);
        setWorkClockDraftUsePreset(true);
        setWorkClockDraftTitle(String(userProfile?.workClockLastTitle || presets[0] || 'Arbeit'));
        setWorkClockDraftLevel('mittel');
        setWorkClockModalOpen(true);
      };

      const cancelWorkClock = async () => {
        setWorkClockActive(null);
        persistWorkClockActiveLocal(null);
        await saveWorkClockProfilePatch({ workClockActive: null, updatedAt: Date.now() });
        showToast('Stempelung verworfen');
      };

      const finishWorkClock = async () => {
        if (!user || !workClockActive?.startedAt) return;
        try {
          setWorkClockSaving(true);
          const now = Date.now();
          const workedMs = getActiveWorkedMs(workClockActive, now);
          const pauseMs = Number(workClockActive?.pausedAccumulatedMs || 0) + ((workClockActive?.isPaused && workClockActive?.pauseStartedAt) ? Math.max(0, now - Number(workClockActive.pauseStartedAt || now)) : 0);
          const finalTitle = String(workClockDraftTitle || '').trim() || 'Arbeit';
          const payload = {
            startedAt: Number(workClockActive.startedAt || now),
            endedAt: now,
            workMs: workedMs,
            pauseMs,
            totalMs: Math.max(0, now - Number(workClockActive.startedAt || now)),
            title: finalTitle,
            level: String(workClockDraftLevel || 'mittel'),
            dateKey: localDateKey(workClockActive.startedAt || now),
            createdAt: Date.now(),
            updatedAt: now,
          };
          const localRow = saveWorkClockSessionLocal(user?.uid, payload);
          setWorkClockSessions(prev => mergeWorkClockSessions([localRow], prev || []));
          try {
            const ref = await addDoc(collection(db, 'artifacts', APP_ID, 'users', user?.uid, 'workSessions'), { ...payload, createdAt: serverTimestamp() });
            const syncedRow = { ...localRow, id: ref.id, remoteSaved: true };
            const current = readWorkClockSessionsLocal(user?.uid).map(row => String(row.localId || row.id || '') === String(localRow.localId || localRow.id || '') ? syncedRow : row);
            writeWorkClockSessionsLocal(user?.uid, current);
            setWorkClockSessions(prev => mergeWorkClockSessions(current, prev || []));
          } catch (remoteErr) {
            console.warn('finishWorkClock remote save skipped', remoteErr);
          }
          setWorkClockActive(null);
          persistWorkClockActiveLocal(null);
          await saveWorkClockProfilePatch({ workClockActive: null, updatedAt: now, workClockLastTitle: finalTitle });
          setWorkClockModalOpen(false);
          showToast('Arbeitszeit gespeichert');
        } catch (err) {
          console.error('finishWorkClock failed', err);
          showToast('Speichern fehlgeschlagen');
        } finally {
          setWorkClockSaving(false);
        }
      };


      const openEditWorkClockSession = (session) => {
        if (!session) return;
        const presets = normalizeWorkClockPresets(userProfile?.workClockTaskOptions);
        const rawTitle = String(session?.title || 'Arbeit');
        const usePreset = presets.some(p => String(p).toLowerCase() === rawTitle.toLowerCase());
        setWorkClockEditingSession(session);
        setWorkClockEditUsePreset(usePreset);
        setWorkClockEditTitle(rawTitle || presets[0] || 'Arbeit');
        setWorkClockEditLevel(String(session?.level || 'mittel'));
        setWorkClockEditStartValue(formatDateTimeInputValue(session?.startedAt || Date.now()));
        setWorkClockEditEndValue(formatDateTimeInputValue(session?.endedAt || session?.startedAt || Date.now()));
        setWorkClockEditOpen(true);
      };

      const saveEditedWorkClockSession = async () => {
        if (!user?.uid || !workClockEditingSession) return;
        try {
          const nextTitle = String(workClockEditTitle || '').trim() || 'Arbeit';
          const nextStart = parseDateTimeInputValue(workClockEditStartValue);
          const nextEnd = parseDateTimeInputValue(workClockEditEndValue);
          if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd) || nextEnd <= nextStart) {
            showToast('Start und Ende prÃ¼fen');
            return;
          }
          const previousPauseMs = Math.max(0, Number(workClockEditingSession?.pauseMs || 0));
          const totalMs = Math.max(0, nextEnd - nextStart);
          const workMs = Math.max(0, totalMs - Math.min(previousPauseMs, totalMs));
          const patch = {
            ...workClockEditingSession,
            startedAt: nextStart,
            endedAt: nextEnd,
            totalMs,
            pauseMs: Math.min(previousPauseMs, totalMs),
            workMs,
            dateKey: localDateKey(nextStart),
            title: nextTitle,
            level: String(workClockEditLevel || 'mittel'),
            updatedAt: Date.now(),
          };
          const localRow = replaceWorkClockSessionLocal(user?.uid, patch);
          setWorkClockSessions(prev => mergeWorkClockSessions([localRow], (prev || []).filter(row => String(row.localId || row.id || '') !== String(localRow.localId || localRow.id || ''))));
          try {
            if (workClockEditingSession?.id && !String(workClockEditingSession.id).startsWith('wc_')) {
              await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user?.uid, 'workSessions', workClockEditingSession.id), {
                startedAt: nextStart,
                endedAt: nextEnd,
                totalMs,
                pauseMs: Math.min(previousPauseMs, totalMs),
                workMs,
                dateKey: localDateKey(nextStart),
                title: nextTitle,
                level: String(workClockEditLevel || 'mittel'),
                updatedAt: Date.now(),
              });
            }
          } catch (remoteErr) {
            console.warn('saveEditedWorkClockSession remote update skipped', remoteErr);
          }
          await saveWorkClockProfilePatch({ workClockLastTitle: nextTitle, updatedAt: Date.now() });
          setWorkClockEditOpen(false);
          setWorkClockEditingSession(null);
          showToast('Session aktualisiert');
        } catch (err) {
          console.error('saveEditedWorkClockSession failed', err);
          showToast('Aktualisieren fehlgeschlagen');
        }
      };

      const deleteWorkClockSession = async (session) => {
        if (!user?.uid || !session) return;
        const label = String(session?.title || 'Arbeit');
        if (!window.confirm(`Session â€ž${label}â€œ lÃ¶schen?`)) return;
        const deleteKey = String(session?.localId || session?.id || '');
        try {
          setWorkClockDeletingId(deleteKey);
          const nextLocal = removeWorkClockSessionLocal(user?.uid, session);
          setWorkClockSessions(nextLocal);
          try {
            if (session?.id && !String(session.id).startsWith('wc_')) {
              await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user?.uid, 'workSessions', session.id));
            }
          } catch (remoteErr) {
            console.warn('deleteWorkClockSession remote delete skipped', remoteErr);
          }
          showToast('Session gelÃ¶scht');
        } catch (err) {
          console.error('deleteWorkClockSession failed', err);
          showToast('LÃ¶schen fehlgeschlagen');
        } finally {
          setWorkClockDeletingId('');
        }
      };

      const exportWeekWorkClockCsv = () => {
        try {
          const rows = [...weekSessions].sort((a, b) => Number(a?.startedAt || 0) - Number(b?.startedAt || 0));
          if (!rows.length) {
            showToast('Keine Sessions fÃ¼r diese Woche');
            return;
          }
          const header = ['Datum','Start','Ende','Arbeit','Level','Arbeitszeit Minuten','Pausenzeit Minuten','Total Minuten'];
          const body = rows.map((s) => {
            const started = s?.startedAt ? new Date(Number(s.startedAt)) : null;
            const ended = s?.endedAt ? new Date(Number(s.endedAt)) : null;
            const date = started ? started.toLocaleDateString('de-CH') : '';
            const start = started ? started.toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' }) : '';
            const end = ended ? ended.toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' }) : '';
            return [date, start, end, String(s?.title || 'Arbeit'), String(s?.level || 'mittel'), Math.round(Number(s?.workMs || 0) / 60000), Math.round(Number(s?.pauseMs || 0) / 60000), Math.round(Number(s?.totalMs || 0) / 60000)];
          });
          body.push([]);
          body.push(['Summe','','','', '', Math.round(weekWorkMs / 60000), '', '']);
          const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('\"','\"\"')}"`).join(';')).join('\n');
          const stamp = new Date().toISOString().slice(0,10);
          downloadTextFile(`rapport-woche-${stamp}.csv`, csv, 'text/csv;charset=utf-8');
          showToast('Wochenrapport exportiert');
        } catch (err) {
          console.error('exportWeekWorkClockCsv failed', err);
          showToast('Export fehlgeschlagen');
        }
      };

      const exportMonthWorkClockCsv = () => {
        try {
          const rows = [...monthSessions].sort((a, b) => Number(a?.startedAt || 0) - Number(b?.startedAt || 0));
          if (!rows.length) {
            showToast('Keine Sessions fÃ¼r diesen Monat');
            return;
          }
          const header = ['Datum','Start','Ende','Arbeit','Level','Arbeitszeit Minuten','Pausenzeit Minuten','Total Minuten'];
          const body = rows.map((s) => {
            const started = s?.startedAt ? new Date(Number(s.startedAt)) : null;
            const ended = s?.endedAt ? new Date(Number(s.endedAt)) : null;
            const date = started ? started.toLocaleDateString('de-CH') : '';
            const start = started ? started.toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' }) : '';
            const end = ended ? ended.toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' }) : '';
            return [date, start, end, String(s?.title || 'Arbeit'), String(s?.level || 'mittel'), Math.round(Number(s?.workMs || 0) / 60000), Math.round(Number(s?.pauseMs || 0) / 60000), Math.round(Number(s?.totalMs || 0) / 60000)];
          });
          body.push([]);
          body.push(['Summe','','','', '', Math.round(monthWorkMs / 60000), Math.round(monthPauseMs / 60000), '']);
          const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"','""')}"`).join(';')).join('\n');
          const stamp = new Date().toISOString().slice(0,7);
          downloadTextFile(`rapport-monat-${stamp}.csv`, csv, 'text/csv;charset=utf-8');
          showToast('Monatsrapport exportiert');
        } catch (err) {
          console.error('exportMonthWorkClockCsv failed', err);
          showToast('Monatsrapport fehlgeschlagen');
        }
      };


      useEffect(() => {
        const t = setInterval(() => setWorkClockTick(Date.now()), 1000);
        return () => clearInterval(t);
      }, []);

      useEffect(() => {
        if (!user?.uid) return;
        try {
          const raw = localStorage.getItem(`onyx_work_clock_active_${user?.uid}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.startedAt) setWorkClockActive(parsed);
          }
        } catch (_) {}
      }, [user?.uid]);

      useEffect(() => {
        const presets = normalizeWorkClockPresets(userProfile?.workClockTaskOptions);
        setWorkClockPresetInput(presets.join('\n'));
        setWorkClockDraftUsePreset(true);
      }, [userProfile?.workClockTaskOptions]);

      useEffect(() => {
        const presets = normalizeWorkClockPresets(userProfile?.workClockTaskOptions);
        setWorkClockDraftTitle(String(userProfile?.workClockLastTitle || presets[0] || 'Arbeit'));
      }, [userProfile?.workClockLastTitle, userProfile?.workClockTaskOptions]);


      useEffect(() => {
        if (!user?.uid) return;
        const localRows = readWorkClockSessionsLocal(user?.uid);
        if (localRows.length) setWorkClockSessions(prev => mergeWorkClockSessions(localRows, prev || []));
        const ref = collection(db, 'artifacts', APP_ID, 'users', user?.uid, 'workSessions');
        const unsub = onSnapshot(query(ref, orderBy('startedAt', 'desc'), limit(120)), (snap) => {
          const remoteRows = [];
          snap.forEach((d) => remoteRows.push({ id: d.id, ...d.data(), remoteSaved: true }));
          const merged = mergeWorkClockSessions(readWorkClockSessionsLocal(user?.uid), remoteRows);
          setWorkClockSessions(merged);
          writeWorkClockSessionsLocal(user?.uid, merged);
        }, (err) => {
          console.warn('workSessions snapshot fallback to local', err);
          setWorkClockSessions(readWorkClockSessionsLocal(user?.uid));
        });
        return () => { try { unsub(); } catch (_) {} };
      }, [user?.uid]);

      function getShoppingStorageKey(uid) { return `onyx_shopping_lists_${uid || 'guest'}`; }
      function readShoppingListsLocal(uid) {
        try {
          if (!uid) return [];
          const raw = localStorage.getItem(getShoppingStorageKey(uid));
          return normalizeShoppingLists(raw ? JSON.parse(raw) : []);
        } catch (_) { return []; }
      }
      function writeShoppingListsLocal(uid, lists) {
        try { if (uid) localStorage.setItem(getShoppingStorageKey(uid), JSON.stringify(normalizeShoppingLists(lists).slice(0, 60))); } catch (_) {}
      }
      function calcShoppingListTotal(list, doneOnly = false) {
        try {
          const items = normalizeShoppingItems(list?.items);
          return items.reduce((sum, item) => {
            if (doneOnly && !item.done) return sum;
            const price = Number(String(item.price || '').replace(',', '.'));
            return sum + (Number.isFinite(price) ? price : 0);
          }, 0);
        } catch (_) { return 0; }
      }
      async function persistShoppingLists(nextLists) {
        if (!user?.uid) return;
        const normalized = normalizeShoppingLists(nextLists);
        writeShoppingListsLocal(user?.uid, normalized);
        setShoppingLists(normalized);
        setShoppingListsUpdatedAt(Date.now());
        try {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
            shoppingListsCloud: normalized,
            shoppingListsUpdatedAt: Date.now()
          }, { merge: true });
        } catch (err) {
          console.warn('shoppingLists sync fallback to local', err);
        }
      }
      const createShoppingList = async () => {
        const title = String(shoppingDraftTitle || '').trim() || 'Einkaufsliste';
        const store = String(shoppingDraftStore || '').trim();
        const row = { id: `shop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, title, store, createdAt: Date.now(), updatedAt: Date.now(), items: [] };
        setShoppingSaving(true);
        const next = normalizeShoppingLists([row, ...shoppingLists]);
        await persistShoppingLists(next);
        setActiveShoppingListId(row.id);
        setShoppingListModalOpen(false);
        setPlusMenuOpen(false);
        setShoppingDraftTitle('Neue Einkaufsliste');
        setShoppingDraftStore('');
        setCurrentView('shopping');
        setShoppingSaving(false);
      };
      const addShoppingItem = async (listId, label = '') => {
        const textValue = String(label || shoppingQuickItem || '').trim();
        if (!textValue) return;
        const next = normalizeShoppingLists(shoppingLists).map((list) => list.id === listId ? { ...list, updatedAt: Date.now(), items: [...normalizeShoppingItems(list.items), { id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: textValue, qty: '', price: '', done: false, checkedAt: 0 }] } : list);
        await persistShoppingLists(next);
        setShoppingQuickItem('');
      };
      const updateShoppingItem = async (listId, itemId, patch) => {
        const next = normalizeShoppingLists(shoppingLists).map((list) => list.id === listId ? { ...list, updatedAt: Date.now(), items: normalizeShoppingItems(list.items).map((item) => item.id === itemId ? { ...item, ...patch } : item) } : list);
        await persistShoppingLists(next);
      };
      const toggleShoppingItem = async (listId, itemId) => {
        const next = normalizeShoppingLists(shoppingLists).map((list) => list.id === listId ? { ...list, updatedAt: Date.now(), items: normalizeShoppingItems(list.items).map((item) => item.id === itemId ? { ...item, done: !item.done, checkedAt: !item.done ? Date.now() : 0 } : item) } : list);
        await persistShoppingLists(next);
      };
      const deleteShoppingItem = async (listId, itemId) => {
        const next = normalizeShoppingLists(shoppingLists).map((list) => list.id === listId ? { ...list, updatedAt: Date.now(), items: normalizeShoppingItems(list.items).filter((item) => item.id !== itemId) } : list);
        await persistShoppingLists(next);
      };
      const deleteShoppingList = async (listId) => {
        const next = normalizeShoppingLists(shoppingLists).filter((list) => list.id !== listId);
        await persistShoppingLists(next);
        setActiveShoppingListId((prev) => prev === listId ? (next[0]?.id || '') : prev);
      };

      useEffect(() => {
        if (!user?.uid) return;
        const localLists = readShoppingListsLocal(user?.uid);
        if (localLists.length) setShoppingLists(localLists);
      }, [user?.uid]);

      useEffect(() => {
        if (!user?.uid) return;
        const remoteTs = Number(userProfile?.shoppingListsUpdatedAt || 0);
        if (remoteTs >= Number(shoppingListsUpdatedAt || 0) && Array.isArray(userProfile?.shoppingListsCloud)) {
          const normalized = normalizeShoppingLists(userProfile?.shoppingListsCloud);
          setShoppingLists(normalized);
          writeShoppingListsLocal(user?.uid, normalized);
          if (!activeShoppingListId && normalized[0]?.id) setActiveShoppingListId(normalized[0].id);
        }
      }, [user?.uid, userProfile?.shoppingListsUpdatedAt, userProfile?.shoppingListsCloud]);

      useEffect(() => {
        if (activeShoppingListId) return;
        if (shoppingLists[0]?.id) setActiveShoppingListId(shoppingLists[0].id);
      }, [shoppingLists, activeShoppingListId]);

      function getHourlyIndexesForDay(dayStr) {
        try {
          if (!Array.isArray(hourlyForecast?.time)) return [];
          const key = String(dayStr || '').slice(0, 10);
          const idxs = [];
          for (let i = 0; i < hourlyForecast.time.length; i++) {
            if (String(hourlyForecast.time[i]).slice(0, 10) === key) idxs.push(i);
          }
          return idxs;
        } catch (_) { return []; }
      }

      function findFirstHourMatch(dayStr, predicate) {
        try {
          const idxs = getHourlyIndexesForDay(dayStr);
          for (const idx of idxs) {
            if (predicate(idx)) return idx;
          }
          return null;
        } catch (_) { return null; }
      }

      function formatHourLabel(timeStr) {
        try {
          return new Date(timeStr).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
        } catch (_) { return ''; }
      }

      function getWeatherAdviceForDay(dayIndex = 0) {
        try {
          const dayStr = dailyForecast?.time?.[dayIndex];
          if (!dayStr) return 'Wetterdaten werden geladenâ€¦';

          const maxTemp = Math.round(dailyForecast?.temperature_2m_max?.[dayIndex] ?? weather?.temperature ?? 0);
          const minTemp = Math.round(dailyForecast?.temperature_2m_min?.[dayIndex] ?? weather?.temperature ?? 0);
          const rainProb = Math.round(dailyForecast?.precipitation_probability_max?.[dayIndex] ?? 0);
          const rainSum = Number(dailyForecast?.precipitation_sum?.[dayIndex] ?? 0);
          const windMax = Math.round(dailyForecast?.windspeed_10m_max?.[dayIndex] ?? weather?.windspeed ?? 0);
          const dayCode = Number(dailyForecast?.weathercode?.[dayIndex] ?? weather?.weathercode ?? 0);

          const getPartOfDayLabel = (hour) => {
            if (hour >= 5 && hour < 11) return 'am Morgen';
            if (hour >= 11 && hour < 14) return 'Ã¼ber Mittag';
            if (hour >= 14 && hour < 18) return 'am Nachmittag';
            if (hour >= 18 && hour < 23) return 'am Abend';
            return 'in der Nacht';
          };

          const isMostlySunnyCode = (code) => [0, 1, 2].includes(Number(code ?? -1));
          const rainIntensityText = (prob) => {
            if (prob >= 85) return 'krÃ¤ftiger Regen';
            if (prob >= 70) return 'spÃ¼rbarer Regen';
            return 'leichter Regen';
          };
          const windText = (speed) => {
            if (speed >= 55) return 'stÃ¼rmisch';
            if (speed >= 40) return 'recht windig';
            if (speed >= 30) return 'spÃ¼rbar windig';
            return 'eher ruhig';
          };

          if (dayIndex === 0 && Array.isArray(hourlyForecast?.time)) {
            const now = new Date();
            const end = new Date(now.getTime() + (4 * 60 * 60 * 1000));
            const todayIdxs = getHourlyIndexesForDay(dayStr);
            const windowIdxs = todayIdxs.filter((idx) => {
              const ts = new Date(hourlyForecast?.time?.[idx] || 0).getTime();
              return Number.isFinite(ts) && ts >= (now.getTime() - 60 * 1000) && ts <= end.getTime();
            });

            if (windowIdxs.length > 0) {
              const firstIdx = windowIdxs[0];
              const lastIdx = windowIdxs[windowIdxs.length - 1];
              const untilLabel = formatHourLabel(hourlyForecast?.time?.[lastIdx]);
              const temps = windowIdxs.map((idx) => Number(hourlyForecast?.temperature_2m?.[idx] ?? weather?.temperature ?? 0));
              const probs = windowIdxs.map((idx) => Number(hourlyForecast?.precipitation_probability?.[idx] ?? 0));
              const codes = windowIdxs.map((idx) => Number(hourlyForecast?.weathercode?.[idx] ?? weather?.weathercode ?? 0));
              const winds = windowIdxs.map((idx) => Number(hourlyForecast?.windspeed_10m?.[idx] ?? weather?.windspeed ?? 0));
              const tempMin4h = Math.round(Math.min(...temps));
              const tempMax4h = Math.round(Math.max(...temps));
              const maxRain4h = Math.round(Math.max(...probs));
              const maxWind4h = Math.round(Math.max(...winds));
              const firstRainIdx4h = windowIdxs.find((idx) => Number(hourlyForecast?.precipitation_probability?.[idx] ?? 0) >= 45);
              const firstWindIdx4h = windowIdxs.find((idx) => Number(hourlyForecast?.windspeed_10m?.[idx] ?? weather?.windspeed ?? 0) >= 30);
              const mostlySunny = codes.filter((code) => isMostlySunnyCode(code)).length >= Math.ceil(windowIdxs.length * 0.6);
              const nowHour = now.getHours();
              const laterHour = new Date(hourlyForecast?.time?.[lastIdx] || now).getHours();
              const nowPhase = getPartOfDayLabel(nowHour);
              const laterPhase = getPartOfDayLabel(laterHour);

              if (firstRainIdx4h != null) {
                const rainProbAtStart = Math.round(Number(hourlyForecast?.precipitation_probability?.[firstRainIdx4h] ?? maxRain4h));
                const rainLabel = rainIntensityText(rainProbAtStart);
                const rainTimeLabel = formatHourLabel(hourlyForecast?.time?.[firstRainIdx4h]);
                const startsLater = firstRainIdx4h !== firstIdx;
                if (startsLater) {
                  return `Bis ${rainTimeLabel} bleibt es meist trocken, danach ist ${rainLabel} mÃ¶glich â€“ Regenschirm mitnehmen.`;
                }
                return `Ab jetzt bis ${untilLabel} ist ${rainLabel} mÃ¶glich â€“ Regenschirm sinnvoll.`;
              }

              if (firstWindIdx4h != null && maxWind4h >= 30) {
                const windTimeLabel = formatHourLabel(hourlyForecast?.time?.[firstWindIdx4h]);
                if (tempMin4h <= 11) {
                  return `Bis ${untilLabel} wird es ${windText(maxWind4h)} â€“ ab ${windTimeLabel} lieber mit Jacke raus.`;
                }
                return `Bis ${untilLabel} wird es ${windText(maxWind4h)} â€“ draussen kann es ab ${windTimeLabel} ungemÃ¼tlich werden.`;
              }

              if (tempMin4h <= 8 && tempMax4h <= 13) {
                return `${nowPhase} bleibt es bis ${untilLabel} frisch bei etwa ${tempMin4h}â€“${tempMax4h}Â° â€“ Jacke sinnvoll.`;
              }

              if (tempMin4h <= 10 && tempMax4h - tempMin4h >= 5) {
                return `${nowPhase} noch eher kÃ¼hl, bis ${untilLabel} wird es milder â€“ Jacke jetzt sinnvoll, ${laterPhase} eher weniger.`;
              }

              if (mostlySunny) {
                return `Bis ${untilLabel} bleibt es trocken mit etwas Sonnenschein â€“ aktuell keine Jacke und kein Schirm nÃ¶tig.`;
              }

              return `Bis ${untilLabel} bleibt es Ã¼berwiegend trocken bei ${tempMin4h}â€“${tempMax4h}Â° â€“ insgesamt ruhiges Wetter.`;
            }
          }

          const firstRainIdx = findFirstHourMatch(dayStr, (idx) => Number(hourlyForecast?.precipitation_probability?.[idx] ?? 0) >= 55);
          const firstStrongRainIdx = findFirstHourMatch(dayStr, (idx) => Number(hourlyForecast?.precipitation_probability?.[idx] ?? 0) >= 75);
          const firstCoolIdx = findFirstHourMatch(dayStr, (idx) => Number(hourlyForecast?.temperature_2m?.[idx] ?? 99) <= 12);
          const firstWarmIdx = findFirstHourMatch(dayStr, (idx) => Number(hourlyForecast?.temperature_2m?.[idx] ?? -99) >= 22);
          const morningIdx = findFirstHourMatch(dayStr, (idx) => {
            const h = new Date(hourlyForecast?.time?.[idx] || 0).getHours();
            return h >= 6 && h <= 10;
          });
          const afternoonIdx = findFirstHourMatch(dayStr, (idx) => {
            const h = new Date(hourlyForecast?.time?.[idx] || 0).getHours();
            return h >= 13 && h <= 17;
          });
          const morningTemp = morningIdx != null ? Math.round(hourlyForecast?.temperature_2m?.[morningIdx] ?? minTemp) : minTemp;
          const afternoonTemp = afternoonIdx != null ? Math.round(hourlyForecast?.temperature_2m?.[afternoonIdx] ?? maxTemp) : maxTemp;

          if (firstStrongRainIdx != null || rainProb >= 75 || rainSum >= 4) {
            const idx = firstStrongRainIdx != null ? firstStrongRainIdx : firstRainIdx;
            const when = idx != null ? ` â€“ ab ${formatHourLabel(hourlyForecast?.time?.[idx])} ist krÃ¤ftiger Regen mÃ¶glich.` : '.';
            return `Nimm einen Regenschirm mit${when}`;
          }

          if (firstRainIdx != null || rainProb >= 55 || rainSum >= 1.2) {
            const idx = firstRainIdx != null ? firstRainIdx : firstStrongRainIdx;
            const when = idx != null ? ` â€“ ab ${formatHourLabel(hourlyForecast?.time?.[idx])} steigt die Regenchance.` : '.';
            return `Leichte Regengefahr${when}`;
          }

          if (morningTemp >= 17 && afternoonTemp <= 12) {
            return `Am Morgen brauchst du eher keine Jacke, spÃ¤ter wird es kÃ¼hler.`;
          }

          if (morningTemp <= 11 && afternoonTemp >= 18) {
            return `Morgens frisch, am Nachmittag deutlich angenehmer.`;
          }

          if (firstCoolIdx != null && maxTemp - minTemp >= 6) {
            return `Zwiebellook lohnt sich â€“ ab ${formatHourLabel(hourlyForecast?.time?.[firstCoolIdx])} wird es spÃ¼rbar kÃ¼hler.`;
          }

          if (windMax >= 35) {
            return `Heute wird es ${windText(windMax)} â€“ draussen lieber etwas WÃ¤rmeres einplanen.`;
          }

          if (maxTemp >= 28) {
            return `Sehr warm heute â€“ Wasser mitnehmen und eher leichte Kleidung tragen.`;
          }

          if (minTemp <= 5) {
            return `KÃ¼hler Start in den Tag â€“ Jacke am Morgen sinnvoll.`;
          }

          if ([0,1].includes(dayCode) && maxTemp >= 20 && firstWarmIdx != null) {
            return `Freundliches Wetter â€“ ab ${formatHourLabel(hourlyForecast?.time?.[firstWarmIdx])} wird es angenehm mild.`;
          }

          return `Heute zwischen ${minTemp}Â° und ${maxTemp}Â° â€“ insgesamt eher ruhiges Wetter.`;
        } catch (_) {
          return 'Wetterdaten werden geladenâ€¦';
        }
      }

      const todayWeatherAdvice = getWeatherAdviceForDay(0);

      function getWeatherBadgeMeta() {
        try {
          const advice = String(todayWeatherAdvice || '').trim();
          const lower = advice.toLowerCase();
          const hourMatch = advice.match(/(?:ab|bis)\s(\d{1,2}:\d{2})/i);
          const timeLabel = hourMatch ? hourMatch[1] : null;
          if (lower.includes('regen') || lower.includes('schirm')) {
            return {
              icon: 'â˜”',
              tone: 'border-amber-700/50 bg-amber-950/30 text-amber-200',
              text: timeLabel ? (lower.includes('bis') ? `Trocken bis ${timeLabel}` : `Regen ab ${timeLabel}`) : 'Regenschirm sinnvoll'
            };
          }
          if (lower.includes('windig') || lower.includes('stÃ¼rmisch')) {
            return {
              icon: 'ðŸŒ¬ï¸',
              tone: 'border-neutral-700 bg-slate-950/40 text-slate-200',
              text: timeLabel ? `Windig bis ${timeLabel}` : 'Windiger Abschnitt'
            };
          }
          if (lower.includes('jacke') || lower.includes('kÃ¼hl') || lower.includes('frisch')) {
            return {
              icon: 'ðŸ§¥',
              tone: 'border-sky-800/50 bg-sky-950/30 text-sky-200',
              text: timeLabel ? `Jacke bis ${timeLabel}` : 'Jacke sinnvoll'
            };
          }
          if (lower.includes('milder') || lower.includes('angenehm')) {
            return {
              icon: 'ðŸŒ“',
              tone: 'border-emerald-800/50 bg-emerald-950/30 text-emerald-200',
              text: timeLabel ? `SpÃ¤ter milder bis ${timeLabel}` : 'SpÃ¤ter angenehmer'
            };
          }
          return {
            icon: 'â˜€ï¸',
            tone: 'border-emerald-800/50 bg-emerald-950/30 text-emerald-200',
            text: timeLabel ? `Trocken bis ${timeLabel}` : 'Ruhiges Wetter'
          };
        } catch (_) {
          return { icon: 'â˜€ï¸', tone: 'border-neutral-800 bg-neutral-950 text-neutral-200', text: 'Ruhiges Wetter' };
        }
      };

      const fetchWeather = async () => {
        try {
          // Open-Meteo: add richer daily details + hourly for nicer UI
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
            `&current_weather=true` +
            `&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m` +
            `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,windspeed_10m_max,sunrise,sunset` +
            `&timezone=auto`
          );
          const data = await res.json();
          setWeather(data.current_weather);
          setDailyForecast(data.daily);
          setHourlyForecast(data.hourly);
        } catch (error) {}
      };

      useEffect(() => {
        if (isLoggedIn) fetchWeather();
      }, [location, isLoggedIn]);

      useEffect(() => {
        // reset expanded forecast when location changes
        setSelectedForecastDay(null);
      }, [location?.lat, location?.lon]);

      const showToast = (message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
      };


      // --- IN-APP CHAT PING (SOUND / VIBRATION) ---
      useEffect(() => { try { userProfileRef.current = userProfile; } catch(_) {} }, [userProfile]);
      useEffect(() => { try { activeChatIdRef.current = activeChat?.id || null; } catch(_) {} }, [activeChat]);
      useEffect(() => { try { currentViewRef.current = currentView; } catch(_) {} }, [currentView]);

      const ensureAudioContext = () => {
        try {
          if (typeof window === 'undefined') return null;
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          if (!audioCtxRef.current) audioCtxRef.current = new AC();
          return audioCtxRef.current;
        } catch (_) { return null; }
      };

      const pingInApp = (opts = {}) => {
        try {
          const sound = (opts.sound !== false);
          const vibrate = (opts.vibrate !== false);

          if (vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate([35, 45, 35]); } catch (_) {}
          }

          if (!sound) return;

          const ctx = ensureAudioContext();
          if (!ctx) return;
          // Autoplay policy: context may be suspended until first user interaction
          if (ctx.state === 'suspended') {
            // resume best-effort
            try { ctx.resume(); } catch (_) {}
          }

          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.15);
        } catch (_) {}
      };

      // Ensure audio context can play after first interaction
      useEffect(() => {
        const resume = () => {
          try {
            const ctx = ensureAudioContext();
            if (ctx && ctx.state === 'suspended') ctx.resume();
          } catch (_) {}
        };
        try {
          window.addEventListener('pointerdown', resume, { passive: true });
          window.addEventListener('touchstart', resume, { passive: true });
          window.addEventListener('keydown', resume, { passive: true });
        } catch (_) {}
        return () => {
          try {
            window.removeEventListener('pointerdown', resume);
            window.removeEventListener('touchstart', resume);
            window.removeEventListener('keydown', resume);
          } catch (_) {}
        };
      }, []);

      // Reliable live notifications for new messages while the app is running.
      // This prevents the "toast only" situation when server push is unavailable.
      useEffect(() => {
        try {
          if (!user) return;
          const prof = userProfileRef.current || userProfile || {};
          const enableSound = !(prof.inAppChatSound === false);
          const enableVibe = !(prof.inAppChatVibrate === false);
          const canNotify = (('Notification' in window) && Notification.permission === 'granted');
          if (!enableSound && !enableVibe && !canNotify) return;
          if (!Array.isArray(myChats) || myChats.length === 0) return;
          if (document.visibilityState !== 'visible') return;

          for (const c of myChats) {
            const updatedAt = (c && typeof c.updatedAt === 'number') ? c.updatedAt : 0;
            if (!updatedAt) continue;
            if (c.lastMessageSenderId === user?.uid) {
              // keep watermark up to date
              const prev = lastChatPingRef.current[c.id] || 0;
              if (updatedAt > prev) lastChatPingRef.current[c.id] = updatedAt;
              continue;
            }
            const prev = lastChatPingRef.current[c.id] || 0;
            if (updatedAt <= prev) continue;

            // don't ping if currently inside this chat
            const isOpen = (currentViewRef.current === 'secret_chat') && (activeChatIdRef.current === c.id);
            if (isOpen) {
              lastChatPingRef.current[c.id] = updatedAt;
              continue;
            }

            // muted?
            const muted = Array.isArray(prof.mutedChatIds) ? prof.mutedChatIds : [];
            if (muted.includes(c.id)) {
              lastChatPingRef.current[c.id] = updatedAt;
              continue;
            }

            lastChatPingRef.current[c.id] = updatedAt;

            // 1) Optional in-app ping (sound/vibration)
            if (enableSound || enableVibe) pingInApp({ sound: enableSound, vibrate: enableVibe });

            // 2) System notification (real OS notification)
            try {
              if (canNotify) {
                const key = `onyx_last_notify_chat_${c.id}`;
                const lastNotified = parseInt(localStorage.getItem(key) || '0', 10) || 0;
                if (updatedAt > lastNotified) {
                  const isGroup = c.type === 'group';
                  let senderName = 'Jemand';
                  try {
                    const sid = String(c.lastMessageSenderId || '');
                    if (sid && sid !== user?.uid) {
                      const sp = getProfile(sid);
                      senderName = (sp && (sp.displayName || sp.username)) ? (sp.displayName || sp.username) : (c.displayNames && c.displayNames[sid] ? String(c.displayNames[sid]) : 'Jemand');
                    }
                  } catch (_) {}
                  // Privacy: Secret chat stays secret -> no OS notification here
                  // In-app sound/vibration above remains optional.
                  localStorage.setItem(key, String(updatedAt));
                }
              }
            } catch (_) {}
          }
        } catch (_) {}
      }, [myChats, user, userProfile, currentView, activeChat]);


// --- PWA-only: Service Worker + Install Prompt ---
const promptInstallPwa = async () => {
  try {
    if (!deferredInstallPrompt) {
      showToast(isIosUA ? 'iPhone/iPad: Teilen â†’ â€žZum Home-Bildschirmâ€œ installieren.' : 'Installation ist gerade nicht verfÃ¼gbar.');
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
    setCanInstallPwa(false);
    if (choice && choice.outcome === 'accepted') showToast('Installiert âœ…');
    else showToast('Installation abgebrochen');
  } catch (e) {
    showToast('Installation nicht mÃ¶glich');
  }
};

const registerPushServiceWorker = async () => {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      setPushDiag(prev => ({ ...prev, sw: 'unsupported', controlling: false }));
      return null;
    }
    const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
    const swUrl = `${base}firebase-messaging-sw.js?v=36`;
    const reg = await navigator.serviceWorker.register(swUrl, { scope: base });
    let readyReg = null;
    try { readyReg = await navigator.serviceWorker.ready; } catch (_) {}
    const controlling = !!navigator.serviceWorker.controller;
    setPushDiag(prev => ({ ...prev, sw: 'registered', controlling, lastError: '' }));
    return readyReg || reg;
  } catch (e) {
    setPushDiag(prev => ({ ...prev, sw: 'error', controlling: !!navigator.serviceWorker?.controller, lastError: (e?.message || String(e)) }));
    return null;
  }
}

useEffect(() => {
  const computeStandalone = () => {
    try {
      const m = (window.matchMedia && window.matchMedia('(display-mode: standalone)'));
      const dm = !!(m && m.matches);
      const ios = !!(window.navigator && window.navigator.standalone);
      return dm || ios;
    } catch (_) { return false; }
  };

  // 1) Track standalone state (PWA)
  setIsStandalone(computeStandalone());

  // 2) Register SW for caching + background push (no permission prompt here)
  (async () => {
    try { await registerPushServiceWorker(); } catch (_) {}
  })();

  // 3) Install prompt
  const onBip = (e) => {
    try {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setCanInstallPwa(true);
    } catch (_) {}
  };
  window.addEventListener('beforeinstallprompt', onBip);

  const onInstalled = () => {
    setDeferredInstallPrompt(null);
    setCanInstallPwa(false);
    setIsStandalone(true);
  };
  window.addEventListener('appinstalled', onInstalled);

  // 4) Display-mode changes
  const mql = (window.matchMedia) ? window.matchMedia('(display-mode: standalone)') : null;
  const onMql = () => setIsStandalone(computeStandalone());
  if (mql) {
    if (mql.addEventListener) mql.addEventListener('change', onMql);
    else if (mql.addListener) mql.addListener(onMql);
  }

  return () => {
    window.removeEventListener('beforeinstallprompt', onBip);
    window.removeEventListener('appinstalled', onInstalled);
    if (mql) {
      if (mql.removeEventListener) mql.removeEventListener('change', onMql);
      else if (mql.removeListener) mql.removeListener(onMql);
    }
  };
}, []);

useEffect(() => {
  if (!user) return;
  let refreshTimer = null;
  const refreshToken = async () => {
    try { await ensureWebPushToken(user, { forcePrompt: false }); } catch (e) { console.warn('[FCM] Token refresh failed:', e?.message); }
  };
  refreshToken();
  refreshTimer = setInterval(refreshToken, 60 * 60 * 1000);
  const onVisibilityChange = () => { if (document.visibilityState === 'visible') refreshToken(); };
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => { if (refreshTimer) clearInterval(refreshTimer); document.removeEventListener('visibilitychange', onVisibilityChange); };
}, [user]);

useEffect(() => {
  if (!('serviceWorker' in navigator)) return;
  const checkForUpdate = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (_) {}
  };
  checkForUpdate();
  const timer = setInterval(checkForUpdate, 30 * 60 * 1000);
  return () => clearInterval(timer);
}, []);

// Diagnostics: receive a ping from the Service Worker when a push arrives
useEffect(() => {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMsg = (evt) => {
      try {
        const d = evt?.data || {};
        if (d.type !== 'PUSH_RECEIVED') return;
        setPushDiag((prev) => ({
          ...prev,
          lastReceivedAt: typeof d.at === 'number' ? d.at : Date.now(),
          lastReceivedTitle: String(d.title || '')
        }));
      } catch (_) {}
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => {
      try { navigator.serviceWorker.removeEventListener('message', onMsg); } catch (_) {}
    };
  } catch (_) {}
}, []);


      const showSystemNotification = async (title, body, tag = 'onyx') => {
        try {
          if (typeof window === 'undefined') return;
          if (!('Notification' in window)) return;
          if (Notification.permission !== 'granted') return;

          const silentMode = (userProfile && String(userProfile?.notificationSoundMode||'system') === 'silent');

          const options = {
            icon: './icon-192.png',
            badge: './badge-icon.png',
            tag,
            renotify: true,
            silent: silentMode,
            ...(silentMode ? {} : { vibrate: [200, 100, 200, 100, 300] })
          };

          // body === null means: do not show any body text (privacy mode)
          if (body !== null && body !== undefined) {
            const finalBody = (body && String(body).trim().length > 0) ? `${body}
Kalender aktuell` : 'Kalender aktuell';
            options.body = finalBody;
          }

          if ('serviceWorker' in navigator) {
            const reg = (await registerPushServiceWorker()) || (await navigator.serviceWorker.getRegistration());
            if (reg && reg.showNotification) {
              await reg.showNotification(title, options);
              return;
            }
          }

          // Fallback (falls kein SW verfÃ¼gbar ist)
          // eslint-disable-next-line no-new
          new Notification(title, options);
        } catch (e) {}
      };

      const sendLocalPushTest = async () => {
        try {
          const canNotify = ('Notification' in window) && Notification.permission === 'granted';
          if (!canNotify) {
            showToast('Keine Berechtigung fÃ¼r Benachrichtigungen');
            return;
          }
          await showSystemNotification('ðŸ”” Onyx Test', 'Wenn du das siehst: OS-Notification funktioniert âœ…', 'onyx_test_local');
        } catch (e) {
          showToast('Test fehlgeschlagen');
        }
      };

      const sendServerPushTest = async () => {
        try {
          if (!user) return;
          const id = `${user?.uid}_${Date.now()}`;
          setPushTest({ id, status: 'pending', lastError: '', updatedAt: Date.now() });
          await setDoc(
            doc(db, 'artifacts', APP_ID, 'public', 'data', 'pushTests', id),
            {
              uid: user?.uid,
              createdAt: serverTimestamp(),
              createdAtMs: Date.now(),
              status: 'pending',
              platform: 'web',
              ua: String((typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '').slice(0, 220)
            },
            { merge: true }
          );
          showToast('Server-Test ausgelÃ¶st (oxynoti)');
        } catch (e) {
          showToast('Server-Test fehlgeschlagen');
        }
      };

      // Live status for last server test (sent/error)
      useEffect(() => {
        try {
          if (!user) return;
          if (!pushTest?.id) return;
          const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'pushTests', pushTest.id);
          const unsub = onSnapshot(ref, (snap) => {
            try {
              if (!snap.exists()) return;
              const d = snap.data() || {};
              const status = String(d.status || '').toLowerCase();
              const lastError = d.lastError ? String(d.lastError) : '';
              const updatedAt = typeof d.updatedAt === 'number' ? d.updatedAt : Date.now();
              setPushTest((prev) => ({ ...prev, status, lastError, updatedAt }));
              if (status === 'error' && lastError) {
                setPushDiag((p) => ({ ...p, lastError: `SERVER_TEST: ${lastError}` }));
              }
              if (status === 'sent') {
                // Let SW handle the visible notification; this toast is just feedback.
                showToast('Server-Test gesendet âœ…');
              }
            } catch (_) {}
          });
          return () => { try { unsub(); } catch (_) {} };
        } catch (_) {}
      }, [pushTest?.id, user]);

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
      case 'auth/invalid-email': setAuthError('UngÃ¼ltige E-Mail-Adresse.'); break;
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password': setAuthError('E-Mail oder Passwort falsch.'); break;
      case 'auth/weak-password': setAuthError('Passwort min. 6 Zeichen.'); break;
      case 'auth/operation-not-allowed': setAuthError('Email/Passwort Login ist in Firebase Auth deaktiviert. Bitte in Firebase â†’ Authentication â†’ Sign-in method aktivieren.'); break;
      case 'auth/unauthorized-domain': setAuthError('Domain nicht autorisiert. In Firebase Auth â†’ Settings â†’ Authorized domains muss tejari49.github.io erlaubt sein.'); break;
      case 'auth/network-request-failed': setAuthError('Netzwerkfehler. Bitte Internet prÃ¼fen.'); break;
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

      // Alle Events kombiniert fÃ¼r die Ansicht
      const allEvents = [
        ...events, 
        ...Object.values(sharedEventsMap).flat()
      ].filter(e => visibleCalendars.includes(e.calendarId));

// Aktuelles Event im Modal aus der neuesten allEvents Liste (fÃ¼r Live Poll/Kommentare)
const modalEvent = eventToEdit
  ? (allEvents.find(e => e.id === eventToEdit.id && (e.calendarId || 'default') === (eventToEdit.calendarId || 'default')) || eventToEdit)
  : null;


// Auto-finalize abgelaufene Abstimmungen (clientseitig, sobald jemand mit Schreibrecht die App Ã¶ffnet)
useEffect(() => {
  if (!user) return;

  const now = Date.now();
  const list = (allEvents || []).filter(ev => ev && ev.poll && ev.poll.status === 'open');
  let did = 0;

  (async () => {
    for (const ev of list) {
      if (did >= 3) break; // safety cap
      const poll = ev.poll || {};
      const ver = Number(poll.version || 1);
      const calId = ev.calendarId || 'default';
      if (ver < 2) continue;
      if (!poll.autoFinalizeAtDeadline) continue;
      if (!poll.deadlineAt || now < poll.deadlineAt) continue;
      if (poll.autoFinalized) continue;
      if (!canWriteCalendar(calId)) continue;

      const key = `${calId}::${ev.id}`;
      if (autoFinalizedPollsRef.current[key]) continue;
      autoFinalizedPollsRef.current[key] = true;

      try {
        await runTransaction(db, async (tx) => {
          const ref = eventDocRefFor(calId, ev.id);
          const snap = await tx.get(ref);
          if (!snap.exists()) return;
          const data = snap.data() || {};
          const p = data.poll || null;
          if (!p || p.status !== 'open') return;
          if (Number(p.version || 1) < 2) return;
          if (!p.autoFinalizeAtDeadline) return;
          if (!p.deadlineAt || Date.now() < p.deadlineAt) return;
          if (p.autoFinalized) return;

          const voterIds = Array.isArray(p.voterIds) ? p.voterIds : computePollVoterIdsForEvent({ ...ev, ...data });
          const tally = computePollTally(p, voterIds);
          const winnerId = tally.winnerOptionId;
          const winner = (Array.isArray(p.options) ? p.options : []).find(o => o.id === winnerId);
          if (!winner) return;

          tx.update(ref, {
            date: winner.date,
            time: winner.time,
            updatedAt: Date.now(),
            'poll.status': 'closed',
            'poll.winnerOptionId': winnerId,
            'poll.closedAt': Date.now(),
            'poll.closedBy': user?.uid,
            'poll.autoFinalized': true
          });
        });
        did += 1;
      } catch (_) {
        // ignore
      }
    }
  })();
}, [user?.uid, events, sharedEventsMap, customCalendars]);


      function getCalendarById(id) {
         if (id === 'default') return { id: 'default', name: 'Privat', type: 'normal', ownerId: user?.uid };
         return customCalendars.find(c => c.id === id);
      }

      const calendarTint = (calId) => {
        try {
          if (!calId || calId === 'default') {
            return (userProfile && typeof userProfile?.defaultCalendarColor === 'string' && userProfile?.defaultCalendarColor) ? userProfile?.defaultCalendarColor : '#FFFFFF';
          }
          const cal = (customCalendars || []).find(c => c && c.id === calId);
          if (cal && typeof cal.color === 'string' && cal.color) return cal.color;
          const idx = stableHash(String(calId)) % PASTEL_COLORS.length;
          return PASTEL_COLORS[idx] || '#FFFFFF';
        } catch (e) {
          return '#FFFFFF';
        }
      };

      const toggleCalendarVisibility = (id) => {
         setVisibleCalendars(prev => {
           const has = prev.includes(id);
           if (has) {
             const next = prev.filter(cId => cId !== id);
             if (next.length === 0) {
               try { showToast('Mindestens 1 Kalender sichtbar lassen'); } catch (_) {}
               return prev;
             }
             return next;
           }
           return [...prev, id];
         });
      };

      // --- WIEDERHOLUNGEN (Recurrence) ---
      function pad2(n) { return String(n).padStart(2, '0'); }
      function formatDateStr(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
      function parseDateStr(s) {
        const parts = String(s || '').split('-');
        const y = parseInt(parts[0] || '1970', 10);
        const m = parseInt(parts[1] || '1', 10);
        const dd = parseInt(parts[2] || '1', 10);
        return new Date(y, (m || 1) - 1, dd || 1);
      }

      // --- NATÃœRLICHE SPRACHE: Parse Text -> Event Felder ---
      const toIsoDate = (d) => {
        try {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dd}`;
        } catch (_) {
          return new Date().toISOString().split('T')[0];
        }
      };

      const nextDowFrom = (base, targetDowMon0) => {
        const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        const baseDowMon0 = (b.getDay() + 6) % 7;
        let diff = (targetDowMon0 - baseDowMon0 + 7) % 7;
        // gleiche Woche zulassen (diff=0)
        b.setDate(b.getDate() + diff);
        return b;
      };

      const parseNaturalEventText = (raw, referenceDateStr) => {
        const input = String(raw || '').trim();
        if (!input) return null;

        let s = input.replace(/\s+/g, ' ').trim();
        const base = (() => {
          try {
            if (referenceDateStr) {
              const d = parseDateStr(referenceDateStr);
              if (!isNaN(d.getTime())) return d;
            }
          } catch (_) {}
          return new Date();
        })();

        let dateStr = '';
        let timeStr = '';
        let location = '';
        let durationMinutes = null;

        // 1) Dauer (z.B. 45min, 1h, 1.5h, 2std)
        const durMatch = s.match(/\b\d+(?:[.,]\d+)?\s*(?:h|std|stunden|m|min|mins|minute|minutes)\b/i);
        if (durMatch) {
          const token = durMatch[0];
          const num = (token.match(/\d+(?:[.,]\d+)?/) || [null])[0];
          const unit = token.toLowerCase();
          if (num) {
            const n = parseFloat(num.replace(',', '.'));
            if (!isNaN(n)) {
              const isHours = unit.includes('h') || unit.includes('std') || unit.includes('stund');
              durationMinutes = Math.round(isHours ? n * 60 : n);
            }
          }
          s = s.replace(token, ' ').replace(/\s+/g, ' ').trim();
        }

        // 2) Zeit (z.B. 14:30 oder 1430)
        const t1 = s.match(/\b(\d{1,2})[:.](\d{2})\b/);
        const t2 = !t1 ? s.match(/\b(\d{1,2})(\d{2})\b/) : null;
        if (t1) {
          const hh = parseInt(t1[1], 10);
          const mm = parseInt(t1[2], 10);
          if (!isNaN(hh) && !isNaN(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
            timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
            s = s.replace(t1[0], ' ').replace(/\s+/g, ' ').trim();
          }
        } else if (t2) {
          const hh = parseInt(t2[1], 10);
          const mm = parseInt(t2[2], 10);
          if (!isNaN(hh) && !isNaN(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
            timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
            s = s.replace(t2[0], ' ').replace(/\s+/g, ' ').trim();
          }
        }

        // 3) Datum (heute/morgen/Ã¼bermorgen, ISO, DD.MM)
        const lower = s.toLowerCase();
        if (lower.includes('Ã¼bermorgen')) {
          const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
          d.setDate(d.getDate() + 2);
          dateStr = toIsoDate(d);
          s = s.replace(/Ã¼bermorgen/i, ' ').replace(/\s+/g, ' ').trim();
        } else if (lower.includes('morgen')) {
          const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
          d.setDate(d.getDate() + 1);
          dateStr = toIsoDate(d);
          s = s.replace(/morgen/i, ' ').replace(/\s+/g, ' ').trim();
        } else if (lower.includes('heute')) {
          dateStr = toIsoDate(base);
          s = s.replace(/heute/i, ' ').replace(/\s+/g, ' ').trim();
        }

        // Explizites Datum: YYYY-MM-DD
        const isoM = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
        if (!dateStr && isoM) {
          const y = parseInt(isoM[1], 10);
          const m = parseInt(isoM[2], 10);
          const d = parseInt(isoM[3], 10);
          if (y && m && d) {
            dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            s = s.replace(isoM[0], ' ').replace(/\s+/g, ' ').trim();
          }
        }

        // Explizites Datum: DD.MM(.YYYY)
        const dmM = !dateStr ? s.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/) : null;
        if (!dateStr && dmM) {
          const dd = parseInt(dmM[1], 10);
          const mm = parseInt(dmM[2], 10);
          let yy = dmM[3] ? parseInt(dmM[3], 10) : base.getFullYear();
          if (yy < 100) yy = 2000 + yy;
          if (dd && mm && yy) {
            const candidate = new Date(yy, mm - 1, dd);
            // falls ohne Jahr und in der Vergangenheit: nÃ¤chstes Jahr
            if (!dmM[3]) {
              const base0 = new Date(base.getFullYear(), base.getMonth(), base.getDate());
              if (candidate.getTime() < base0.getTime() - 3600000) {
                candidate.setFullYear(candidate.getFullYear() + 1);
              }
            }
            dateStr = toIsoDate(candidate);
            s = s.replace(dmM[0], ' ').replace(/\s+/g, ' ').trim();
          }
        }

        // Wochentag (mo..so)
        if (!dateStr) {
          const dowMap = {
            mo: 0, montag: 0,
            di: 1, dienstag: 1,
            mi: 2, mittwoch: 2,
            do: 3, donnerstag: 3,
            fr: 4, freitag: 4,
            sa: 5, samstag: 5,
            so: 6, sonntag: 6
          };
          const dowM = s.toLowerCase().match(/\b(mo|montag|di|dienstag|mi|mittwoch|do|donnerstag|fr|freitag|sa|samstag|so|sonntag)\b/);
          if (dowM) {
            const key = dowM[1];
            const target = dowMap[key];
            const d = nextDowFrom(base, target);
            dateStr = toIsoDate(d);
            s = s.replace(new RegExp('\b' + key + '\b', 'i'), ' ').replace(/\s+/g, ' ').trim();
          }
        }

        // 4) Ort (bei / im / in)
        const locM = s.match(/\b(bei|im|in)\s+([^,]+)$/i);
        if (locM) {
          location = String(locM[2] || '').trim();
          s = s.replace(locM[0], ' ').replace(/\s+/g, ' ').trim();
        }

        // Rest -> Titel
        let title = s.replace(/[\r\n]+/g, ' ').trim();
        title = title.replace(/^[-,.:]+\s*/, '').trim();
        title = title.replace(/\s*[-,.:]+\s*$/, '').trim();
        if (!title) title = 'Termin';

        return {
          title,
          date: dateStr || '',
          time: timeStr || '',
          location: location || '',
          durationMinutes: (durationMinutes === null || typeof durationMinutes === 'undefined') ? null : durationMinutes
        };
      };

      const updateQuickEventText = (val) => {
        try {
          setQuickEventText(val);
          const parsed = parseNaturalEventText(val, selectedDateForEvent || eventForm.date);
          setQuickEventPreview(parsed);
        } catch (_) {
          setQuickEventText(val);
          setQuickEventPreview(null);
        }
      };

      const applyQuickEventToForm = () => {
        const parsed = quickEventPreview || parseNaturalEventText(quickEventText, selectedDateForEvent || eventForm.date);
        if (!parsed) return showToast('Nicht erkannt');
        setEventForm(prev => ({
          ...prev,
          title: parsed.title || prev.title,
          date: parsed.date || prev.date,
          time: (typeof parsed.time === 'string' && parsed.time) ? parsed.time : prev.time,
          location: (typeof parsed.location === 'string' && parsed.location) ? parsed.location : prev.location,
          durationMinutes: (parsed.durationMinutes !== null && typeof parsed.durationMinutes !== 'undefined') ? parsed.durationMinutes : prev.durationMinutes,
        }));
        showToast('Ãœbernommen');
      };

      function addDaysStr(s, days) {
        const d = parseDateStr(s);
        d.setDate(d.getDate() + days);
        return formatDateStr(d);
      }
      function daysBetween(a, b) { return Math.floor((parseDateStr(b) - parseDateStr(a)) / 86400000); }
      function monthsBetween(a, b) {
        const da = parseDateStr(a);
        const db = parseDateStr(b);
        return (db.getFullYear() * 12 + db.getMonth()) - (da.getFullYear() * 12 + da.getMonth());
      }
      function weekdayIndexMon0(s) {
        const js = parseDateStr(s).getDay(); // So=0..Sa=6
        return (js + 6) % 7; // Mo=0..So=6
      }

      function buildRecurrenceFromForm(form) {
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

      function eventOccursOn(ev, dateStr) {
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
      }

      function getEffectiveOccurrence(ev, dateStr) {
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
      }

      function getEventsForDate(dateStr) {
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
      }

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

      // Same hashing as oxynoti server (FNV-1a 32-bit) => enables notification tag dedupe
      const fnv1a32 = (str) => {
        let h = 0x811c9dc5;
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0);
      };

      function parseDateTimeLocalMs(dateStr, timeStr) {
        try {
          if (!dateStr || !timeStr) return null;
          const [y, m, d] = String(dateStr).split('-').map(n => parseInt(n, 10));
          const [hh, mm] = String(timeStr).split(':').map(n => parseInt(n, 10));
          if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return null;
          return new Date(y, (m - 1), d, hh, mm, 0, 0).getTime();
        } catch (e) {
          return null;
        }
      }

      const effectiveReminderMinutes = (occ) => {
        try {
          const mode = (occ && typeof occ.reminderMode === 'string') ? occ.reminderMode : 'default';
          if (mode === 'none') return null;
          if (mode === 'custom') {
            const m = (typeof occ.reminderMinutes === 'number') ? occ.reminderMinutes : parseInt(occ.reminderMinutes || 0, 10);
            if (isNaN(m)) return null;
            return Math.max(0, m);
          }
          const def = (userProfile && typeof userProfile?.defaultReminderMinutes === 'number') ? userProfile?.defaultReminderMinutes : null;
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
            const occId = occ.id || `${baseId}__${occ.date || ''}`;
            const occDate = occ._occurrenceDate || occ.date || '';
            const rid = `${baseId}__${occDate}__${startMs}__${mins}`;
            idx.push({
              rid,
              dueMs,
              startMs,
              mins,
              title: occ.title || 'Termin',
              time: occ.time || '',
              calendarId: occ.calendarId || 'default',
              occDate,
              baseId,
              occId
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
          const body = `${item.title}${item.time ? ' â€¢ ' + item.time : ''} â€¢ ${calName}`;

          // In-App Hinweis immer
          showToast(`â° ${body}`);

          // System Notification falls erlaubt
          try {
            // Wichtig: oft existiert zwar ein Web-Token, aber der Server-Worker (oxynoti)
            // ist nicht aktiv oder sendet nicht an Web. Daher IMMER lokal als Fallback.
            // Tag ist kompatibel mit oxynoti (dedupe Ã¼ber `tag`).
            const canNotify = ('Notification' in window) && Notification.permission === 'granted';
            if (canNotify) {
              const dedupeKey = `${user?.uid || 'uid'}:${item.occId || item.baseId || item.rid}:${item.mins ?? ''}:${item.dueMs}`;
              const tag = `onyx_event_${fnv1a32(dedupeKey)}`;
              await showSystemNotification('Erinnerung', body, tag);
            }
          } catch (_) {}

          try { if (navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch (_) {}
        } catch (e) {}
      };

      // Index rebuild on relevant changes
      useEffect(() => {
        if (!user) return;
        buildRemindersIndex();
      }, [user, events, sharedEventsMap, visibleCalendars, userProfile && userProfile?.defaultReminderMinutes]);

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

      useEffect(() => {
        if (currentView !== 'secret_chat') return;
        const panicOnHide = (userProfile?.secretPanicOnHide !== false);
        if (!panicOnHide) return;
        const onSecretVisibility = () => {
          if (Date.now() < (secretPanicBypassUntilRef.current || 0)) return;
          if (document.visibilityState === 'hidden') hideSecretChatNow('Secret Chat automatisch versteckt');
        };
        document.addEventListener('visibilitychange', onSecretVisibility);
        return () => document.removeEventListener('visibilitychange', onSecretVisibility);
      }, [currentView, userProfile?.secretPanicOnHide]);


      // --- NEU: PINSEL & LANGES DRÃœCKEN LOGIK ---
      const handleDayContextMenu = (e, dateStr) => {
         e.preventDefault();
         const activeCal = getCalendarById(activeCalendarId);
         if (!activeCal || activeCal.type !== 'shift') return;
         if (activeCal.id !== 'default' && activeCal.ownerId !== user?.uid && activeCal.sharedWith?.[user?.uid] !== 'write') {
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
        if (activeCal.ownerId !== user?.uid && activeCal.sharedWith?.[user?.uid] !== 'write') {
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

      // RegulÃ¤rer Klick auf Tag
      const handleDayClick = async (dateStr) => {
         if (isLongPressAction.current) { isLongPressAction.current = false; return; }
         
         const activeCal = getCalendarById(activeCalendarId);
         if (!activeCal) return;

         if (activeCal.id !== 'default' && activeCal.ownerId !== user?.uid && activeCal.sharedWith?.[user?.uid] !== 'write') {
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

      
      const hydrateEventFormFromBaseEvent = (baseEvent, occDate) => {
         if (!baseEvent) return;
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
           location: (typeof effective.location === 'string') ? effective.location : ((typeof baseEvent.location === 'string') ? baseEvent.location : ''),
           durationMinutes: (typeof effective.durationMinutes === 'number' || typeof effective.durationMinutes === 'string') ? effective.durationMinutes : ((typeof baseEvent.durationMinutes === 'number' || typeof baseEvent.durationMinutes === 'string') ? baseEvent.durationMinutes : ''),
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
      };

const openEditEventModal = (event, occurrenceDate = null, opts = {}) => {
         const baseEvent = (event && event._baseEvent) ? event._baseEvent : event;
         if (!baseEvent) return;
         const occDate = occurrenceDate || (event && event._occurrenceDate) || baseEvent.date;

         if (baseEvent.type === 'shift') return;

         setEventToEdit(baseEvent);
         setSelectedDateForEvent(occDate);

         const calId = baseEvent.calendarId || 'default';
         const canEdit = canWriteCalendar(calId);
         setEventCanEdit(!!canEdit);
         setEventModalMode('view');

         hydrateEventFormFromBaseEvent(baseEvent, occDate);
         try { setQuickEventText(''); setQuickEventPreview(null); } catch(_) {}

         const openComments = !!(opts && opts.openComments);
         const openPoll = !!(opts && opts.openPoll);
         setShowEventComments(openComments);
         setShowEventPoll(openPoll);
         setCreatePollOnSave(false);
         setEventComments([]);
         setNewCommentText('');
         initPollDraftFromEvent(baseEvent);
         setIsModalOpen(true);
      };

      const enterEventEditMode = () => {
         if (!eventToEdit) return;
         if (!eventCanEdit) return showToast("Nur Lesezugriff.");
         setEventModalMode('edit');
      };

      const backToEventViewMode = () => {
         if (!eventToEdit) return;
         const occDate = selectedDateForEvent || eventToEdit.date;
         hydrateEventFormFromBaseEvent(eventToEdit, occDate);
         setEventModalMode('view');
      };

      // --- KALENDER EINSTELLUNGEN LOGIK ---
      const saveCalendarSettings = async (e) => {
         e.preventDefault();
         try {
             if (calForm.id) {
                 await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calForm.id), {
                     name: calForm.name, type: calForm.type, color: (calForm.color || ''), shifts: calForm.shifts
                 });
                 await writeAudit({ calId: calForm.id, action: 'calendar.update', targetType: 'calendar', targetId: calForm.id, summary: `Kalender aktualisiert: ${calForm.name}` });
                 showToast("Kalender aktualisiert");
             } else {
                 const newRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'calendars'), {
                     name: calForm.name, type: calForm.type, color: (calForm.color || ''), shifts: calForm.shifts, ownerId: user?.uid, sharedWith: {}
                 });
                 await writeAudit({ calId: newRef?.id || 'default', action: 'calendar.create', targetType: 'calendar', targetId: newRef?.id || '', summary: `Kalender erstellt: ${calForm.name}` });
                 showToast("Kalender erstellt");
             }
             setIsCalManageModalOpen(false);
         } catch(err) { showToast("Fehler beim Speichern des Kalenders"); }
      };

      const deleteCalendar = async (calId) => {
         if(!confirm("Kalender wirklich lÃ¶schen? Alle Termine gehen verloren.")) return;
         try {
             await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', calId));
             await writeAudit({ calId, action: 'calendar.delete', targetType: 'calendar', targetId: calId, summary: `Kalender gelÃ¶scht: ${getCalendarById(calId)?.name || calId}` });
             if (activeCalendarId === calId) setActiveCalendarId('default');
             showToast("Kalender gelÃ¶scht");
         } catch(e) { showToast("Fehler beim LÃ¶schen"); }
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
          // Kalender-Freunde werden Ã¼ber E-Mail hinzugefÃ¼gt (nicht Ã¼ber Username)
          const targetProfile = await findProfileByEmailLower(email);
          if(!targetProfile) return showToast("Nutzer nicht gefunden (E-Mail prÃ¼fen)");
          if(targetProfile.id === user?.uid) return showToast("Das bist du selbst.");


          try {
             await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'calendars', shareCalData.id), {
                 [`sharedWith.${targetProfile.id}`]: sharePerm
             });
             await writeAudit({ calId: shareCalData.id, action: 'calendar.share', targetType: 'calendar', targetId: shareCalData.id, summary: `Kalender geteilt (${sharePerm}): ${shareCalData.name} â†’ ${targetProfile.email || targetProfile.username || shortId(targetProfile.id,6)}`, details: { targetUid: targetProfile.id, perm: sharePerm } });
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
             await writeAudit({ calId, action: 'calendar.unshare', targetType: 'calendar', targetId: calId, summary: `Freigabe entfernt: ${cal?.name || calId} â†’ ${getProfile(targetUid)?.username || shortId(targetUid,6)}`, details: { targetUid } });
             setShareCalData(prev => prev && prev.id === calId ? { ...prev, sharedWith: newShared } : prev);
             showToast("Freigabe entfernt");
          } catch(err) {}
      };

      // --- PUBLIC SHARE LINKS (busy-only / expiry / passcode / magic-link) ---
      const makeShareUrl = (token, key = '') => {
        const base = `${window.location.origin}${BASE_PATH}#/share/${token}`;
        if (key) return `${base}?k=${encodeURIComponent(key)}`;
        return base;
      };

      const getEventsListForCalendar = (calId) => {
        if (calId === 'default') return Array.isArray(events) ? events : [];
        return Array.isArray(sharedEventsMap?.[calId]) ? sharedEventsMap[calId] : [];
      };

      const getOccurrencesInRangeForList = (eventsList, startStr, endStr) => {
        const list = Array.isArray(eventsList) ? eventsList : [];
        const out = [];
        let d = startStr;
        let guard = 0;
        while (d <= endStr && guard < 400) {
          for (const ev of list) {
            if (!ev) continue;
            if (eventOccursOn(ev, d)) out.push(getEffectiveOccurrence(ev, d));
          }
          d = addDaysStr(d, 1);
          guard++;
        }
        out.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
        return out;
      };

      const parseTimeRange = (timeStr) => {
        const t = String(timeStr || '').trim();
        if (!t) return { start: '', end: '' };
        if (t.includes('-')) {
          const [a, b] = t.split('-').map(x => x.trim());
          return { start: a, end: b || '' };
        }
        return { start: t, end: '' };
      };

      const computeBusyBlocksForCalendar = (calId, days = 30) => {
        const startStr = new Date().toISOString().split('T')[0];
        const endStr = addDaysStr(startStr, Math.max(1, parseInt(days || 30, 10) || 30));
        const list = getEventsListForCalendar(calId);
        const occs = getOccurrencesInRangeForList(list, startStr, endStr);
        const blocks = [];
        for (const occ of occs) {
          const dateStr = occ?.date;
          if (!dateStr) continue;
          const tr = parseTimeRange(occ?.time);
          const startMs = parseDateTimeLocalMs(dateStr, tr.start || '00:00');
          if (!startMs) continue;
          let endMs = null;
          if (tr.end) {
            endMs = parseDateTimeLocalMs(dateStr, tr.end);
          }
          if (!endMs) {
            const dur = (typeof occ?.durationMinutes === 'number') ? occ.durationMinutes : parseInt(occ?.durationMinutes || 0, 10);
            const dm = (Number.isFinite(dur) && dur > 0) ? dur : 60;
            endMs = startMs + dm * 60 * 1000;
          }
          if (endMs <= startMs) endMs = startMs + 60 * 60 * 1000;
          blocks.push({ startMs, endMs });
        }
        // Merge overlapping blocks
        blocks.sort((a, b) => a.startMs - b.startMs);
        const merged = [];
        for (const b of blocks) {
          const last = merged.length ? merged[merged.length - 1] : null;
          if (!last || b.startMs > last.endMs) merged.push({ ...b });
          else last.endMs = Math.max(last.endMs, b.endMs);
        }
        return { startStr, endStr, busyBlocks: merged };
      };

      const openShareLinkModalForCalendar = (cal) => {
        const calId = cal?.id || 'default';
        const calName = calId === 'default' ? 'Privat' : (cal?.name || 'Kalender');
        setShareLinkCreated(null);
        setShareLinkDraft(prev => ({
          ...prev,
          kind: 'calendar',
          calId,
          calName,
          eventId: null,
          eventSnapshot: null,
          mode: 'busy',
          protection: 'magic',
          passcode: '',
          expiresInDays: 7,
          noExpiry: false,
        }));
        setIsShareLinkModalOpen(true);
      };

      const openShareLinkModalForEvent = (evSnapshot, calId) => {
        const cid = calId || evSnapshot?.calendarId || 'default';
        setShareLinkCreated(null);
        setShareLinkDraft(prev => ({
          ...prev,
          kind: 'event',
          calId: cid,
          calName: getCalendarById(cid)?.name || (cid === 'default' ? 'Privat' : cid),
          eventId: evSnapshot?.eventId || evSnapshot?.id || null,
          eventSnapshot: {
            title: String(evSnapshot?.title || ''),
            date: String(evSnapshot?.date || ''),
            time: String(evSnapshot?.time || ''),
            location: String(evSnapshot?.location || ''),
            durationMinutes: (evSnapshot?.durationMinutes ?? null),
            desc: String(evSnapshot?.desc || ''),
          },
          mode: 'full',
          protection: 'magic',
          passcode: '',
          expiresInDays: 7,
          noExpiry: false,
        }));
        setIsShareLinkModalOpen(true);
      };

      const revokeShareLink = async (token) => {
        if (!token) return;
        try {
          const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'shares', token);
          await updateDoc(ref, { revokedAtMs: Date.now() });
          await writeAudit({ calId: shareLinkDraft?.calId || 'default', action: 'share.revoke', targetType: 'share', targetId: token, summary: `Link widerrufen: ${token}` });
          showToast('Link widerrufen');
        } catch (e) {
          console.warn('revokeShareLink failed', e);
          showToast('Fehler');
        }
      };

      const createShareLink = async () => {
        if (!user) return;
        const d = shareLinkDraft || {};
        const token = randomToken(18);

        // Expiry
        let expiresAtMs = null;
        if (!d.noExpiry) {
          const days = Math.max(1, parseInt(d.expiresInDays || 7, 10) || 7);
          expiresAtMs = Date.now() + days * 24 * 60 * 60 * 1000;
        }

        // Protection
        let passcodeSalt = null;
        let passcodeHash = null;
        let magicKey = '';
        let magicHash = null;
        if (d.protection === 'passcode') {
          const pc = String(d.passcode || '').trim();
          if (pc.length < 4) return showToast('Passcode min. 4 Zeichen');
          passcodeSalt = randomToken(8);
          passcodeHash = await sha256Hex(`${passcodeSalt}|${pc}`);
        } else if (d.protection === 'magic') {
          // Magic-Link = nur der zufÃ¤llige Token (keine zusÃ¤tzliche Eingabe)
          magicKey = '';
          magicHash = null;
        }

        const base = {
          kind: d.kind,
          mode: d.mode,
          calId: d.calId,
          calName: d.calName,
          createdByUid: user?.uid,
          createdAt: serverTimestamp(),
          createdAtMs: Date.now(),
          expiresAtMs: expiresAtMs || null,
          revokedAtMs: null,
          passcodeSalt: passcodeSalt || null,
          passcodeHash: passcodeHash || null,
          magicHash: magicHash || null,
          isMagicLink: d.protection === 'magic',
        };

        let payload = { ...base };
        if (d.kind === 'calendar') {
          const { startStr, endStr, busyBlocks } = computeBusyBlocksForCalendar(d.calId, 30);
          payload = {
            ...payload,
            rangeStart: startStr,
            rangeEnd: endStr,
            busyBlocks,
          };
        } else {
          payload = {
            ...payload,
            eventId: d.eventId || null,
            eventSnapshot: d.eventSnapshot || null,
          };
        }

        try {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'shares', token), payload);
          const url = makeShareUrl(token, magicKey);
          setShareLinkCreated({ url, token });
          try { await navigator.clipboard?.writeText(url); } catch (_) {}

          await writeAudit({
            calId: d.calId || 'default',
            action: 'share.create',
            targetType: 'share',
            targetId: token,
            summary: d.kind === 'calendar' ? `Public Link erstellt (Busy-only): ${d.calName}` : `Public Link erstellt (Event): ${(d.eventSnapshot?.title || '')}`,
            details: { kind: d.kind, mode: d.mode, protection: d.protection, expiresAtMs: expiresAtMs || null },
          });

          showToast('Link erstellt (kopiert)');
        } catch (e) {
          console.warn('createShareLink failed', e);
          showToast('Fehler beim Erstellen');
        }
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

      const decodeImageFromBlob = async (blob) => {
        if (!blob) throw new Error('NO_BLOB');

        // Prefer createImageBitmap (better decoding coverage/performance)
        if (typeof createImageBitmap === 'function') {
          try {
            const bmp = await createImageBitmap(blob);
            return {
              obj: bmp,
              w: bmp.width,
              h: bmp.height,
              cleanup: () => { try { bmp.close && bmp.close(); } catch (_) {} }
            };
          } catch (_) {}
        }

        // Fallback: HTMLImageElement via object URL
        const url = URL.createObjectURL(blob);
        try {
          const img = new Image();
          img.decoding = 'async';
          img.src = url;
          if (img.decode) {
            await img.decode();
          } else {
            await new Promise((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error('IMAGE_DECODE_ERROR'));
            });
          }
          const w = img.naturalWidth || img.width || 0;
          const h = img.naturalHeight || img.height || 0;
          if (!w || !h) throw new Error('BAD_DIMENSIONS');
          return {
            obj: img,
            w,
            h,
            cleanup: () => { try { URL.revokeObjectURL(url); } catch (_) {} }
          };
        } catch (e) {
          try { URL.revokeObjectURL(url); } catch (_) {}
          throw e;
        }
      };

      const compressImageFileToDataUrl = async (file, { maxDim = 1600, quality = 0.72 } = {}) => {
        const blob = file;
        const decoded = await decodeImageFromBlob(blob);
        try {
          const w = decoded.w || 0;
          const h = decoded.h || 0;
          if (!w || !h) throw new Error('BAD_DIMENSIONS');

          const scale = Math.min(1, maxDim / Math.max(w, h));
          const nw = Math.max(1, Math.round(w * scale));
          const nh = Math.max(1, Math.round(h * scale));

          const canvas = document.createElement('canvas');
          canvas.width = nw;
          canvas.height = nh;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(decoded.obj, 0, 0, nw, nh);

          // Strict conversion: always return an encoded WebP/JPEG dataURL (no raw/original passthrough).
          try {
            const webp = canvas.toDataURL('image/webp', quality);
            if (webp && webp.startsWith('data:image/webp')) return webp;
          } catch (_) {}
          return canvas.toDataURL('image/jpeg', quality);
        } finally {
          try { decoded.cleanup && decoded.cleanup(); } catch (_) {}
        }
      };

      const compressAvatarFileToDataUrl = async (file, { size = 256, quality = 0.82 } = {}) => {
        const decoded = await decodeImageFromBlob(file);
        try {
          const w = decoded.w || 0;
          const h = decoded.h || 0;
          if (!w || !h) throw new Error('BAD_DIMENSIONS');

          const minDim = Math.min(w, h);
          const sx = Math.max(0, Math.round((w - minDim) / 2));
          const sy = Math.max(0, Math.round((h - minDim) / 2));

          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(decoded.obj, sx, sy, minDim, minDim, 0, 0, size, size);
          return canvas.toDataURL('image/jpeg', quality);
        } finally {
          try { decoded.cleanup && decoded.cleanup(); } catch (_) {}
        }
      };
      const handleAvatarUpload = async (e) => {
        const file0 = e?.target?.files && e.target.files[0];
        if (!file0) return;
        try { e.target.value = ''; } catch (_) {}

        if (!isProbablyImageFile(file0)) {
          showToast('Nur Bilder unterstÃ¼tzt');
          return;
        }

        try {
          const file = await ensureJpegBlobIfHeic(file0);
          const thumb = await compressAvatarFileToDataUrl(file, { size: 256, quality: 0.86 });
          const full = await compressImageFileToDataUrl(file, { maxDim: 1200, quality: 0.78 });
          if (user) {
            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
              avatarBase64: thumb,
              avatarThumbBase64: thumb,
              avatarFullBase64: full
            }, { merge: true });
            showToast('Avatar geÃ¤ndert');
          }
        } catch (err) {
          console.warn('avatar compress/upload failed', err);
          showToast('Fehler bei Avatar');
        }
      };

      function getProfile(uid) { return (Array.isArray(allProfiles) ? allProfiles : []).find(p => p && p.id === uid) || null; }
      function getUserDisplayLabel(uid) {
        const p = getProfile(uid);
        return p?.displayName || p?.username || p?.email || shortId(uid, 6);
      }
      function isBlockedByUser(uid) {
        try {
          const p = getProfile(uid);
          const blocked = Array.isArray(p?.blockedUsers) ? p.blockedUsers : [];
          return blocked.includes(user?.uid);
        } catch (_) { return false; }
      }

      function normalizeChatId(raw) { return String(raw || '').replace(/\D/g, '').slice(0, 5); }

      async function findProfileByFriendCode(code5) {
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
          // Fallback: alte Profile hatten friendCode evtl. als Number â†’ suche Ã¼ber local allProfiles
          const local = (allProfiles || []).find(p => String(p.friendCode || '').padStart(5, '0') === code);
          return local || null;
        } catch (e) {
          console.warn('findProfileByFriendCode failed', e);
          const local = (allProfiles || []).find(p => String(p.friendCode || '').padStart(5, '0') === code);
          return local || null;
        }
      };

      async function findProfileByEmailLower(emailRaw) {
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

      const sendFriendRequest = async (targetUid) => {
        if (!user?.uid || !targetUid) return;
        if (targetUid === user?.uid) return;
        if (blockedUserIds.includes(targetUid)) return showToast('Kontakt ist blockiert');
        if (isBlockedByUser(targetUid)) return showToast('Du kannst diesem Kontakt keine Anfrage senden');
        try {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
            friendRequestsSent: arrayUnion(targetUid),
            friendRequestsIncoming: arrayRemove(targetUid),
            updatedAt: Date.now()
          }, { merge: true });
          try { await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', targetUid), {
            friendRequestsIncoming: arrayUnion(user?.uid),
            friendRequestsSent: arrayRemove(user?.uid),
            updatedAt: Date.now()
          }, { merge: true }); } catch (_) {}
          showToast('Freundesanfrage gesendet');
        } catch (e) {
          console.warn('sendFriendRequest failed', e);
          showToast('Anfrage fehlgeschlagen');
        }
      };

      const cancelFriendRequest = async (targetUid) => {
        if (!user?.uid || !targetUid) return;
        try {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
            friendRequestsSent: arrayRemove(targetUid),
            updatedAt: Date.now()
          }, { merge: true });
          try { await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', targetUid), {
            friendRequestsIncoming: arrayRemove(user?.uid),
            updatedAt: Date.now()
          }, { merge: true }); } catch (_) {}
          showToast('Anfrage zurückgezogen');
        } catch (e) {
          console.warn('cancelFriendRequest failed', e);
          showToast('Fehler');
        }
      };

      const acceptFriendRequest = async (targetUid) => {
        if (!user?.uid || !targetUid) return;
        try {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
            friends: arrayUnion(targetUid),
            friendRequestsIncoming: arrayRemove(targetUid),
            friendRequestsSent: arrayRemove(targetUid),
            blockedUsers: arrayRemove(targetUid),
            updatedAt: Date.now()
          }, { merge: true });
          try { await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', targetUid), {
            friends: arrayUnion(user?.uid),
            friendRequestsIncoming: arrayRemove(user?.uid),
            friendRequestsSent: arrayRemove(user?.uid),
            blockedUsers: arrayRemove(user?.uid),
            updatedAt: Date.now()
          }, { merge: true }); } catch (_) {}
          await writeAudit({ calId: 'default', action: 'friend.accept', targetType: 'friend', targetId: targetUid, summary: `Freund akzeptiert: ${getUserDisplayLabel(targetUid)}` });
          showToast('Freund hinzugefügt');
        } catch (e) {
          console.warn('acceptFriendRequest failed', e);
          showToast('Fehler');
        }
      };

      const rejectFriendRequest = async (targetUid) => {
        if (!user?.uid || !targetUid) return;
        try {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
            friendRequestsIncoming: arrayRemove(targetUid),
            updatedAt: Date.now()
          }, { merge: true });
          try { await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', targetUid), {
            friendRequestsSent: arrayRemove(user?.uid),
            updatedAt: Date.now()
          }, { merge: true }); } catch (_) {}
          showToast('Anfrage abgelehnt');
        } catch (e) {
          console.warn('rejectFriendRequest failed', e);
          showToast('Fehler');
        }
      };

      const blockUser = async (targetUid) => {
        if (!user?.uid || !targetUid) return;
        try {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
            blockedUsers: arrayUnion(targetUid),
            friends: arrayRemove(targetUid),
            friendRequestsIncoming: arrayRemove(targetUid),
            friendRequestsSent: arrayRemove(targetUid),
            updatedAt: Date.now()
          }, { merge: true });
          try { await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', targetUid), {
            friends: arrayRemove(user?.uid),
            friendRequestsIncoming: arrayRemove(user?.uid),
            friendRequestsSent: arrayRemove(user?.uid),
            updatedAt: Date.now()
          }, { merge: true }); } catch (_) {}
          showToast('Kontakt blockiert');
        } catch (e) {
          console.warn('blockUser failed', e);
          showToast('Fehler');
        }
      };

      const unblockUser = async (targetUid) => {
        if (!user?.uid || !targetUid) return;
        try {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
            blockedUsers: arrayRemove(targetUid),
            updatedAt: Date.now()
          }, { merge: true });
          showToast('Blockierung aufgehoben');
        } catch (e) {
          console.warn('unblockUser failed', e);
          showToast('Fehler');
        }
      };

      const startChatWithProfile = async (profileOrId) => {
        if (!user) return;
        const targetUserId = (typeof profileOrId === 'string') ? profileOrId : (profileOrId && profileOrId.id);
        const targetProfile = (typeof profileOrId === 'object' && profileOrId) ? profileOrId : (targetUserId ? getProfile(targetUserId) : null);
        if (!targetUserId) return;
        if (targetUserId === user?.uid) return showToast('Das bist du selbst');
        if (blockedUserIds.includes(targetUserId)) return showToast('Kontakt ist blockiert');
        if (isBlockedByUser(targetUserId)) return showToast('Dieser Kontakt hat dich blockiert');

        const existingChat = myChats.find(c => Array.isArray(c.participants) && c.participants.length === 2 && c.participants.includes(targetUserId));
        if (existingChat) {
          // Track as friend (so user can manage/remove later)
          try {
            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { friends: arrayUnion(targetUserId) }, { merge: true });
            await writeAudit({ calId: 'default', action: 'friend.add', targetType: 'friend', targetId: targetUserId, summary: `Freund hinzugefÃ¼gt: ${targetProfile?.displayName || targetProfile?.username || targetProfile?.email || shortId(targetUserId,6)}` });
          } catch (_) {}
          setActiveChat(existingChat);
          setChatSearchQuery('');
          setSecretView('chat');
          return;
        }

        try {
          const meName = (userProfile?.displayName || userProfile?.username || (user?.email ? user?.email.split('@')[0] : 'Ich'));
          const otherName = (targetProfile?.displayName || targetProfile?.username || targetProfile?.email || 'Kontakt');
          const displayNames = { [user?.uid]: meName, [targetUserId]: otherName };

          const newChat = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats'), {
            type: 'dm',
            participants: [user?.uid, targetUserId],
            displayNames,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastMessageSenderId: user?.uid,
            typing: {},
            typingAt: {},
            lastRead: { [user?.uid]: Date.now() }
          });

          // Save to friends
          try {
            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { friends: arrayUnion(targetUserId) }, { merge: true });
            await writeAudit({ calId: 'default', action: 'friend.add', targetType: 'friend', targetId: targetUserId, summary: `Freund hinzugefÃ¼gt: ${otherName}` });
          } catch (_) {}

          setActiveChat({ id: newChat.id, type: 'dm', participants: [user?.uid, targetUserId], displayNames, updatedAt: Date.now(), lastMessageSenderId: user?.uid });
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
        const members = Array.from(new Set([user?.uid, ...(groupDraftMembers || [])])).filter(Boolean);
        if (members.length < 3) return showToast('WÃ¤hle mindestens 2 Mitglieder aus');
        try {
          const newChat = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats'), {
            type: 'group', title, participants: members, admins: [user?.uid], createdAt: Date.now(), updatedAt: Date.now(), lastMessageSenderId: user?.uid,
            typing: {}, typingAt: {}, lastRead: { [user?.uid]: Date.now() }
          });
          const chatObj = { id: newChat.id, type: 'group', title, participants: members, admins: [user?.uid], createdAt: Date.now(), updatedAt: Date.now(), lastMessageSenderId: user?.uid };
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

      const removeFriend = async (friendUid) => {
        if (!user || !friendUid) return;
        try {
          // hide existing DM chat (optional UX)
          const dm = myChats.find(c => Array.isArray(c.participants) && c.participants.length === 2 && c.participants.includes(friendUid));
          const updates = {
            friends: arrayRemove(friendUid),
            friendRequestsIncoming: arrayRemove(friendUid),
            friendRequestsSent: arrayRemove(friendUid),
            updatedAt: Date.now()
          };
          if (dm && dm.id) updates.hiddenChats = arrayUnion(dm.id);
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), updates, { merge: true });
          try { await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', friendUid), {
            friends: arrayRemove(user?.uid),
            friendRequestsIncoming: arrayRemove(user?.uid),
            friendRequestsSent: arrayRemove(user?.uid),
            updatedAt: Date.now()
          }, { merge: true }); } catch (_) {}
          await writeAudit({ calId: 'default', action: 'friend.remove', targetType: 'friend', targetId: friendUid, summary: `Freund entfernt: ${getProfile(friendUid)?.displayName || getProfile(friendUid)?.username || shortId(friendUid,6)}` });
          showToast('Freund entfernt');
        } catch (e) {
          console.warn('removeFriend failed', e);
          showToast('Fehler');
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
          showToast('Mitglied hinzugefÃ¼gt');
        } catch(e) { showToast('Fehler'); }
      };

      const removeMemberFromGroup = async (chat, memberId) => {
        if (!user || !chat || !memberId) return;
        try {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', chat.id), { participants: arrayRemove(memberId), admins: arrayRemove(memberId), updatedAt: Date.now() });
          if (memberId === user?.uid) {
            setShowPartnerStats(false);
            setActiveChat(null);
            setSecretView('list');
          }
          showToast('Mitglied entfernt');
        } catch(e) { showToast('Fehler'); }
      };

      const leaveGroup = async (chat) => removeMemberFromGroup(chat, user?.uid);

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
          const current = (userProfile && Array.isArray(userProfile?.pinnedChats)) ? userProfile?.pinnedChats : [];
          const next = current.includes(chatId) ? current.filter(id => id !== chatId) : [chatId, ...current];
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { pinnedChats: next });
        } catch (e) {
          showToast("Fehler beim Pinnen");
        }
      };

      const toggleMuteChat = async (chatId) => {
        if (!user) return;
        try {
          const muted = (userProfile && Array.isArray(userProfile?.mutedChatIds)) ? userProfile?.mutedChatIds : [];
          const isMuted = muted.includes(chatId);
          const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid);
          await updateDoc(profileRef, { mutedChatIds: isMuted ? arrayRemove(chatId) : arrayUnion(chatId) });
          showToast(isMuted ? 'Stumm aus' : 'Chat stumm');
        } catch (e) {
          showToast('Fehler beim Stummschalten');
        }
      };


      const startRecording = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            }
          });
          const recorderCfg = getSupportedAudioRecorderConfig();
          const recorderOpts = {};
          if (recorderCfg.mimeType) recorderOpts.mimeType = recorderCfg.mimeType;
          if (recorderCfg.audioBitsPerSecond) recorderOpts.audioBitsPerSecond = recorderCfg.audioBitsPerSecond;
          mediaRecorderRef.current = new MediaRecorder(stream, recorderOpts);
          mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorderRef.current.onstop = () => {
            const fallbackMime = recorderCfg.mimeType || (isIosUA ? 'audio/mp4' : 'audio/webm');
            const finalMime = mediaRecorderRef.current?.mimeType || fallbackMime;
            if (!audioChunksRef.current.length) {
              showToast('Audioaufnahme leer');
              return;
            }
            const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
            audioChunksRef.current = [];
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => { sendMessage(null, null, reader.result); };
          };
          audioChunksRef.current = [];
          mediaRecorderRef.current.start(250);
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

      function handleTyping(e) {
         const value = e.target.value;
         setNewMessageText(value);
         if (!activeChat || !user) return;
         updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), { [`typing.${user?.uid}`]: value.length > 0, [`typingAt.${user?.uid}`]: Date.now() }).catch(()=>{});
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         typingTimeoutRef.current = setTimeout(() => {
            updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), { [`typing.${user?.uid}`]: false, [`typingAt.${user?.uid}`]: Date.now() }).catch(()=>{});
         }, 2200);
      }

      // Keep mobile keyboard open after send/edit by aggressively re-focusing the chat input.
      function refocusChatInput() {
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
      }

      function messagePreviewText(m) {
        if (!m) return '';
        if (m.deleted) return 'Nachricht gelÃ¶scht';
        const t = String(m.text || '').trim();
        if (t) return t.length > 140 ? `${t.slice(0, 140)}â€¦` : t;
        if (m.image) return 'ðŸ“· Bild';
        if (m.audio) return 'ðŸŽ¤ Sprachnachricht';
        if (m.event) return `ðŸ“… ${String(m.event.title || 'Termin')}`;
        return '';
      }

      function senderLabelFromId(senderId) {
        try {
          if (!senderId) return 'Unbekannt';
          if (senderId === user?.uid) return 'Du';
          const p = getProfile(senderId);
          return (p?.displayName || p?.username || p?.email || 'Unbekannt');
        } catch (_) { return 'Unbekannt'; }
      }

      const _qMsg = String(messageSearchQuery || '').trim().toLowerCase();
      const baseByType = (isMessageSearchOpen && messageSearchFilter !== 'all' && messageSearchFilter !== 'media')
        ? (chatMessages || []).filter(m => m && messageTypeMatchesFilter(m, messageSearchFilter))
        : (chatMessages || []).filter(Boolean);

      const mediaSearchResults = (isMessageSearchOpen && messageSearchFilter === 'media')
        ? chatMediaItems.filter(m => {
            if (!_qMsg) return true;
            const hay = `${String(m?.text || '')} ${senderLabelFromId(m?.senderId || '')}`.toLowerCase();
            return hay.includes(_qMsg);
          })
        : [];

      const messageMatches = (isMessageSearchOpen && (_qMsg || messageSearchFilter !== 'all'))
        ? (messageSearchFilter === 'media'
            ? mediaSearchResults
            : baseByType.filter(m => {
                if (!_qMsg) return true;
                return String(m?.text || '').toLowerCase().includes(_qMsg);
              }))
        : [];

      const currentMatchId = (isMessageSearchOpen && messageMatches.length > 0)
        ? messageMatches[Math.max(0, Math.min(messageMatchIndex, messageMatches.length - 1))].id
        : null;

      const visibleChatMessages = ((isMessageSearchOpen && messageSearchFilter !== 'all' && messageSearchFilter !== 'media') ? baseByType : (chatMessages || [])).filter(Boolean);

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
            setReplyToMessage(null);
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

        const replyTo = replyToMessage ? {
          id: replyToMessage.id,
          senderId: replyToMessage.senderId || null,
          preview: messagePreviewText(replyToMessage),
        } : null;

        const clientMsgId = `${user?.uid}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const payload = {
          clientMsgId,
          senderId: user?.uid,
          text: textVal,
          image: imageBase64,
          audio: audioBase64,
          event: eventDetails,
          replyTo: replyTo,
          reactions: {},
          starredBy: [],
          selfDestruct: !!selfDestruct,
          timestamp: Date.now(),
          createdAt: serverTimestamp(),
          read: false
        };

        // When sending, always stick to bottom
        try { chatStickToBottomRef.current = true; } catch (_) {}

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
        setReplyToMessage(null);
        refocusChatInput();

        try {
          await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages'), payload);
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), {
            updatedAt: Date.now(),
            lastMessageSenderId: user?.uid,
            messageCount: increment(1),
            mediaCount: imageBase64 ? increment(1) : increment(0),
            [`typing.${user?.uid}`]: false,
            [`typingAt.${user?.uid}`]: Date.now()
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
          await addDoc(collection(db, 'artifacts', APP_ID, 'users', user?.uid, 'events'), {
            title: eventDetails.title, date: eventDetails.date, time: eventDetails.time, type: 'Projekt', desc: 'Geteilter Termin aus Chat', reminderMode: 'default', reminderMinutes: null, createdAt: Date.now(), updatedAt: Date.now(), calendarId: 'default'
          });
          showToast("Termin im Kalender gespeichert!");
        } catch (error) { showToast("Fehler beim Speichern"); }
      };

      const deleteMessage = async (msgId) => {
        if (!activeChat || !user) return;
        try {
          // Soft-delete: keep message visible with a "gelÃ¶scht" hint instead of removing it.
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages', msgId), {
            deleted: true,
            deletedAt: Date.now(),
            deletedBy: user?.uid,
            text: '',
            image: null,
            audio: null,
            event: null
          });
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id), {
            updatedAt: Date.now(),
            lastMessageSenderId: user?.uid
          }).catch(()=>{});
          setSelectedMessageId(null);
          showToast("Nachricht gelÃ¶scht");
          refocusChatInput();
        } catch (error) { showToast("Fehler beim LÃ¶schen"); }
      };

      const toggleMessageReaction = async (msg, emoji) => {
        if (!activeChat || !user || !msg?.id || !emoji) return;
        if (msg.deleted || msg.pending || String(msg.id || '').startsWith('local_')) return;
        const path = `reactions.${emoji}`;
        const mine = Array.isArray(msg?.reactions?.[emoji]) ? msg.reactions[emoji] : [];
        const already = mine.includes(user?.uid);
        try {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages', msg.id), {
            [path]: already ? arrayRemove(user?.uid) : arrayUnion(user?.uid)
          });
        } catch (error) {
          showToast('Reaktion fehlgeschlagen');
        }
      };

      const toggleMessageFavorite = async (msg) => {
        if (!activeChat || !user || !msg?.id) return;
        if (msg.deleted || msg.pending || String(msg.id || '').startsWith('local_')) return;
        const mine = Array.isArray(msg?.starredBy) ? msg.starredBy : [];
        const already = mine.includes(user?.uid);
        try {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'chats', activeChat.id, 'messages', msg.id), {
            starredBy: already ? arrayRemove(user?.uid) : arrayUnion(user?.uid)
          });
          showToast(already ? 'Favorit entfernt' : 'Zu Favoriten hinzugefügt');
        } catch (error) {
          showToast('Favorit fehlgeschlagen');
        }
      };

      const handleImageUpload = async (e) => {
        const file0 = e?.target?.files && e.target.files[0];
        if (!file0) return;
        try { e.target.value = ''; } catch (_) {}

        if (!isProbablyImageFile(file0)) {
          showToast('Nur Bilder unterstÃ¼tzt');
          return;
        }

        try {
          const file = await ensureJpegBlobIfHeic(file0);
          const compressed = await compressImageFileToDataUrl(file, { maxDim: 1600, quality: 0.72 });
          await sendMessage(null, compressed);
        } catch (err) {
          console.warn('image compress/upload failed', err);
          showToast('Bild konnte nicht verarbeitet werden');
        }
      };

      const formatTime = (ts) => {
        if (!ts) return '';
        try { return new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); } catch(e) { return ''; }
      };

      const formatAudioClock = (sec) => {
        const s = Number(sec || 0);
        if (!isFinite(s) || s < 0) return '0:00';
        const mm = Math.floor(s / 60);
        const ss = Math.floor(s % 60);
        return `${mm}:${String(ss).padStart(2, '0')}`;
      };

      const AudioMessageBubble = ({ src, msgId, isMe }) => {
        const audioRef = useRef(null);
        const [duration, setDuration] = useState(0);
        const [pos, setPos] = useState(0);
        const [audioError, setAudioError] = useState('');
        const isPlaying = playingAudioId === msgId;

        useEffect(() => {
          const a = audioRef.current;
          if (!a) return;
          const onLoaded = () => {
            setAudioError('');
            try { setDuration(a.duration || 0); } catch (_) {}
          };
          const onTime = () => { try { setPos(a.currentTime || 0); } catch (_) {} };
          const onEnded = () => { setPlayingAudioId(null); setPos(0); };
          const onError = () => {
            setPlayingAudioId(null);
            setAudioError('Audio kann auf diesem Geraet nicht abgespielt werden.');
          };
          a.addEventListener('loadedmetadata', onLoaded);
          a.addEventListener('timeupdate', onTime);
          a.addEventListener('ended', onEnded);
          a.addEventListener('error', onError);
          return () => {
            try { a.removeEventListener('loadedmetadata', onLoaded); } catch (_) {}
            try { a.removeEventListener('timeupdate', onTime); } catch (_) {}
            try { a.removeEventListener('ended', onEnded); } catch (_) {}
            try { a.removeEventListener('error', onError); } catch (_) {}
          };
        }, []);

        useEffect(() => {
          const a = audioRef.current;
          if (!a) return;
          try { a.load(); } catch (_) {}
          setPos(0);
          setDuration(0);
          setAudioError('');
        }, [src]);

        useEffect(() => {
          const a = audioRef.current;
          if (!a) return;
          if (isPlaying) {
            a.play().catch(() => { setPlayingAudioId(null); });
          } else {
            try { a.pause(); } catch (_) {}
          }
        }, [isPlaying, msgId]);

        const toggle = () => {
          if (!audioRef.current) return;
          if (isPlaying) setPlayingAudioId(null);
          else setPlayingAudioId(msgId);
        };

        const seek = (next) => {
          const a = audioRef.current;
          if (!a) return;
          const n = Number(next);
          if (!isFinite(n)) return;
          try { a.currentTime = Math.max(0, Math.min(n, duration || 0)); } catch (_) {}
          setPos(Math.max(0, Math.min(n, duration || 0)));
        };

        return (
          <div className={`mb-2 w-full max-w-[320px] rounded-xl border ${isMe ? 'bg-black/10 border-black/20' : 'bg-black/40 border-neutral-700'} p-2 flex items-center gap-2`}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isMe ? 'border-black/20 hover:bg-black/10' : 'border-neutral-600 hover:bg-neutral-800'}`} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className={`w-5 h-5 ${isMe ? 'text-black' : 'text-white'}`} /> : <Play className={`w-5 h-5 ${isMe ? 'text-black' : 'text-white'}`} />}
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="range"
                min={0}
                max={Math.max(duration || 0, 0)}
                step={0.05}
                value={Math.min(pos || 0, duration || 0)}
                onChange={(e) => seek(e.target.value)}
                className="w-full accent-white"
              />
              <div className={`mt-1 text-[10px] tabular-nums flex items-center justify-between ${isMe ? 'text-black/70' : 'text-neutral-300/80'}`}>
                <span>{formatAudioClock(pos || 0)}</span>
                <span>{formatAudioClock(duration || 0)}</span>
              </div>
              {!!audioError && (
                <div className={`mt-1 text-[10px] ${isMe ? 'text-black/60' : 'text-amber-400'}`}>{audioError}</div>
              )}
            </div>
            <audio ref={audioRef} src={src} preload="metadata" />
          </div>
        );
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
              await addDoc(collection(db, 'artifacts', APP_ID, 'users', user?.uid, 'events'), {
                title: 'Importierter Termin', date: new Date().toISOString().split('T')[0], time: '12:00', type: 'Privat', desc: 'Aus ICS importiert', createdAt: Date.now(), calendarId: 'default'
              });
              showToast('Import abgeschlossen.');
            } catch (error) {}
          }, 1000);
        }
      };

      const getStorageKey = (suffix) => `onyx_${APP_ID}_${user?.uid || 'guest'}_${suffix}`;
      useEffect(() => {
        const id = setInterval(() => setFocusTick(Date.now()), 1000);
        return () => clearInterval(id);
      }, []);
      useEffect(() => {
        extrasCloudReadyRef.current = false;
        try {
          const rawState = localStorage.getItem(getStorageKey('focusState'));
          const rawHistory = localStorage.getItem(getStorageKey('focusHistory'));
          const rawNotes = localStorage.getItem(getStorageKey('quickNotes'));
          const rawGoals = localStorage.getItem(getStorageKey('dailyGoals'));
          const rawTarget = localStorage.getItem(getStorageKey('weeklyTargetHours'));
          const rawOrder = localStorage.getItem(getStorageKey('extrasSlotOrder'));
          const rawUpdatedAt = localStorage.getItem(getStorageKey('extrasUpdatedAt'));
          if (rawState) setFocusState(JSON.parse(rawState));
          if (rawHistory) setFocusHistory(JSON.parse(rawHistory));
          if (typeof rawNotes === 'string') setQuickNotes(rawNotes);
          if (rawGoals) setDailyGoals(normalizeDailyGoals(JSON.parse(rawGoals)));
          if (typeof rawTarget === 'string' && rawTarget.length) setWeeklyTargetHours(rawTarget);
          if (rawOrder) setExtrasSlotOrder(normalizeExtrasOrder(JSON.parse(rawOrder)));
          if (rawUpdatedAt) setExtrasUpdatedAt(Number(rawUpdatedAt || 0));
        } catch (_) {}
      }, [user?.uid]);
      useEffect(() => {
        try { localStorage.setItem(getStorageKey('focusState'), JSON.stringify(focusState || null)); } catch (_) {}
      }, [focusState, user?.uid]);
      useEffect(() => {
        try { localStorage.setItem(getStorageKey('focusHistory'), JSON.stringify(focusHistory || [])); } catch (_) {}
      }, [focusHistory, user?.uid]);
      useEffect(() => {
        try { localStorage.setItem(getStorageKey('quickNotes'), quickNotes || ''); } catch (_) {}
      }, [quickNotes, user?.uid]);
      useEffect(() => {
        try { localStorage.setItem(getStorageKey('dailyGoals'), JSON.stringify(normalizeDailyGoals(dailyGoals))); } catch (_) {}
      }, [dailyGoals, user?.uid]);
      useEffect(() => {
        try { localStorage.setItem(getStorageKey('weeklyTargetHours'), String(weeklyTargetHours || '')); } catch (_) {}
      }, [weeklyTargetHours, user?.uid]);
      useEffect(() => {
        try { localStorage.setItem(getStorageKey('extrasSlotOrder'), JSON.stringify(normalizeExtrasOrder(extrasSlotOrder))); } catch (_) {}
      }, [extrasSlotOrder, user?.uid]);
      useEffect(() => {
        try { localStorage.setItem(getStorageKey('extrasUpdatedAt'), String(extrasUpdatedAt || 0)); } catch (_) {}
      }, [extrasUpdatedAt, user?.uid]);
      useEffect(() => {
        if (!user) return;
        const remoteTs = Number(userProfile?.extrasUpdatedAt || 0);
        if (!remoteTs || remoteTs <= Number(extrasUpdatedAt || 0)) return;
        try {
          if (typeof userProfile?.quickNotesCloud === 'string') setQuickNotes(String(userProfile?.quickNotesCloud || ''));
          if (Array.isArray(userProfile?.dailyGoals)) setDailyGoals(normalizeDailyGoals(userProfile?.dailyGoals));
          if (userProfile?.weeklyTargetHours !== undefined && userProfile?.weeklyTargetHours !== null) setWeeklyTargetHours(String(userProfile?.weeklyTargetHours));
          if (Array.isArray(userProfile?.extrasSlotOrder)) setExtrasSlotOrder(normalizeExtrasOrder(userProfile?.extrasSlotOrder));
          setExtrasUpdatedAt(remoteTs);
          extrasCloudReadyRef.current = true;
        } catch (_) {}
      }, [user?.uid, userProfile?.extrasUpdatedAt, userProfile?.quickNotesCloud, userProfile?.dailyGoals, userProfile?.weeklyTargetHours, userProfile?.extrasSlotOrder]);
      useEffect(() => {
        if (!user) return;
        if (!extrasCloudReadyRef.current) { extrasCloudReadyRef.current = true; return; }
        try { if (extrasCloudTimerRef.current) clearTimeout(extrasCloudTimerRef.current); } catch (_) {}
        extrasCloudTimerRef.current = setTimeout(async () => {
          try {
            const ts = Date.now();
            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), {
              quickNotesCloud: String(quickNotes || ''),
              dailyGoals: normalizeDailyGoals(dailyGoals),
              weeklyTargetHours: Number(String(weeklyTargetHours || '0').replace(',', '.')) || 0,
              extrasSlotOrder: normalizeExtrasOrder(extrasSlotOrder),
              extrasUpdatedAt: ts,
              updatedAt: ts,
            }, { merge: true });
            setExtrasUpdatedAt(ts);
          } catch (err) {
            console.warn('extras cloud sync failed', err);
          }
        }, 700);
        return () => { try { if (extrasCloudTimerRef.current) clearTimeout(extrasCloudTimerRef.current); } catch (_) {} };
      }, [quickNotes, dailyGoals, weeklyTargetHours, extrasSlotOrder, user?.uid]);
      const getFocusElapsedMs = (state, now = Date.now()) => {
        if (!state?.startedAt) return 0;
        const base = Math.max(0, now - Number(state.startedAt || now));
        const paused = Number(state?.pausedAccumulatedMs || 0) + ((state?.isPaused && state?.pauseStartedAt) ? Math.max(0, now - Number(state.pauseStartedAt || now)) : 0);
        return Math.max(0, base - paused);
      };
      const focusRemainingMs = focusState?.startedAt ? Math.max(0, Number(focusState.durationMin || 25) * 60000 - getFocusElapsedMs(focusState, focusTick)) : 0;
      const startFocusMode = () => {
        const now = Date.now();
        setFocusState({ startedAt: now, durationMin: Number(focusDurationMin || 25), isPaused: false, pausedAccumulatedMs: 0, pauseStartedAt: null });
        showToast('Fokus gestartet');
      };
      const toggleFocusPause = () => {
        if (!focusState?.startedAt) return;
        const now = Date.now();
        if (focusState?.isPaused) {
          setFocusState(prev => ({ ...(prev || {}), isPaused: false, pausedAccumulatedMs: Number(prev?.pausedAccumulatedMs || 0) + Math.max(0, now - Number(prev?.pauseStartedAt || now)), pauseStartedAt: null }));
          showToast('Fokus weitergefÃ¼hrt');
        } else {
          setFocusState(prev => ({ ...(prev || {}), isPaused: true, pauseStartedAt: now }));
          showToast('Fokus pausiert');
        }
      };
      const stopFocusMode = (markDone = false) => {
        try {
          if (markDone && focusState?.startedAt) {
            const finishedAt = Date.now();
            const elapsedMs = getFocusElapsedMs(focusState, finishedAt);
            setFocusHistory(prev => ([{ id: `focus_${finishedAt}`, startedAt: Number(focusState.startedAt || finishedAt), finishedAt, durationMin: Number(focusState.durationMin || 25), elapsedMs }, ...(prev || [])]).slice(0, 20));
          }
        } catch (_) {}
        setFocusState(null);
        if (markDone) showToast('Fokusblock gespeichert');
      };
      useEffect(() => {
        if (focusState?.startedAt && !focusState?.isPaused && focusRemainingMs === 0) {
          stopFocusMode(true);
        }
      }, [focusRemainingMs, focusState?.startedAt, focusState?.isPaused]);

      if (!isAppReady) {
        return (
          <div className="flex h-screen w-full bg-black text-white font-sans items-center justify-center p-4" style={{ height: 'var(--app-height, 100vh)' }}>
            <div className="flex flex-col items-center animate-pulse"><div className="w-12 h-12 bg-white rounded-sm mb-6"></div><h1 className="text-xl tracking-widest text-neutral-500">ONYX LÃ„DT...</h1></div>
          </div>
        );
      }

      // Public share page (no login required)
      if (publicShareToken) {
        const d = publicShareDoc || {};
        const needsPasscode = !!(d.passcodeHash && d.passcodeSalt);
        const canView = !!publicShareAuthed || !needsPasscode;

        const groupBusyByDay = (blocks) => {
          const out = new Map();
          for (const b of (Array.isArray(blocks) ? blocks : [])) {
            const s = new Date(b.startMs);
            const key = s.toISOString().split('T')[0];
            const arr = out.get(key) || [];
            arr.push(b);
            out.set(key, arr);
          }
          const keys = Array.from(out.keys()).sort();
          return keys.map(k => ({ day: k, blocks: (out.get(k) || []).sort((a, b) => a.startMs - b.startMs) }));
        };

        const downloadIcsForSharedEvent = () => {
          try {
            const ev = d.eventSnapshot || {};
            const dateStr = String(ev.date || '').replace(/-/g, '');
            const timeStr = (String(ev.time || '12:00').split('-')[0].trim() || '12:00').replace(':', '') + '00';
            const ics = [
              'BEGIN:VCALENDAR',
              'VERSION:2.0',
              'PRODID:-//Onyx Calendar//DE',
              'BEGIN:VEVENT',
              `SUMMARY:${String(ev.title || 'Termin').replace(/\n/g,' ')}`,
              `DTSTART;TZID=Europe/Zurich:${dateStr}T${timeStr}`,
              ev.location ? `LOCATION:${String(ev.location).replace(/\n/g,' ')}` : '',
              ev.desc ? `DESCRIPTION:${String(ev.desc).replace(/\n/g,' ')}` : '',
              'END:VEVENT',
              'END:VCALENDAR'
            ].filter(Boolean).join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
            a.download = 'onyx_share.ics';
            a.click();
          } catch (_) {}
        };

        return (
          <div className="flex h-screen w-full bg-black text-white font-sans items-center justify-center p-4 relative overflow-hidden" style={{ height: 'var(--app-height, 100vh)' }}>
            <div className="fixed top-4 right-4 z-[60] space-y-2">
              {toasts.map(toast => (<div key={toast.id} className="bg-neutral-900 border border-neutral-700 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in"><CheckCircle2 className="w-5 h-5 text-neutral-400" /><span className="text-sm font-medium">{toast.message}</span></div>))}
            </div>

            <div className="max-w-2xl w-full p-6 md:p-8 bg-black border border-neutral-800 rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white rounded-sm"></div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-widest">ONYX â€¢ Public Share</div>
                    <div className="text-lg font-medium text-white">{d.kind === 'calendar' ? (d.calName || 'Kalender') : (d.eventSnapshot?.title || 'Termin')}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { window.location.hash = '#/'; }}
                  className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:border-neutral-500"
                >
                  Zur App
                </button>
              </div>

              <div className="mt-6">
                {publicShareLoading ? (
                  <div className="text-sm text-neutral-500">Ladeâ€¦</div>
                ) : publicShareError ? (
                  <div className="text-sm text-red-400">{publicShareError}</div>
                ) : !publicShareDoc ? (
                  <div className="text-sm text-neutral-500">â€”</div>
                ) : !canView ? (
                  <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm text-white font-medium"><Lock className="w-4 h-4" /> GeschÃ¼tzt</div>
                    {needsPasscode ? (
                      <>
                        <p className="mt-2 text-xs text-neutral-500">Bitte Passcode eingeben.</p>
                        <div className="mt-3 flex gap-2">
                          <input value={publicSharePasscode} onChange={(e) => setPublicSharePasscode(e.target.value)} placeholder="Passcode" className="flex-1 bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-neutral-500" />
                          <button type="button" onClick={verifyPublicSharePasscode} className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200">Ã–ffnen</button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-neutral-500">Dieser Link ist geschÃ¼tzt.</p>
                    )}
                  </div>
                ) : (
                  <>
                    {d.expiresAtMs ? (
                      <div className="text-[11px] text-neutral-500">LÃ¤uft ab: {new Date(d.expiresAtMs).toLocaleString('de-CH')}</div>
                    ) : (
                      <div className="text-[11px] text-neutral-500">Ohne Ablaufdatum</div>
                    )}

                    {d.kind === 'calendar' ? (
                      <div className="mt-4 bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                        <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">Busyâ€‘Only</div>
                        <div className="text-[11px] text-neutral-500 mb-4">Zeigt nur belegte Zeiten (ohne Titel/Ort). Range: {d.rangeStart} â†’ {d.rangeEnd}</div>

                        {Array.isArray(d.busyBlocks) && d.busyBlocks.length ? (
                          <div className="space-y-3 max-h-[52vh] overflow-y-auto no-scrollbar pr-1">
                            {groupBusyByDay(d.busyBlocks).map(day => (
                              <div key={day.day} className="border border-neutral-800 rounded-xl p-3 bg-black">
                                <div className="text-sm text-white font-medium tabular-nums">{day.day}</div>
                                <div className="mt-2 space-y-1">
                                  {day.blocks.map((b, idx) => (
                                    <div key={idx} className="text-xs text-neutral-300 tabular-nums">
                                      {new Date(b.startMs).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} â€“ {new Date(b.endMs).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-neutral-500">Keine belegten Zeiten in der Range.</div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                        <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">Event</div>
                        <div className="text-lg text-white font-medium">{d.eventSnapshot?.title || 'Termin'}</div>
                        <div className="mt-1 text-sm text-neutral-300 tabular-nums">{d.eventSnapshot?.date}{d.eventSnapshot?.time ? ` â€¢ ${d.eventSnapshot?.time}` : ''}</div>
                        {d.eventSnapshot?.location ? <div className="mt-2 text-sm text-neutral-400">ðŸ“ {d.eventSnapshot.location}</div> : null}
                        {d.eventSnapshot?.desc ? <div className="mt-3 text-sm text-neutral-300 whitespace-pre-wrap">{d.eventSnapshot.desc}</div> : null}
                        <div className="mt-4 flex gap-2">
                          <button type="button" onClick={downloadIcsForSharedEvent} className="flex-1 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-gray-200">ICS Download</button>
                          <button type="button" onClick={() => { try { navigator.clipboard?.writeText(window.location.href); showToast('Link kopiert'); } catch (_) {} }} className="px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 hover:border-neutral-500" title="Link kopieren">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
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


      const todayDateStr = new Date().toISOString().split('T')[0];
      const todaysEvents = getEventsForDate(todayDateStr);
      const nowMs = Date.now();
      const timedEventsToday = todaysEvents
        .map((event) => ({ event, startMs: parseDateTimeLocalMs(todayDateStr, event?.time) }))
        .filter((entry) => Number.isFinite(entry.startMs))
        .sort((a, b) => a.startMs - b.startMs);
      const nextTimedEvent = timedEventsToday.find((entry) => entry.startMs >= nowMs);
      const remainingTodayCount = todaysEvents.filter((event) => {
        const startMs = parseDateTimeLocalMs(todayDateStr, event?.time);
        if (Number.isFinite(startMs)) return startMs >= nowMs;
        return true;
      }).length;
      const freeUntilLabel = nextTimedEvent ? formatHourLabel(todayDateStr + 'T' + nextTimedEvent.event.time) : null;
      const nextEventCountdownText = (() => {
        if (!nextTimedEvent) return 'Kein weiterer fixer Termin heute';
        const diffMin = Math.max(0, Math.round((nextTimedEvent.startMs - nowMs) / 60000));
        if (diffMin < 1) return 'Startet jetzt';
        if (diffMin < 60) return `In ${diffMin} Min.`;
        const hours = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        return mins ? `In ${hours}h ${mins} Min.` : `In ${hours}h`;
      })();
      const freeWindowText = (() => {
        if (remainingTodayCount === 0) return 'Rest des Tages frei';
        if (freeUntilLabel) return `Bis ${freeUntilLabel} frei`;
        return `${remainingTodayCount} Eintrag${remainingTodayCount === 1 ? '' : 'e'} noch offen`;
      })();
      const nextEventLabel = nextTimedEvent ? (nextTimedEvent.event?.time ? `${nextTimedEvent.event.time} Â· ${nextTimedEvent.event.title || 'Termin'}` : (nextTimedEvent.event.title || 'Termin')) : 'Heute nichts mehr geplant';
      const weatherBadgeMeta = getWeatherBadgeMeta();

      const activeWorkMs = getActiveWorkedMs(workClockActive, workClockTick);
      const todayWorkMs = workClockSessions.filter(s => s?.dateKey === todayDateStr).reduce((sum, s) => sum + Number(s?.workMs || 0), 0) + activeWorkMs;
      const weekStartMs = startOfWeekMs();
      const monthStartMs = startOfMonthMs();
      const weekSessions = workClockSessions.filter(s => Number(s?.startedAt || 0) >= weekStartMs);
      const monthSessions = workClockSessions.filter(s => Number(s?.startedAt || 0) >= monthStartMs);
      const weekWorkMs = weekSessions.reduce((sum, s) => sum + Number(s?.workMs || 0), 0) + activeWorkMs;
      const monthWorkMs = monthSessions.reduce((sum, s) => sum + Number(s?.workMs || 0), 0) + activeWorkMs;
      const weekAvgMs = weekSessions.length ? Math.round(weekWorkMs / Math.max(1, weekSessions.length + (activeWorkMs > 0 ? 1 : 0))) : (activeWorkMs > 0 ? activeWorkMs : 0);
      const monthAvgMs = monthSessions.length ? Math.round(monthWorkMs / Math.max(1, monthSessions.length + (activeWorkMs > 0 ? 1 : 0))) : (activeWorkMs > 0 ? activeWorkMs : 0);
      const workLevelSummary = ['leicht','mittel','schwer'].map(level => ({ level, count: monthSessions.filter(s => String(s?.level || '') === level).length }));



      const weekEventDates = Array.from({ length: 7 }, (_, idx) => {
        const d = new Date(weekStartMs + idx * 86400000);
        return d.toISOString().slice(0, 10);
      });
      const weekCalendarEvents = weekEventDates.flatMap((dateStr) => {
        try { return (getEventsForDate(dateStr) || []).map(ev => ({ ...ev, __date: dateStr })); } catch (_) { return []; }
      });
      const weekEventCount = weekCalendarEvents.length;
      const todayEventCount = todaysEvents.length;
      const nextFreeBlock = (() => {
        if (!timedEventsToday.length) return 'Ganzer Tag frei';
        const first = timedEventsToday[0];
        if (Number.isFinite(first?.startMs) && first.startMs > nowMs + 45 * 60000) return `Aktuell frei bis ${first.event?.time || 'spÃ¤ter'}`;
        for (let i = 0; i < timedEventsToday.length - 1; i += 1) {
          const a = timedEventsToday[i];
          const b = timedEventsToday[i + 1];
          if (Number.isFinite(a?.startMs) && Number.isFinite(b?.startMs)) {
            const gapMin = Math.round((b.startMs - a.startMs) / 60000) - 60;
            if (gapMin >= 45) return `${a.event?.time || ''}â€“${b.event?.time || ''} frei`;
          }
        }
        return freeWindowText;
      })();
      const focusTodayMs = (focusHistory || []).filter((x) => localDateKey(x?.startedAt || Date.now()) === todayDateStr).reduce((sum, x) => sum + Number(x?.elapsedMs || 0), 0) + (focusState?.startedAt ? getFocusElapsedMs(focusState, focusTick) : 0);
      const bestWeatherWindow = (() => {
        try {
          const times = hourlyForecast?.time || [];
          const rain = hourlyForecast?.precipitation_probability || [];
          const temps = hourlyForecast?.temperature_2m || [];
          if (!times.length) return 'Aktuell keine 4h-Tendenz verfÃ¼gbar';
          const now = Date.now();
          const next = times.map((t, i) => ({ t, idx: i, ms: Date.parse(t), rain: Number(rain?.[i] || 0), temp: Number(temps?.[i] || 0) })).filter(x => Number.isFinite(x.ms) && x.ms >= now).slice(0, 8);
          const dry = next.filter(x => x.rain < 35);
          if (dry.length >= 2) return `Eher trocken bis ${new Date(dry[dry.length - 1].ms).toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' })}`;
          const wet = next.find(x => x.rain >= 55);
          if (wet) return `Ab ${new Date(wet.ms).toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' })} eher nass`; 
          return todayWeatherAdvice;
        } catch (_) { return todayWeatherAdvice; }
      })();
      const compactHomeSmartDay = (userProfile?.smartDayEnabled !== false) && (userProfile?.smartDayHomeEnabled !== false);
      const compactHomeWorkClock = (userProfile?.workClockEnabled === true) && (userProfile?.workClockHomeEnabled === true);
      const extrasEnabled = userProfile?.extrasEnabled !== false;
      const showExtrasSmartDay = extrasEnabled && (userProfile?.smartDayEnabled !== false);
      const showExtrasWorkClock = extrasEnabled && (userProfile?.workClockEnabled === true);
      const showExtrasFocus = extrasEnabled && (userProfile?.focusModeEnabled !== false);
      const showExtrasWeek = extrasEnabled && (userProfile?.weeklyOverviewEnabled !== false);
      const showExtrasNotes = extrasEnabled && (userProfile?.quickNotesEnabled !== false);
      const showExtrasWeather = extrasEnabled && (userProfile?.weatherPlannerEnabled !== false);
      const showExtrasTimeBalance = extrasEnabled && (userProfile?.timeBalanceEnabled !== false);
      const showExtrasFreeWindows = extrasEnabled && (userProfile?.freeWindowsEnabled !== false);
      const showExtrasGoals = extrasEnabled && (userProfile?.dailyGoalsEnabled !== false);
      const weeklyTargetMs = Math.max(0, (Number(String(weeklyTargetHours || '0').replace(',', '.')) || 0) * 3600000);
      const weekDeltaMs = weekWorkMs - weeklyTargetMs;
      const weekTargetPct = weeklyTargetMs > 0 ? Math.max(0, Math.min(100, Math.round((weekWorkMs / weeklyTargetMs) * 100))) : 0;
      const freeWindowsToday = (() => {
        const items = [];
        const endOfDayMs = parseDateTimeLocalMs(todayDateStr, '23:59');
        let cursor = nowMs;
        const blocks = timedEventsToday.map((entry) => ({ startMs: entry.startMs, endMs: entry.startMs + 60 * 60000, label: entry.event?.time || 'Termin' })).filter((x) => Number.isFinite(x.startMs)).sort((a,b) => a.startMs - b.startMs);
        if (!blocks.length) return ['Ganzer Tag frei'];
        for (const block of blocks) {
          if (block.startMs - cursor >= 30 * 60000) {
            items.push(`${new Date(cursor).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}â€“${new Date(block.startMs).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`);
          }
          cursor = Math.max(cursor, block.endMs);
        }
        if (endOfDayMs - cursor >= 30 * 60000) items.push(`${new Date(cursor).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}â€“23:59`);
        return items.length ? items.slice(0, 4) : ['Keine lÃ¤ngeren Fenster'];
      })();
      const completedGoals = normalizeDailyGoals(dailyGoals).filter((g) => g.done && String(g.text || '').trim()).length;
      const activeCalForView = getCalendarById(activeCalendarId);

      return (
        <div 
          className={`flex h-screen w-full bg-black text-white font-sans overflow-hidden flex-col md:flex-row pb-16 md:pb-0 relative ${uiTheme === 'light' ? 'theme-light' : 'theme-dark'}`} style={{ height: 'var(--app-height, 100vh)' }}
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
              <button onClick={() => setPlusMenuOpen(true)} className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 px-4 rounded-md font-medium hover:bg-gray-200 transition-colors mb-8"><Plus className="w-5 h-5" /> Neuer Termin</button>
              <nav className="space-y-2 mb-8">
                <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-neutral-900' : 'hover:bg-neutral-900/50 text-neutral-400 hover:text-white'}`}><Home className="w-5 h-5" /> Dashboard</button>
                <button onClick={() => setCurrentView('calendar')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${currentView === 'calendar' ? 'bg-neutral-900' : 'hover:bg-neutral-900/50 text-neutral-400 hover:text-white'}`}><CalendarIcon className="w-5 h-5" /> Kalender</button>
                <button onClick={() => setCurrentView('shopping')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${currentView === 'shopping' ? 'bg-neutral-900' : 'hover:bg-neutral-900/50 text-neutral-400 hover:text-white'}`}><ShoppingCart className="w-5 h-5" /> Einkauf</button>
                <button onClick={() => setCurrentView('extras')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${currentView === 'extras' ? 'bg-neutral-900' : 'hover:bg-neutral-900/50 text-neutral-400 hover:text-white'}`}><Activity className="w-5 h-5" /> Extras</button>
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
                 {(customCalendars || []).filter(Boolean).map(cal => (
                   <div key={cal.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-900/50 transition-colors group">
                      <label className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden">
                        <input type="checkbox" checked={visibleCalendars.includes(cal.id)} onChange={() => toggleCalendarVisibility(cal.id)} className="appearance-none w-4 h-4 border border-neutral-600 rounded-sm checked:bg-white checked:border-white transition-colors cursor-pointer shrink-0" />
                        <span className="text-sm text-neutral-300 truncate">{cal.name} {cal.ownerId !== user?.uid ? '(Geteilt)' : ''}</span>
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
            <button onClick={() => setPlusMenuOpen(true)} className="p-3 bg-white text-black rounded-full -mt-6 border-4 border-black shadow-lg"><Plus className="w-6 h-6" /></button>
            <button onClick={() => setCurrentView('extras')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${currentView === 'extras' ? 'text-white' : 'text-neutral-500'}`}><Activity className="w-6 h-6" /></button>
            <button onClick={() => setCurrentView('settings')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-white' : 'text-neutral-500'}`}><Settings className="w-6 h-6" /></button>
          </nav>

          <main ref={mainRef} className="flex-1 flex flex-col h-full overflow-y-auto bg-black relative">
            {currentView === 'dashboard' && (
              <div className="p-6 md:p-10 max-w-5xl w-full mx-auto animate-fade-in">
                <header className="flex justify-between items-center mb-8 md:mb-10">
                  <h2 className="text-3xl md:text-4xl font-light">Guten Morgen{dashboardName ? `, ${dashboardName}` : ''}.</h2>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="px-3 py-2 rounded-xl border border-neutral-800 bg-black/60 text-neutral-200 hover:border-neutral-500 transition-colors flex items-center gap-2 text-xs"
                    title={uiTheme === 'light' ? 'Zu Dunkel wechseln' : 'Zu Hell wechseln'}
                  >
                    {uiTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    <span>{uiTheme === 'light' ? 'Dunkel' : 'Hell'}</span>
                  </button>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
                  <div onClick={() => setIsWeatherModalOpen(true)} className="p-5 md:p-6 border border-neutral-800 rounded-xl bg-neutral-950/30 flex items-center justify-between gap-4 cursor-pointer hover:border-neutral-600 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-neutral-500 text-xs md:text-sm font-medium uppercase tracking-wider mb-1 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {location.name}</h3>
                      <p className="text-3xl md:text-4xl font-light">{weather ? `${Math.round(weather.temperature)}Â°` : '--Â°'}</p>
                      <p className="mt-2 text-sm text-neutral-400 leading-relaxed max-w-[32rem]">{todayWeatherAdvice}</p>
                    </div>
                    <div className="shrink-0">{getWeatherIcon(weather?.weathercode, "w-10 h-10 md:w-12 md:h-12 text-white")}</div>
                  </div>
                  <div className="p-5 md:p-6 border border-neutral-800 rounded-xl bg-neutral-950/30 flex items-start gap-4">
                    <Info className="w-5 h-5 md:w-6 md:h-6 text-neutral-400 shrink-0 mt-1" />
                    <div className="flex-1"><div className="flex items-center justify-between gap-3 mb-2"><h3 className="text-neutral-500 text-xs md:text-sm font-medium uppercase tracking-wider">Spruch des Tages</h3><button onClick={refreshDailyFact} title="Neuer Spruch" className="p-2 rounded-lg border border-neutral-800 hover:border-neutral-500 hover:bg-neutral-900 transition-colors text-neutral-300"><RefreshCw className="w-4 h-4" /></button></div><p className="text-xl md:text-2xl font-semibold text-neutral-100 leading-snug">â€œ{dailyFact}â€</p></div>
                  </div>
                </div>

                {(compactHomeSmartDay || compactHomeWorkClock) && (
                  <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {compactHomeSmartDay && (
                      <div className="border border-neutral-800 rounded-2xl bg-neutral-950/40 p-4 md:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-2">Smart Day</div>
                            <div className="text-lg md:text-xl font-semibold text-white">{nextEventLabel}</div>
                            <div className="mt-2 text-sm text-neutral-400">{nextEventCountdownText} Â· {freeWindowText}</div>
                          </div>
                          <button onClick={() => setCurrentView('extras')} className="px-3 py-2 rounded-xl border border-neutral-800 text-xs text-neutral-300 hover:border-neutral-500 transition-colors">Ã–ffnen</button>
                        </div>
                      </div>
                    )}
                    {compactHomeWorkClock && (
                      <div className="border border-neutral-800 rounded-2xl bg-neutral-950/40 p-4 md:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-2">Stempeluhr</div>
                            <div className="text-lg md:text-xl font-semibold text-white flex items-center gap-2"><Timer className="w-5 h-5" /> {workClockActive?.startedAt ? formatDurationCompact(activeWorkMs) : formatDurationCompact(todayWorkMs)}</div>
                            <div className="mt-2 text-sm text-neutral-400">{workClockActive?.startedAt ? (workClockActive?.isPaused ? 'Pause aktiv' : 'LÃ¤uft gerade') : `Heute ${formatDurationVerbose(todayWorkMs)}`}</div>
                          </div>
                          <button onClick={() => setCurrentView('extras')} className="px-3 py-2 rounded-xl border border-neutral-800 text-xs text-neutral-300 hover:border-neutral-500 transition-colors">Ã–ffnen</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <h3 className="text-lg md:text-xl font-medium mb-4 border-b border-neutral-800 pb-3 flex justify-between items-end">Agenda fÃ¼r heute<span className="text-sm font-normal text-neutral-500">{new Date().toLocaleDateString('de-DE')}</span></h3>
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
                             <p className="font-medium text-white truncate flex items-center gap-2">
                               <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: calendarTint(event.calendarId || 'default') }} />
                               <span className="truncate">{event.title}</span>
                             </p>
                             <p className="text-xs text-neutral-500 mt-0.5 truncate">{event.type === 'shift' ? getCalendarById(event.calendarId)?.name : event.type} {event.desc && `â€¢ ${event.desc}`}</p>
                          </div>
                        </div>
                      ))
                    ) : (<p className="text-neutral-500 text-sm italic p-4 text-center border border-dashed border-neutral-800 rounded-lg">Keine Termine fÃ¼r heute.</p>)}
                  </div>
                </div>
              </div>
            )}

            {currentView === 'calendar' && (
              <div className="flex-1 flex flex-col h-full w-full max-w-7xl mx-auto animate-fade-in select-none">
                
                {/* Mobile Calendar Multi-Select (sichtbar) + Active Calendar */}
                <div className="md:hidden px-4 py-2 border-b border-neutral-800 bg-neutral-950 shrink-0">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold mr-1 shrink-0">Sichtbar:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = ['default', ...(customCalendars || []).map(c => c.id)];
                        setVisibleCalendars(allIds);
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-500"
                    >
                      Alle
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCalendarVisibility('default')}
                      className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${visibleCalendars.includes('default') ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}
                    >
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: calendarTint('default') }} />
                      Privat
                    </button>
                    {(customCalendars || []).filter(Boolean).map(cal => (
                      <button
                        key={cal.id}
                        type="button"
                        onClick={() => toggleCalendarVisibility(cal.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${visibleCalendars.includes(cal.id) ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: calendarTint(cal.id) }} />
                        {cal.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-2">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold mr-1 shrink-0">Aktiv:</span>
                    <button onClick={() => setActiveCalendarId('default')} className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${activeCalendarId === 'default' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}>Privat</button>
                    {(customCalendars || []).filter(Boolean).map(cal => (
                      <button key={cal.id} onClick={() => setActiveCalendarId(cal.id)} className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${activeCalendarId === cal.id ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}>{cal.name}</button>
                    ))}
                  </div>
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
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="px-3 py-2 rounded-xl border border-neutral-800 bg-black/60 text-neutral-200 hover:border-neutral-500 transition-colors flex items-center gap-2 text-xs"
                    title={uiTheme === 'light' ? 'Zu Dunkel wechseln' : 'Zu Hell wechseln'}
                  >
                    {uiTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    <span className="hidden sm:inline">{uiTheme === 'light' ? 'Dunkel' : 'Hell'}</span>
                  </button>
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
                        <option value="7">NÃ¤chste 7 Tage</option>
                        <option value="30">NÃ¤chste 30 Tage</option>
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
                                 if (e.target.value === 'delete') setSelectedPaintShift({ id: 'delete', name: 'LÃ¶schen' });
                                 else setSelectedPaintShift(activeCalForView.shifts.find(s => s.id === e.target.value));
                              }}
                              className="bg-black border border-neutral-700 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none"
                           >
                              {(activeCalForView?.shifts || []).filter(Boolean).map(s => <option key={s?.id} value={s?.id}>{s?.name || 'Schicht'}</option>)}
                              <option value="delete">Frei / LÃ¶schen</option>
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
                                 <div
                                   key={event.id}
                                   className="text-[9px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 truncate flex items-center gap-1"
                                   style={{ borderLeft: `3px solid ${calendarTint(event.calendarId || 'default')}` }}
                                 >
                                   <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: calendarTint(event.calendarId || 'default') }} />
                                   <span className="text-neutral-500 mr-1">{event.time}</span>
                                   {event.poll && event.poll.status === 'open' && <span className="mr-1">ðŸ—³ï¸</span>}
                                   <span className="truncate">{event.title}</span>
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
                              {agendaRange === 'month' ? `${MONATE[currentDate.getMonth()]} ${currentDate.getFullYear()}` : `${start} â€“ ${end}`}
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
                                      <div
                                        className="w-10 h-10 rounded-lg shrink-0 bg-neutral-900 border border-neutral-800 flex items-center justify-center"
                                        style={{ borderLeft: `4px solid ${calendarTint(ev.calendarId || 'default')}` }}
                                      >
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
                                        {ev.type === 'shift' ? 'Schicht' : (ev.time ? `${ev.time} Â· ` : '')}{ev.type || 'Privat'}{ev.desc ? ` Â· ${ev.desc}` : ''}
                                        {ev.calendarId && (
                                          <span className="text-neutral-600"> Â· {getCalendarById(ev.calendarId)?.name || 'Kalender'}</span>
                                        )}
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

              {/* KALENDER FEED (unter dem Kalender): Abstimmungen & Kommentare */}
                {(() => {
                  const feedEvents = (allEvents || []).filter(e => e && e.type !== 'shift');
                  const openPollEvents = feedEvents.filter(e => e && e.poll && e.poll.status === 'open');
                  const commentEvents = feedEvents
                    .filter(e => e && e.lastCommentAt)
                    .sort((a,b) => (b.lastCommentAt || 0) - (a.lastCommentAt || 0))
                    .slice(0, 6);

                  const feedTitle = (() => {
                    try {
                      if (!Array.isArray(visibleCalendars) || visibleCalendars.length === 0) return 'Privat';
                      if (visibleCalendars.length === 1) return getCalendarById(visibleCalendars[0])?.name || 'Privat';
                      return `${visibleCalendars.length} Kalender`;
                    } catch (_) { return 'Kalender'; }
                  })();

                  return (
                    <div className="bg-neutral-950 border-t border-neutral-800 px-4 md:px-8 py-4 shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-neutral-500">Kalender-Feed</p>
                          <h3 className="text-sm font-medium text-white">{feedTitle}</h3>
                        </div>
                        <div className="text-[11px] text-neutral-500">ðŸ—³ï¸ {openPollEvents.length} â€¢ ðŸ’¬ {commentEvents.length}</div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-black border border-neutral-800 rounded-2xl p-3 max-h-72 overflow-y-auto">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold text-white">ðŸ—³ï¸ Abstimmungen</div>
                            {openPollEvents.some(x => !canWriteCalendar(x.calendarId || 'default')) && (
                              <div className="text-[10px] text-neutral-600">teilweise nur Lesen</div>
                            )}
                          </div>

                          {openPollEvents.length === 0 ? (
                            <div className="text-xs text-neutral-500">Keine offenen Abstimmungen.</div>
                          ) : openPollEvents.map(ev => {
                            const poll = ev.poll || {};
                            const voterIds = Array.isArray(poll.voterIds) ? poll.voterIds : [];
                            const tally = computePollTally(poll, voterIds);
                            const votesCount = tally.respondedCount;
                            const totalVoters = tally.totalVoters || voterIds.length;
                            const canFinalizeNow = !!tally.canFinalizeNow;
                            const winnerId = tally.winnerOptionId;
                            const deadlineLabel = tally.deadlineAt ? formatDeadlineShort(tally.deadlineAt) : '';
                            const myLegacyVote = (tally.version < 2) ? ((tally.votes || {})[user?.uid] || '') : '';
                            const myRow = (tally.version >= 2 && tally.votes && typeof tally.votes[user?.uid] === 'object') ? tally.votes[user?.uid] : {};
                            const myComplete = (tally.version < 2) ? !!myLegacyVote : ((poll.options || []).every(o => isPollState((myRow || {})[o.id])));
                            const canWrite = canWriteCalendar(ev.calendarId || 'default');

                            return (
                              <div key={ev.id} className="border border-neutral-800 rounded-xl p-3 mb-2 last:mb-0">
                                <div className="flex items-start justify-between gap-3">
                                  <button
                                    type="button"
                                    onClick={() => openEditEventModal(ev, null, { openPoll: true })}
                                    className="text-left min-w-0"
                                  >
                                    <div className="text-sm font-medium text-white truncate">{ev.title}</div>
                                    <div className="text-[11px] text-neutral-500">{votesCount}/{totalVoters || 'â€“'} Antworten</div>
                                    <div className="text-[10px] text-neutral-600 flex items-center gap-2 mt-1">
                                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: calendarTint(ev.calendarId || 'default') }} />
                                      <span className="truncate">{getCalendarById(ev.calendarId || 'default')?.name || 'Privat'}{canWrite ? '' : ' Â· nur Lesen'}</span>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditEventModal(ev, null, { openPoll: true })}
                                    className="px-2 py-1 rounded-lg border border-neutral-800 text-neutral-300 text-[11px] hover:border-neutral-500"
                                  >
                                    Ã–ffnen
                                  </button>
                                </div>

                                <div className="mt-2 space-y-2">
                                  {(poll.options || []).map(opt => {
                                    const t = (tally.byOptionId && tally.byOptionId[opt.id]) ? tally.byOptionId[opt.id] : { yes: 0, maybe: 0, no: 0, score: 0 };
                                    const isWinner = winnerId === opt.id;

                                    if (tally.version >= 2) {
                                      const myState = (myRow || {})[opt.id] || '';
                                      const baseBtn = 'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors';
                                      const onCls = 'bg-white text-black border-white';
                                      const offCls = 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-500';

                                      return (
                                        <div
                                          key={opt.id}
                                          className={"w-full border rounded-xl px-3 py-2 transition-colors " + (isWinner ? 'border-white bg-neutral-900' : 'border-neutral-800') + (!canWrite ? ' opacity-60' : '')}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs text-white">{opt.date} â€¢ {opt.time}{isWinner ? ' â­' : ''}</div>
                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                disabled={!canWrite || pollBusy}
                                                onClick={() => voteInPollForSpecificEvent(ev, opt.id, POLL_STATE.YES)}
                                                className={baseBtn + ' ' + (myState === POLL_STATE.YES ? onCls : offCls)}
                                                title="Fix"
                                              >
                                                âœ…
                                              </button>
                                              <button
                                                type="button"
                                                disabled={!canWrite || pollBusy}
                                                onClick={() => voteInPollForSpecificEvent(ev, opt.id, POLL_STATE.MAYBE)}
                                                className={baseBtn + ' ' + (myState === POLL_STATE.MAYBE ? onCls : offCls)}
                                                title="Kann"
                                              >
                                                ðŸ¤·
                                              </button>
                                              <button
                                                type="button"
                                                disabled={!canWrite || pollBusy}
                                                onClick={() => voteInPollForSpecificEvent(ev, opt.id, POLL_STATE.NO)}
                                                className={baseBtn + ' ' + (myState === POLL_STATE.NO ? onCls : offCls)}
                                                title="Nein"
                                              >
                                                âŒ
                                              </button>
                                            </div>
                                          </div>
                                          <div className="mt-1 text-[10px] text-neutral-500 tabular-nums">âœ…{t.yes} &nbsp; ðŸ¤·{t.maybe} &nbsp; âŒ{t.no}</div>
                                        </div>
                                      );
                                    }

                                    // Legacy (1.0)
                                    const voted = myLegacyVote === opt.id;
                                    const c = t.yes || 0;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        disabled={!canWrite || pollBusy}
                                        onClick={() => voteInPollForSpecificEvent(ev, opt.id)}
                                        className={"w-full text-left border rounded-xl px-3 py-2 transition-colors " + (voted ? 'border-white bg-neutral-900' : 'border-neutral-800 hover:border-neutral-500') + (!canWrite ? ' opacity-60 cursor-not-allowed' : '')}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="text-xs text-white">{opt.date} â€¢ {opt.time}</div>
                                          <div className="text-[10px] text-neutral-400">{c}</div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="mt-2 flex items-center justify-between">
                                  <div className="text-[11px] text-neutral-500">
                                    {myComplete ? 'Du: fertig âœ…' : 'Du: offen'}{deadlineLabel ? ` Â· Deadline: ${deadlineLabel}` : ''}
                                  </div>
                                  {canWrite && (
                                    <button
                                      type="button"
                                      disabled={!canFinalizeNow || pollBusy}
                                      onClick={() => finalizePollForSpecificEvent(ev)}
                                      className={"px-2 py-1 rounded-lg font-semibold text-[11px] " + ((!canFinalizeNow || pollBusy) ? 'bg-neutral-900 border border-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-white text-black')}
                                      title={canFinalizeNow ? 'Gewinner Ã¼bernehmen' : 'Warten bis alle fertig sind oder Deadline'}
                                    >
                                      Finalisieren
                                    </button>
                                  )}
                                </div>

                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-black border border-neutral-800 rounded-2xl p-3 max-h-72 overflow-y-auto">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold text-white">ðŸ’¬ Kommentare</div>
                            <div className="text-[10px] text-neutral-600">letzte</div>
                          </div>

                          {commentEvents.length === 0 ? (
                            <div className="text-xs text-neutral-500">Noch keine Kommentare in den sichtbaren Kalendern.</div>
                          ) : commentEvents.map(ev => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => openEditEventModal(ev, null, { openComments: true })}
                              className="w-full text-left border border-neutral-800 rounded-xl p-3 mb-2 last:mb-0 hover:border-neutral-500 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-white truncate">{ev.title}</div>
                                  <div className="text-[10px] text-neutral-600 flex items-center gap-2 mt-1">
                                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: calendarTint(ev.calendarId || 'default') }} />
                                    <span className="truncate">{getCalendarById(ev.calendarId || 'default')?.name || 'Privat'}</span>
                                  </div>
                                  <div className="text-[11px] text-neutral-500 truncate">{(ev.lastCommentByName || 'User') + ': ' + (ev.lastCommentText || '')}</div>
                                </div>
                                <div className="text-[10px] text-neutral-600 shrink-0">{ev.lastCommentAt ? new Date(ev.lastCommentAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

</div>
            )}



            {currentView === 'shopping' && (
              <div className="p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
                <div className="flex flex-col lg:flex-row gap-6">
                  <aside className="w-full lg:w-80 shrink-0 border border-neutral-800 rounded-2xl bg-neutral-950/40 p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-1">Einkauf</div>
                        <h2 className="text-xl font-semibold text-white">Einkaufslisten</h2>
                      </div>
                      <button onClick={() => { setShoppingListModalOpen(true); setPlusMenuOpen(false); }} className="px-3 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors">Neu</button>
                    </div>
                    <div className="space-y-2">
                      {shoppingLists.length === 0 ? (
                        <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-4">Noch keine Einkaufsliste vorhanden.</div>
                      ) : shoppingLists.map((list) => {
                        const bought = normalizeShoppingItems(list.items).filter((item) => item.done).length;
                        const total = normalizeShoppingItems(list.items).length;
                        return (
                          <button key={list.id} onClick={() => setActiveShoppingListId(list.id)} className={`w-full text-left rounded-2xl border p-4 transition-colors ${activeShoppingList?.id === list.id ? 'border-white bg-neutral-900' : 'border-neutral-800 hover:border-neutral-500 bg-black/40'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate">{list.title}</div>
                                <div className="text-xs text-neutral-500 mt-1">{list.store || 'Ohne Ort'} Â· {bought}/{total} gekauft</div>
                              </div>
                              <div className="text-[11px] text-neutral-400">{formatCurrencyCHF(calcShoppingListTotal(list, true))}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </aside>
                  <section className="flex-1 border border-neutral-800 rounded-2xl bg-neutral-950/40 p-4 md:p-6">
                    {!activeShoppingList ? (
                      <div className="h-full min-h-[22rem] flex items-center justify-center text-neutral-500 text-sm">Liste auswÃ¤hlen oder neue Einkaufsliste erstellen.</div>
                    ) : (
                      <>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-1">Aktive Liste</div>
                            <h3 className="text-2xl font-semibold text-white">{activeShoppingList.title}</h3>
                            <p className="text-sm text-neutral-500 mt-1">{activeShoppingList.store || 'Ohne Ort'} Â· {normalizeShoppingItems(activeShoppingList.items).length} Positionen</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <div className="px-3 py-2 rounded-xl border border-neutral-800 text-sm text-neutral-300">Offen {normalizeShoppingItems(activeShoppingList.items).filter((item) => !item.done).length}</div>
                            <div className="px-3 py-2 rounded-xl border border-neutral-800 text-sm text-neutral-300">Gekauft {formatCurrencyCHF(calcShoppingListTotal(activeShoppingList, true))}</div>
                            <button onClick={() => deleteShoppingList(activeShoppingList.id)} className="px-3 py-2 rounded-xl border border-red-900/60 text-sm text-red-300 hover:bg-red-950/40 transition-colors">Liste lÃ¶schen</button>
                          </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 mb-5">
                          <input value={shoppingQuickItem} onChange={(e) => setShoppingQuickItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addShoppingItem(activeShoppingList.id); }} placeholder="Artikel hinzufÃ¼gen, z. B. Milch" className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                          <button onClick={() => addShoppingItem(activeShoppingList.id)} className="px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-colors">HinzufÃ¼gen</button>
                        </div>
                        <div className="space-y-3">
                          {normalizeShoppingItems(activeShoppingList.items).length === 0 ? (
                            <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-4">Noch keine Artikel in dieser Liste.</div>
                          ) : normalizeShoppingItems(activeShoppingList.items).sort((a,b) => Number(a.done) - Number(b.done)).map((item) => (
                            <div key={item.id} className={`grid grid-cols-1 md:grid-cols-[auto,1fr,110px,120px,auto] gap-3 items-center rounded-2xl border p-3 transition-colors ${item.done ? 'border-neutral-800 bg-neutral-950/70' : 'border-neutral-800 bg-black/60'}`}>
                              <button onClick={() => toggleShoppingItem(activeShoppingList.id, item.id)} className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-colors ${item.done ? 'bg-white text-black border-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}><CheckSquare className="w-4 h-4" /></button>
                              <input value={item.text} onChange={(e) => updateShoppingItem(activeShoppingList.id, item.id, { text: e.target.value })} className={`bg-black border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-500 ${item.done ? 'line-through text-neutral-500 border-neutral-900' : 'text-white border-neutral-800'}`} />
                              <input value={item.qty} onChange={(e) => updateShoppingItem(activeShoppingList.id, item.id, { qty: e.target.value })} placeholder="Menge" className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                              <input value={item.price} onChange={(e) => updateShoppingItem(activeShoppingList.id, item.id, { price: e.target.value.replace(/[^0-9.,]/g, '') })} placeholder="Preis CHF" className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                              <button onClick={() => deleteShoppingItem(activeShoppingList.id, item.id)} className="h-10 w-10 rounded-xl border border-neutral-800 text-neutral-400 hover:border-red-700 hover:text-red-300 transition-colors flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </div>
            )}

            {currentView === 'extras' && (() => {
              const extraCards = [];
              const slotChrome = (key, title, subtitle, body, spanClass = '') => (
                <section
                  key={key}
                  draggable
                  onDragStart={() => setDraggedExtraSlot(key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!draggedExtraSlot || draggedExtraSlot === key) return;
                    setExtrasSlotOrder(prev => reorderExtraKeys(prev, draggedExtraSlot, key));
                    setDraggedExtraSlot('');
                    showToast('Reihenfolge gespeichert');
                  }}
                  onDragEnd={() => setDraggedExtraSlot('')}
                  className={`border border-neutral-800 rounded-2xl bg-neutral-950/40 p-4 md:p-5 space-y-4 ${spanClass} ${draggedExtraSlot === key ? 'ring-1 ring-white/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-2">{title}</div>
                      <div className="text-sm text-neutral-400">{subtitle}</div>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500 shrink-0">
                      <span className="text-[11px] hidden md:inline">ziehen zum Sortieren</span>
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                  {body}
                </section>
              );

              if (showExtrasSmartDay) {
                extraCards.push({ key: 'smartday', node: slotChrome('smartday', 'Smart Day', 'Tageskarte mit Termin, Wetter und freiem Fenster.', (
                  <>
                    <div className="text-xl md:text-2xl font-semibold text-white">{nextEventLabel}</div>
                    <div className="mt-1 text-sm text-neutral-400">{nextEventCountdownText} Â· {freeWindowText}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="px-3 py-2 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">NÃ¤chster Termin</div><div className="mt-1 text-sm font-medium text-neutral-100">{nextTimedEvent ? (nextTimedEvent.event.time || 'Heute') : 'Keiner mehr'}</div></div>
                      <div className="px-3 py-2 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Freies Fenster</div><div className="mt-1 text-sm font-medium text-neutral-100">{nextFreeBlock}</div></div>
                      <div className={`px-3 py-2 rounded-xl border ${weatherBadgeMeta.tone}`}><div className="text-[10px] uppercase tracking-widest text-current/70">Wetter-Hinweis</div><div className="mt-1 text-sm font-medium flex items-center gap-2"><span>{weatherBadgeMeta.icon}</span><span>{weatherBadgeMeta.text}</span></div></div>
                    </div>
                  </>
                ), 'xl:col-span-2')});
              }

              if (showExtrasWorkClock) {
                extraCards.push({ key: 'workclock', node: slotChrome('workclock', 'Stempeluhr', 'Start, Pause, Stopp, Rapport und letzte Sessions.', (
                  <>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="text-xl md:text-2xl font-semibold text-white flex items-center gap-2"><Timer className="w-5 h-5" /> {workClockActive?.startedAt ? formatDurationCompact(activeWorkMs) : 'Noch nicht gestartet'}</div>
                        <div className="mt-2 text-sm text-neutral-400">{workClockActive?.startedAt ? (workClockActive?.isPaused ? 'Pause aktiv â€“ Arbeitszeit steht' : 'Arbeitszeit lÃ¤uft') : 'Starte, pausiere und beende deine Arbeit von hier.'}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!workClockActive?.startedAt ? (
                          <button onClick={startWorkClock} className="px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"><Play className="w-4 h-4" /> Start</button>
                        ) : (
                          <>
                            <button onClick={toggleWorkClockPause} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm font-semibold hover:border-neutral-500 transition-colors flex items-center gap-2">{workClockActive?.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}{workClockActive?.isPaused ? 'Weiter' : 'Pause'}</button>
                            <button onClick={requestStopWorkClock} className="px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/40 text-red-200 text-sm font-semibold hover:bg-red-950/60 transition-colors flex items-center gap-2"><StopCircle className="w-4 h-4" /> Stopp</button>
                          </>
                        )}
                        <button onClick={exportWeekWorkClockCsv} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm font-semibold hover:border-neutral-500 transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> Woche</button>
                        <button onClick={exportMonthWorkClockCsv} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm font-semibold hover:border-neutral-500 transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> Monat</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Heute</div><div className="mt-1 text-sm font-medium text-neutral-100">{formatDurationVerbose(todayWorkMs)}</div></div>
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Woche</div><div className="mt-1 text-sm font-medium text-neutral-100">{formatDurationVerbose(weekWorkMs)}</div><div className="text-[11px] text-neutral-500 mt-1">Ã˜ {formatDurationVerbose(weekAvgMs)}</div></div>
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Monat</div><div className="mt-1 text-sm font-medium text-neutral-100">{formatDurationVerbose(monthWorkMs)}</div><div className="text-[11px] text-neutral-500 mt-1">{monthSessions.length + (activeWorkMs > 0 ? 1 : 0)} Sessionen</div></div>
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Belastung</div><div className="mt-1 text-sm font-medium text-neutral-100">{workLevelSummary.map(x => `${x.level[0].toUpperCase()}${x.level.slice(1)} ${x.count}`).join(' Â· ')}</div></div>
                    </div>
                    {(workClockSessions || []).length > 0 && (
                      <div className="space-y-2">
                        {(workClockSessions || []).slice(0, 4).map((s) => (
                          <div key={s.id} className="flex items-center justify-between gap-3 text-sm border border-neutral-800 rounded-xl px-3 py-2 bg-black">
                            <div className="min-w-0 flex-1">
                              <div className="text-neutral-100 truncate">{s.title || 'Arbeit'}</div>
                              <div className="text-[11px] text-neutral-500">{s.startedAt ? new Date(s.startedAt).toLocaleString('de-CH', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''} Â· {s.level || 'mittel'}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-neutral-300 font-medium shrink-0">{formatDurationVerbose(s.workMs || 0)}</div>
                              <button type="button" onClick={() => openEditWorkClockSession(s)} className="p-2 rounded-lg border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors" title="Bearbeiten"><Edit2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ), 'xl:col-span-2')});
              }

              if (showExtrasFocus) {
                extraCards.push({ key: 'focus', node: slotChrome('focus', 'Fokusmodus', '25/50/90-Minuten FokusblÃ¶cke mit Verlauf.', (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold text-white">{focusState?.startedAt ? formatDurationCompact(focusRemainingMs) : `${focusDurationMin} Min.`}</div>
                        <div className="mt-2 text-sm text-neutral-400">{focusState?.startedAt ? (focusState?.isPaused ? 'Fokus pausiert' : 'Konzentrierter Block lÃ¤uft') : 'Starte einen Fokusblock fÃ¼r ruhiges Arbeiten.'}</div>
                      </div>
                      <div className="px-3 py-2 rounded-xl border border-neutral-800 bg-black text-sm text-neutral-300">Heute {formatDurationVerbose(focusTodayMs)}</div>
                    </div>
                    <select value={String(focusDurationMin)} onChange={(e) => setFocusDurationMin(parseInt(e.target.value, 10) || 25)} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500">
                      <option value="25">25 Minuten</option>
                      <option value="50">50 Minuten</option>
                      <option value="90">90 Minuten</option>
                    </select>
                    <div className="flex flex-wrap gap-2">
                      {!focusState?.startedAt ? (
                        <button onClick={startFocusMode} className="px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"><Play className="w-4 h-4" /> Fokus starten</button>
                      ) : (
                        <>
                          <button onClick={toggleFocusPause} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm font-semibold hover:border-neutral-500 transition-colors flex items-center gap-2">{focusState?.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}{focusState?.isPaused ? 'Weiter' : 'Pause'}</button>
                          <button onClick={() => stopFocusMode(true)} className="px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors">Als Fokusblock speichern</button>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500">Letzte FokusblÃ¶cke: {(focusHistory || []).slice(0, 3).map((x) => `${formatDurationCompact(x.elapsedMs || 0)} am ${new Date(x.startedAt).toLocaleDateString('de-CH')}`).join(' Â· ') || 'Noch keine'}</div>
                  </>
                ))});
              }

              if (showExtrasWeek) {
                extraCards.push({ key: 'week', node: slotChrome('week', 'WochenÃ¼bersicht', 'Termine, Arbeit und nÃ¤chste FreiflÃ¤chen in einer Karte.', (
                  <>
                    <div className="text-xl font-semibold text-white">{weekEventCount} Termine Â· {formatDurationVerbose(weekWorkMs)} Arbeit</div>
                    <div className="mt-2 text-sm text-neutral-400">{nextFreeBlock} Â· {workLevelSummary.map(x => `${x.level}: ${x.count}`).join(' Â· ')}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Heute Termine</div><div className="mt-1 text-sm font-medium text-neutral-100">{todayEventCount}</div></div>
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Frei-Fenster</div><div className="mt-1 text-sm font-medium text-neutral-100">{nextFreeBlock}</div></div>
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Wetter</div><div className="mt-1 text-sm font-medium text-neutral-100">{weatherBadgeMeta.text}</div></div>
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Ã˜ pro Session</div><div className="mt-1 text-sm font-medium text-neutral-100">{formatDurationVerbose(weekAvgMs)}</div></div>
                    </div>
                  </>
                ))});
              }

              if (showExtrasFreeWindows) {
                extraCards.push({ key: 'freewindows', node: slotChrome('freewindows', 'Freie Zeitfenster', 'Zeigt die nÃ¤chsten freien BlÃ¶cke des heutigen Tages.', (
                  <div className="space-y-2">
                    {freeWindowsToday.map((slot, idx) => (
                      <div key={`${slot}_${idx}`} className="px-3 py-3 rounded-xl border border-neutral-800 bg-black flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-neutral-100">{slot}</div>
                          <div className="text-[11px] text-neutral-500">Ideal fÃ¼r Fokus, Aufgaben oder Pause</div>
                        </div>
                        <Clock className="w-4 h-4 text-neutral-500" />
                      </div>
                    ))}
                  </div>
                ))});
              }

              if (showExtrasGoals) {
                extraCards.push({ key: 'goals', node: slotChrome('goals', 'Tagesziele', 'Drei wichtige Ziele fÃ¼r heute â€“ mit Cloud-Sync.', (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xl font-semibold text-white">{completedGoals}/3 erledigt</div>
                      <button onClick={() => setDailyGoals(normalizeDailyGoals([]))} className="px-3 py-2 rounded-xl border border-neutral-800 text-xs text-neutral-300 hover:border-neutral-500 transition-colors">ZurÃ¼cksetzen</button>
                    </div>
                    <div className="space-y-3">
                      {normalizeDailyGoals(dailyGoals).slice(0, 3).map((goal, idx) => (
                        <div key={goal.id} className="flex items-center gap-3">
                          <button type="button" onClick={() => setDailyGoals(prev => normalizeDailyGoals(prev).map((item, i) => i === idx ? { ...item, done: !item.done } : item))} className={`p-2 rounded-lg border transition-colors ${goal.done ? 'bg-white text-black border-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}><CheckSquare className="w-4 h-4" /></button>
                          <input value={goal.text} onChange={(e) => setDailyGoals(prev => normalizeDailyGoals(prev).map((item, i) => i === idx ? { ...item, text: e.target.value } : item))} placeholder={`Ziel ${idx + 1}`} className="flex-1 bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                        </div>
                      ))}
                    </div>
                  </>
                ))});
              }

              if (showExtrasTimeBalance) {
                extraCards.push({ key: 'sollist', node: slotChrome('sollist', 'Soll-/Ist-Stunden', 'Wochenziel, Fortschritt und Differenz aus der Stempeluhr.', (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Soll</div><div className="mt-1 text-sm font-medium text-neutral-100">{weeklyTargetHours || '0'} h</div></div>
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Ist</div><div className="mt-1 text-sm font-medium text-neutral-100">{formatDurationVerbose(weekWorkMs)}</div></div>
                      <div className={`px-3 py-3 rounded-xl border bg-black ${weekDeltaMs >= 0 ? 'border-emerald-900/40 text-emerald-300' : 'border-amber-900/40 text-amber-300'}`}><div className="text-[10px] uppercase tracking-widest text-current/70">Differenz</div><div className="mt-1 text-sm font-medium">{`${weekDeltaMs >= 0 ? '+' : '-'}${formatDurationVerbose(Math.abs(weekDeltaMs))}`}</div></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2"><span>Wochenziel</span><span>{weekTargetPct}% erreicht</span></div>
                      <div className="h-2 rounded-full bg-black border border-neutral-800 overflow-hidden"><div className="h-full bg-white" style={{ width: `${weekTargetPct}%` }} /></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input value={weeklyTargetHours} onChange={(e) => setWeeklyTargetHours(e.target.value.replace(',', '.'))} placeholder="42" className="w-28 bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                      <span className="text-sm text-neutral-500">Stunden pro Woche</span>
                    </div>
                  </>
                ))});
              }

              if (showExtrasNotes) {
                extraCards.push({ key: 'notes', node: slotChrome('notes', 'Schnellnotizen', 'Mit Firebase-Sync â€“ dieselben Notizen auf allen GerÃ¤ten.', (
                  <>
                    <div className="text-sm text-neutral-400">Cloud-Sync aktiv. Ã„nderungen werden automatisch Ã¼bernommen.</div>
                    <textarea value={quickNotes} onChange={(e) => setQuickNotes(e.target.value)} rows={10} placeholder={`Heute
- ...

Morgen
- ...

SpÃ¤ter
- ...`} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                  </>
                ))});
              }

              if (showExtrasWeather) {
                extraCards.push({ key: 'weather', node: slotChrome('weather', 'Wetter-Planer', 'Wetter, Kleidung und bestes Zeitfenster im Blick.', (
                  <>
                    <div className="text-xl font-semibold text-white">{weatherBadgeMeta.icon} {weatherBadgeMeta.text}</div>
                    <div className="mt-2 text-sm text-neutral-400">{todayWeatherAdvice}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Beste Phase</div><div className="mt-1 text-sm font-medium text-neutral-100">{bestWeatherWindow}</div></div>
                      <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Kleidung</div><div className="mt-1 text-sm font-medium text-neutral-100">{todayWeatherAdvice.includes('Jacke') ? 'Jacke sinnvoll' : (todayWeatherAdvice.includes('Schirm') ? 'Schirm sinnvoll' : 'Leicht und trocken')}</div></div>
                    </div>
                  </>
                ))});
              }

              const cardMap = Object.fromEntries(extraCards.map((item) => [item.key, item.node]));
              const orderedKeys = normalizeExtrasOrder(extrasSlotOrder).filter((key) => cardMap[key]);
              const extraKeys = Object.keys(cardMap).filter((key) => !orderedKeys.includes(key));
              const finalKeys = [...orderedKeys, ...extraKeys];

              return (
                <div className="p-6 md:p-10 max-w-6xl w-full mx-auto animate-fade-in space-y-6">
                  <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                      <h2 className="text-3xl md:text-4xl font-light">Extras</h2>
                      <p className="text-sm text-neutral-500 mt-2">NÃ¼tzliche Werkzeuge getrennt von der Startseite â€“ jetzt zusÃ¤tzlich frei sortierbar per Drag & Drop.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="px-4 py-2 rounded-xl border border-neutral-800 text-sm text-neutral-300 hover:border-neutral-500 transition-colors flex items-center gap-2"
                        title={uiTheme === 'light' ? 'Zu Dunkel wechseln' : 'Zu Hell wechseln'}
                      >
                        {uiTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        {uiTheme === 'light' ? 'Dunkel' : 'Hell'}
                      </button>
                      <button onClick={() => setCurrentView('dashboard')} className="px-4 py-2 rounded-xl border border-neutral-800 text-sm text-neutral-300 hover:border-neutral-500 transition-colors">Zur Startseite</button>
                      <button onClick={() => setCurrentView('settings')} className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors">Extras einstellen</button>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {finalKeys.map((key) => cardMap[key])}
                  </div>
                </div>
              );
            })()}

            {currentView === 'settings' && (() => {
    const q = (settingsQuery || '').trim().toLowerCase();
    const match = (...keys) => {
      if (!q) return true;
      const all = keys.flat().filter(Boolean).map((x) => String(x).toLowerCase());
      return all.some((k) => k.includes(q));
    };
    const TABS = [
      { id: 'calendars', label: 'Kalender', subtitle: 'Farben, Freigaben und Schichtplaene', icon: CalendarIcon, keys: ['kalender', 'schicht', 'farbe', 'freigabe', 'teilen', 'share', 'busy'] },
      { id: 'notifications', label: 'Extras', subtitle: 'Module, Erinnerungen und Push', icon: Activity, keys: ['extras', 'smart day', 'stempelung', 'fokus', 'notiz', 'push', 'benachr', 'reminder', 'erinnerung', 'ton', 'pwa', 'token'] },
      { id: 'links', label: 'Public Links', subtitle: 'Busy-only Links und Ablauf', icon: Link2, keys: ['link', 'busy', 'public', 'passcode', 'ablauf', 'magic'] },
      { id: 'audit', label: 'Audit', subtitle: 'Aktionsprotokoll und Kalenderhistorie', icon: History, keys: ['audit', 'verlauf', 'log', 'aenderung', 'wer'] },
      { id: 'account', label: 'Account', subtitle: 'Profil, Passwort und Datenschutz', icon: User, keys: ['account', 'datenschutz', 'abmelden', 'email'] },
      { id: 'ics', label: 'Import/Export', subtitle: 'ICS Export und Import', icon: Download, keys: ['ics', 'import', 'export', 'download', 'upload'] },
    ];
    const visibleTabs = q ? TABS.filter((t) => match(t.keys)) : TABS;
    const activeTab = TABS.find((t) => t.id === settingsTab) || TABS[0];
    const enabledExtraCount = ['extrasEnabled', 'smartDayEnabled', 'focusModeEnabled', 'weeklyOverviewEnabled', 'freeWindowsEnabled', 'dailyGoalsEnabled', 'timeBalanceEnabled', 'quickNotesEnabled', 'weatherPlannerEnabled', 'workClockEnabled']
      .filter((field) => isExtraFieldEnabled(field))
      .length;

    const AccordionItem = ({ id, label, icon: Icon, keys, children }) => {
      const visible = !q || match(keys);
      if (!visible) return null;
      const open = q ? true : (settingsTab === id);
      const toggle = () => {
        if (q) return;
        setSettingsTab((prev) => (prev === id ? '' : id));
      };
      return (
        <section className="settings-section rounded-2xl border border-neutral-800 bg-neutral-950/60 shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <button type="button" onClick={toggle} className="settings-section-trigger w-full px-5 py-4 border-b border-neutral-900/80 flex items-center justify-between hover:bg-neutral-900/40 transition-colors">
            <div className="flex items-center gap-3">
              {Icon ? <Icon className="w-4 h-4 text-neutral-400" /> : null}
              <span className="text-sm font-semibold text-white">{label}</span>
            </div>
            <ChevronRight className={"w-4 h-4 text-neutral-500 transition-transform " + (open ? 'rotate-90' : '')} />
          </button>
          {open && (
            <div className="settings-section-body px-5 py-4">
              {children}
            </div>
          )}
        </section>
      );
    };

    return (
      <div className="settings-pro p-5 md:p-8 xl:p-10 max-w-7xl mx-auto w-full animate-fade-in space-y-6">
        <section className="settings-hero rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-950 via-black to-neutral-950 p-5 md:p-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl md:text-4xl font-light">Einstellungen</h2>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-3 py-2 rounded-xl border border-neutral-800 bg-black/60 text-neutral-200 hover:border-neutral-500 transition-colors flex items-center gap-2 text-xs"
                  title={uiTheme === 'light' ? 'Zu Dunkel wechseln' : 'Zu Hell wechseln'}
                >
                  {uiTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span>{uiTheme === 'light' ? 'Dunkel' : 'Hell'}</span>
                </button>
              </div>
              <p className="mt-2 text-sm text-neutral-400">Alle Einstellungen zentral, klar gruppiert und direkt durchsuchbar.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="px-3 py-2 rounded-xl border border-neutral-800 bg-black/40"><div className="text-neutral-500 uppercase tracking-widest">Tab</div><div className="text-neutral-200 mt-1">{activeTab?.label || 'Kalender'}</div></div>
              <div className="px-3 py-2 rounded-xl border border-neutral-800 bg-black/40"><div className="text-neutral-500 uppercase tracking-widest">Extras aktiv</div><div className="text-neutral-200 mt-1">{enabledExtraCount}</div></div>
              <div className="px-3 py-2 rounded-xl border border-neutral-800 bg-black/40"><div className="text-neutral-500 uppercase tracking-widest">Push</div><div className="text-neutral-200 mt-1">{isStandalone ? 'PWA' : 'Browser'}</div></div>
              <div className="px-3 py-2 rounded-xl border border-neutral-800 bg-black/40"><div className="text-neutral-500 uppercase tracking-widest">Suche</div><div className="text-neutral-200 mt-1">{q ? 'aktiv' : 'aus'}</div></div>
            </div>
          </div>
            <div className="mt-4 relative max-w-xl">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={settingsQuery}
                onChange={(e) => setSettingsQuery(e.target.value)}
                placeholder="Einstellungen suchen..."
                className="settings-search-input w-full bg-black border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            {!!settingsQuery && (
              <button type="button" onClick={() => setSettingsQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-white" title="Zuruecksetzen">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        <div className="lg:hidden overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex gap-2 min-w-max">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = settingsTab === t.id && !q;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSettingsTab(t.id); setSettingsQuery(''); }}
                  className={"settings-tab-pill px-3 py-2 rounded-xl border text-xs flex items-center gap-2 " + (active ? "bg-white text-black border-white" : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-600")}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] gap-6 xl:gap-8 items-start">
          <aside className="settings-nav-wrap hidden lg:block sticky top-6 self-start space-y-3">
            <div className="settings-nav bg-neutral-950/60 border border-neutral-800 rounded-2xl p-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = settingsTab === t.id && !q;
                const disabledBySearch = q && !match(t.keys);
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSettingsTab(t.id); setSettingsQuery(''); }}
                    className={
                      "settings-nav-item w-full text-left px-3 py-3 rounded-xl transition-colors " +
                      (active ? "bg-white text-black" : "text-neutral-200 hover:bg-neutral-900") +
                      (disabledBySearch ? " opacity-50" : "")
                    }
                    title={disabledBySearch ? "Nicht im Suchresultat" : ""}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{t.label}</div>
                        <div className={"text-[11px] truncate " + (active ? "text-black/70" : "text-neutral-500")}>{t.subtitle}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/40 p-3 text-[11px] text-neutral-500 leading-relaxed">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                <span>Server-Push-Test benoetigt Firestore-Zugriff (kein Shield/Adblock).</span>
              </div>
            </div>
          </aside>

          <main className="space-y-4 min-w-0">
            {/* KALENDER VERWALTUNG */}
            <AccordionItem id="calendars" label="Kalender" icon={CalendarIcon} keys={['kalender','schicht','farbe','privat','freigabe','teilen','share','busy']} >
              <section id="settings-calendars">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-4">
                  <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" /> Meine Kalender & Schichten
                  </h3>
                  <button onClick={() => { setCalForm({ id: null, name: '', type: 'normal', color: PASTEL_COLORS[(Date.now() % PASTEL_COLORS.length)], shifts: [] }); setIsCalManageModalOpen(true); }} className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-gray-200 transition-colors">+ Neu</button>
                </div>

                <div className="space-y-3">
                  <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-white flex items-center gap-2">Privat <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full uppercase">Standard</span></p>
                      <p className="text-xs text-neutral-500 mt-1">Dein persÃ¶nlicher Standard-Kalender.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Farbe</span>
                      <input
                        type="color"
                        value={((userProfile && typeof userProfile?.defaultCalendarColor === 'string' && userProfile?.defaultCalendarColor) ? userProfile?.defaultCalendarColor : '#ffffff')}
                        onChange={async (e) => {
                          try {
                            const v = e.target.value;
                            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { defaultCalendarColor: v }, { merge: true });
                            showToast('Gespeichert');
                          } catch(_) { showToast('Fehler'); }
                        }}
                        className="w-10 h-10 rounded-lg bg-transparent border border-neutral-800"
                        title="Farbe Privat"
                      />

                      <button
                        type="button"
                        onClick={() => openShareLinkModalForCalendar({ id: 'default', name: 'Privat' })}
                        className="p-2 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                        title="Public Busyâ€‘Only Link"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {(customCalendars || []).filter(Boolean).filter(c => c?.ownerId === user?.uid).map(cal => (
                    <div key={cal.id} className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">{cal.name} {cal.type==='shift' && <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-900/50 px-2 py-0.5 rounded-full uppercase">Schichtplan</span>}</p>
                        <p className="text-xs text-neutral-500 mt-1">Freigegeben fÃ¼r: {Object.keys(cal.sharedWith || {}).length} Nutzer</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openShareLinkModalForCalendar(cal)} className="p-2 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors" title="Public Busyâ€‘Only Link"><Lock className="w-4 h-4"/></button>
                        <button onClick={() => { setShareCalData(cal); setIsShareCalModalOpen(true); }} className="p-2 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><Share2 className="w-4 h-4"/></button>
                        <button onClick={() => { setCalForm({ ...cal, color: (cal.color || calendarTint(cal.id)) }); setIsCalManageModalOpen(true); }} className="p-2 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><Settings className="w-4 h-4"/></button>
                        <button onClick={() => deleteCalendar(cal.id)} className="p-2 border border-red-900/30 bg-red-900/10 rounded-lg text-red-500 hover:bg-red-900/30 transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
                  {(customCalendars || []).filter(Boolean).filter(c => c?.ownerId !== user?.uid).map(cal => (
                    <div key={cal.id} className="bg-black border border-neutral-800 rounded-xl p-4 flex items-center justify-between opacity-80">
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">{cal.name} <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full uppercase">Geteilt mit dir</span></p>
                        <p className="text-xs text-neutral-500 mt-1">Rechte: {cal.sharedWith[user?.uid] === 'write' ? 'Lesen & Schreiben' : 'Nur Lesen'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </AccordionItem>

            {/* EXTRAS */}
            <AccordionItem id="notifications" label="Extras" icon={Activity} keys={['extras','smart day','stempelung','fokus','notiz','tagesziel','soll ist','freie zeitfenster','push','benachr','erinnerung','pwa','token','test']} >
              <section id="settings-notifications">
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Extras
                </h3>

                {/* Core settings */}
                <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5 space-y-3">
                  {[
                    ['basics', 'Grundmodule', [
                      ['extrasEnabled','Extras-Bereich','Blendet den neuen Extras-Tab ein und aus.'],
                      ['smartDayEnabled','Smart Day in Extras','Detaillierte Tageskarte im Extras-Bereich.'],
                      ['focusModeEnabled','Fokusmodus','25/50/90-Minuten Fokusblöcke in Extras.'],
                      ['weeklyOverviewEnabled','Wochenübersicht','Arbeitszeit, Termine und freie Fenster bündeln.'],
                      ['freeWindowsEnabled','Freie Zeitfenster','Eigene Karte mit freien Blöcken des Tages.'],
                    ]],
                    ['home', 'Startseite', [
                      ['smartDayHomeEnabled','Smart Day auf Home','Kompakte Karte auf der Startseite.'],
                      ['workClockHomeEnabled','Stempeluhr auf Home','Nur kompakte Stempeluhr-Zeile auf Home.'],
                    ]],
                    ['planning', 'Planung & Ziele', [
                      ['dailyGoalsEnabled','Tagesziele','Drei Tagesziele mit Häkchen und Cloud-Sync.'],
                      ['timeBalanceEnabled','Soll-/Ist-Stunden','Wochenziel gegen echte Arbeitszeit vergleichen.'],
                    ]],
                    ['notes', 'Notizen & Wetter', [
                      ['quickNotesEnabled','Schnellnotizen','Mit Firebase-Sync auf allen Geräten verfügbar.'],
                      ['weatherPlannerEnabled','Wetter-Planer','Zusätzliche Wetter-/Kleidungs-Hinweise in Extras.'],
                    ]],
                  ].map(([groupKey, groupLabel, fields]) => (
                    <div key={groupKey} className="border border-neutral-800 rounded-xl bg-black">
                      <button
                        type="button"
                        onClick={() => toggleExtrasSection(groupKey)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left"
                      >
                        <span className="text-sm font-medium text-white">{groupLabel}</span>
                        <ChevronDown className={"w-4 h-4 text-neutral-500 transition-transform " + (extrasSectionsOpen?.[groupKey] ? 'rotate-180' : '')} />
                      </button>
                      {extrasSectionsOpen?.[groupKey] && (
                        <div className="px-4 pb-4 space-y-3">
                          {fields.map(([field, label, desc]) => (
                            <div key={field} className="border border-neutral-800 rounded-xl bg-neutral-950/60 p-4 flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-white">{label}</p>
                                <p className="text-xs text-neutral-500 mt-1">{desc}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => saveExtraFieldToggle(field)}
                                className={"px-3 py-2 rounded-xl text-xs font-semibold border transition-colors " + (isExtraFieldEnabled(field) ? 'bg-white text-black border-white' : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-600')}
                              >
                                {isExtraFieldEnabled(field) ? 'Aktiv' : 'Aus'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="border border-neutral-800 rounded-xl bg-black p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">Push & Erinnerungen</p>
                        <p className="text-xs text-neutral-500 mt-1">Ehemaliger Benachrichtigungsbereich â€“ liegt jetzt gesammelt unter Extras. Notizen, Tagesziele und Reihenfolge der Karten werden ebenfalls synchronisiert.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">Kalender-Erinnerungen</p>
                      <p className="text-xs text-neutral-500 mt-1">Standard-Erinnerung gilt fÃ¼r neue Termine (und fÃ¼r Termine mit â€žStandardâ€œ). Pro Termin kannst du es im Termin-Modal Ã¼berschreiben.</p>
                    </div>
                    <div className="flex gap-2">
                      {!isStandalone && canInstallPwa && (
                        <button
                          type="button"
                          onClick={() => { try { promptInstallPwa(); } catch(e) {} }}
                          className="px-4 py-2 bg-white text-black rounded-md text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Installieren
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!isStandalone}
                        onClick={() => { try { requestNotificationPermission(user); } catch(e) {} }}
                        className={"px-4 py-2 rounded-md text-sm transition-colors " + (isStandalone ? "bg-neutral-900 border border-neutral-800 hover:text-white" : "bg-neutral-950 border border-neutral-900 text-neutral-600 cursor-not-allowed")}
                        title={isStandalone ? "Benachrichtigungen aktivieren" : (isIosUA ? "iPhone/iPad: Teilen â†’ Zum Home-Bildschirm" : "Bitte zuerst installieren")}
                      >
                        Erlauben
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Standard-Erinnerung</label>
                      <select
                        value={(() => {
                          const v = (userProfile && typeof userProfile?.defaultReminderMinutes === 'number') ? String(userProfile?.defaultReminderMinutes) : 'none';
                          return v;
                        })()}
                        onChange={async (e) => {
                          try {
                            const v = e.target.value;
                            const next = (v === 'none') ? null : (parseInt(v, 10) || 0);
                            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { defaultReminderMinutes: next }, { merge: true });
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

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Benachrichtigungston</label>
                      <select
                        value={(() => {
                          const v = (userProfile && userProfile?.notificationSoundMode) ? String(userProfile?.notificationSoundMode) : 'system';
                          return (v === 'silent') ? 'silent' : 'system';
                        })()}
                        onChange={async (e) => {
                          try {
                            const v = e.target.value;
                            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { notificationSoundMode: v }, { merge: true });
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
                      <p className="mt-2 text-[11px] text-neutral-500">In der PWA ist kein eigener Klingelton mÃ¶glich â€“ du kannst nur Systemton nutzen oder stumm schalten.</p>
                    </div>
                  </div>

                  <div className="border border-neutral-800 rounded-xl bg-black p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-white flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Wochenziel & Extras-Reihenfolge</p>
                        <p className="text-xs text-neutral-500 mt-1">Definiert dein Soll pro Woche. Im Extras-Bereich kannst du die Karten direkt per Drag & Drop verschieben.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Wochenziel in Stunden</label>
                        <input value={weeklyTargetHours} onChange={(e) => setWeeklyTargetHours(e.target.value.replace(',', '.'))} placeholder="42" className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={() => { setExtrasSlotOrder(normalizeExtrasOrder(DEFAULT_EXTRAS_ORDER)); showToast('Extras-Reihenfolge zurÃ¼ckgesetzt'); }} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm font-semibold hover:border-neutral-500 transition-colors">Reihenfolge zurÃ¼cksetzen</button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-neutral-800 rounded-xl bg-black p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-white flex items-center gap-2"><Briefcase className="w-4 h-4" /> Stempelung</p>
                        <p className="text-xs text-neutral-500 mt-1">Aktiviert die Stempeluhr im Extras-Bereich. Optional kann sie zusÃ¤tzlich kompakt auf der Startseite erscheinen.</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const next = !(userProfile?.workClockEnabled === true);
                            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { workClockEnabled: next, updatedAt: Date.now() }, { merge: true });
                            setUserProfile(prev => ({ ...(prev || {}), workClockEnabled: next }));
                            showToast(next ? 'Stempelung aktiviert' : 'Stempelung deaktiviert');
                          } catch (_) { showToast('Fehler'); }
                        }}
                        className={"px-3 py-2 rounded-xl text-xs font-semibold border transition-colors " + ((userProfile?.workClockEnabled === true) ? 'bg-white text-black border-white' : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-600')}
                      >
                        {(userProfile?.workClockEnabled === true) ? 'Aktiv' : 'Aus'}
                      </button>
                    </div>

                    {(userProfile?.workClockEnabled === true) && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-neutral-950/40">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Heute</div>
                            <div className="mt-1 text-sm font-medium text-neutral-100">{formatDurationVerbose(todayWorkMs)}</div>
                          </div>
                          <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-neutral-950/40">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Diese Woche</div>
                            <div className="mt-1 text-sm font-medium text-neutral-100">{formatDurationVerbose(weekWorkMs)}</div>
                          </div>
                          <div className="px-3 py-3 rounded-xl border border-neutral-800 bg-neutral-950/40">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Dieser Monat</div>
                            <div className="mt-1 text-sm font-medium text-neutral-100">{formatDurationVerbose(monthWorkMs)}</div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">TÃ¤tigkeiten im Dropdown</label>
                          <textarea
                            value={workClockPresetInput}
                            onChange={(e) => setWorkClockPresetInput(e.target.value)}
                            rows={4}
                            placeholder={"BÃ¼ro\nBaustelle\nSupport"}
                            className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const nextPresets = normalizeWorkClockPresets(workClockPresetInput);
                                  setWorkClockPresetInput(nextPresets.join('\n'));
                                  await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user?.uid), { workClockTaskOptions: nextPresets, updatedAt: Date.now() }, { merge: true });
                                  setUserProfile(prev => ({ ...(prev || {}), workClockTaskOptions: nextPresets }));
                                  showToast('Dropdown gespeichert');
                                } catch (_) { showToast('Fehler'); }
                              }}
                              className="px-3 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors"
                            >
                              Dropdown speichern
                            </button>
                            <span className="text-[11px] text-neutral-500">Eine TÃ¤tigkeit pro Zeile. Diese Auswahl erscheint beim Stopp der Stempelung.</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>


                  <div className="border border-neutral-800 rounded-xl bg-black p-4">
                    <button
                      type="button"
                      onClick={() => setDiagTestsOpen(v => !v)}
                      className="w-full flex items-center justify-between gap-3 text-xs text-neutral-300 font-semibold"
                      aria-expanded={diagTestsOpen ? 'true' : 'false'}
                    >
                      <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Diagnostik & Tests</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${diagTestsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {diagTestsOpen && (
                    <div className="mt-3 space-y-3">
                      <div className="text-[11px] text-neutral-600">
                        Status: <span className="text-neutral-300">{('Notification' in window) ? (Notification.permission || 'default') : 'nicht unterstuetzt'}</span>
                      </div>

                      <div className="text-[11px] text-neutral-600">
                        Service Worker: <span className="text-neutral-300">{pushDiag.sw}</span>{pushDiag.controlling ? <span className="text-neutral-500"> · controlling ✅</span> : <span className="text-neutral-500"> · not controlling</span>}
                      </div>

                      <div className="text-[11px] text-neutral-600">
                        Web Token: <span className="text-neutral-300">{(userProfile && userProfile?.fcmTokenWeb) ? 'vorhanden ✅' : 'nicht gesetzt'}</span>
                      </div>

                      <div className="text-[11px] text-neutral-600">
                        Letzter Push-Empfang: <span className="text-neutral-300">{pushDiag.lastReceivedAt ? `${new Date(pushDiag.lastReceivedAt).toLocaleString()}${pushDiag.lastReceivedTitle ? ` · ${pushDiag.lastReceivedTitle}` : ''}` : '—'}</span>
                      </div>

                      {!!pushTest?.id && (
                        <div className="text-[11px] text-neutral-600 break-words">
                          Server-Test Status: <span className="text-neutral-300">{pushTest.status || 'pending'}</span>
                          {pushTest.lastError ? <span className="text-amber-400"> · {pushTest.lastError}</span> : null}
                        </div>
                      )}

                      {!isStandalone && (
                        <div className="text-[11px] text-amber-400">
                          {isIosUA ? 'iPhone/iPad: Teilen → „Zum Home-Bildschirm“ installieren.' : 'Bitte installieren, dann „Erlauben“. '}
                        </div>
                      )}

                      {!!(pushDiag && pushDiag.lastError) && (
                        <div className="text-[11px] text-amber-400 break-words">
                          Push-Fehler: {String(pushDiag.lastError)}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { try { sendLocalPushTest(); } catch(_) {} }}
                          className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-xs hover:border-neutral-500"
                        >
                          Test (lokal)
                        </button>
                        <button
                          type="button"
                          onClick={() => { try { sendServerPushTest(); } catch(_) {} }}
                          className="px-3 py-2 bg-white text-black rounded-md text-xs font-semibold hover:bg-gray-200"
                        >
                          Test (Server)
                        </button>
                      </div>

                      <div className="text-[11px] text-neutral-600 leading-relaxed">
                        Hinweis: Wenn "Test (Server)" sofort fehlschlaegt, ist meist Firestore geblockt (Opera Shield / Adblock) oder Rules erlauben <span className="text-neutral-300">public/data/pushTests:create</span>.
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </section>
            </AccordionItem>

            {/* PUBLIC LINKS */}
            <AccordionItem id="links" label="Public Links" icon={Link2} keys={['public','link','busy','passcode','magic','ablauf']} >
              <section id="settings-links">
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Public Links
                </h3>

                <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5">
                  
<div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
  <div className="flex-1 min-w-0">
    <div className="text-sm text-white font-medium">Busyâ€‘Only Links</div>
    <div className="text-[11px] text-neutral-500 mt-1">Externe sehen nur belegte ZeitblÃ¶cke (keine Titel/Orte). Optional mit Ablauf & Passcode.</div>
  </div>
  <div className="flex flex-col sm:flex-row gap-2">
    <select
      value={settingsShareCalId}
      onChange={(e) => setSettingsShareCalId(e.target.value)}
      className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
      title="Kalender auswÃ¤hlen"
    >
      <option value="default">Privat</option>
      {(customCalendars || []).filter(Boolean).filter(c => c?.ownerId === user?.uid).map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
    <button
      type="button"
      onClick={() => {
        const cal = (settingsShareCalId === 'default')
          ? { id: 'default', name: 'Privat' }
          : (customCalendars || []).find(c => c.id === settingsShareCalId) || { id: 'default', name: 'Privat' };
        openShareLinkModalForCalendar(cal);
      }}
      className="px-3 py-2 bg-white text-black rounded-lg text-xs font-semibold hover:bg-gray-200"
    >
      Link erstellen
    </button>
  </div>
</div>

{(() => {
  const now = Date.now();
  const all = Array.isArray(shareLinks) ? shareLinks.slice() : [];
  const notRevoked = all.filter(l => l && !l.revokedAtMs);
  notRevoked.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

  const active = notRevoked.filter(l => !l.expiresAtMs || now <= l.expiresAtMs);
  const expired = notRevoked.filter(l => l.expiresAtMs && now > l.expiresAtMs);

  const renderItem = (l) => {
    const url = makeShareUrl(l.id);
    const exp = l.expiresAtMs ? new Date(l.expiresAtMs).toLocaleDateString('de-CH') : 'â€”';
    const calName = (l.calName || (l.calId === 'default' ? 'Privat' : (customCalendars || []).find(c => c.id === l.calId)?.name) || 'Kalender');
    const prot = (l.protection || 'magic');
    const protLabel = prot === 'passcode' ? 'Passcode' : (prot === 'none' ? 'Ohne' : 'Magicâ€‘Link');
    return (
      <div key={l.id} className="flex items-center justify-between bg-black border border-neutral-800 rounded-xl px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">
            {l.kind === 'event' ? 'Event' : 'Kalender'} â€¢ {calName}
          </div>
          <div className="mt-0.5 text-[11px] text-neutral-500">
            Ablauf: {exp} Â· Schutz: {protLabel}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { try { navigator.clipboard?.writeText(url); showToast('Kopiert'); } catch (_) {} }}
            className="p-2 border border-neutral-800 rounded-lg text-neutral-300 hover:bg-neutral-900"
            title="Kopieren"
          >
            <Copy className="w-4 h-4"/>
          </button>
          <button
            type="button"
            onClick={() => revokeShareLink(l.id)}
            className="p-2 border border-red-900/30 bg-red-900/10 rounded-lg text-red-500 hover:bg-red-900/30 transition-colors"
            title="Widerrufen"
          >
            <Trash2 className="w-4 h-4"/>
          </button>
        </div>
      </div>
    );
  };

  if (active.length === 0 && expired.length === 0) {
    return (
      <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-4 text-center">
        Noch keine Links. Erstelle einen Link Ã¼ber <span className="text-neutral-300">Link erstellen</span> oder das <span className="text-neutral-300">ðŸ”’</span> Icon am Kalender.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {active.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-600 font-semibold mb-2">Aktiv</div>
          <div className="space-y-2">{active.slice(0, 40).map(renderItem)}</div>
        </div>
      )}

      {expired.length > 0 && (
        <details className="border border-neutral-800 rounded-xl bg-black p-4">
          <summary className="cursor-pointer text-xs text-neutral-400 font-semibold select-none">Abgelaufen ({expired.length})</summary>
          <div className="mt-3 space-y-2">{expired.slice(0, 40).map(renderItem)}</div>
        </details>
      )}
    </div>
  );
})()}</div>
              </section>
            </AccordionItem>

            {/* AUDIT LOG */}
            <AccordionItem id="audit" label="Audit" icon={History} keys={['audit','log','verlauf','Ã¤nderung','wer']} >
              <section id="settings-audit">
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <History className="w-4 h-4" /> Audit Log
                </h3>

                <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5">
                  {/* Reuse existing audit UI by rendering the original section content via IIFE */}
                  {(() => (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-neutral-400 mb-2 font-semibold">Meine Aktionen</div>
                        {(auditEntries || []).length === 0 ? (
                          <div className="text-sm text-neutral-500">Noch keine EintrÃ¤ge.</div>
                        ) : (
                          <div className="space-y-2 max-h-[34vh] overflow-y-auto no-scrollbar pr-1">
                            {(auditEntries || []).slice(0, 50).map(a => (
                              <div key={a.id} className="border border-neutral-800 rounded-xl p-3 bg-black">
                                <div className="text-xs text-neutral-300">{a.summary || a.action}</div>
                                <div className="mt-1 text-[10px] text-neutral-600 tabular-nums">{a.tsMs ? new Date(a.tsMs).toLocaleString('de-CH') : ''}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-neutral-800 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs text-neutral-400 font-semibold">Kalenderâ€‘Audit</div>
                          <select
                            value={auditCalId || 'default'}
                            onChange={(e) => setAuditCalId(e.target.value)}
                            className="bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                          >
                            <option value="default">Privat (nur â€žMeine Aktionenâ€œ)</option>
                            {(customCalendars || []).filter(Boolean).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-3">
                          {auditCalId === 'default' ? (
                            <div className="text-sm text-neutral-500">Privat hat kein zentrales Kalenderâ€‘Audit (siehe â€žMeine Aktionenâ€œ).</div>
                          ) : (auditCalEntries || []).length === 0 ? (
                            <div className="text-sm text-neutral-500">Noch keine EintrÃ¤ge.</div>
                          ) : (
                            <div className="space-y-2 max-h-[34vh] overflow-y-auto no-scrollbar pr-1">
                              {(auditCalEntries || []).slice(0, 50).map(a => (
                                <div key={a.id} className="border border-neutral-800 rounded-xl p-3 bg-black">
                                  <div className="text-xs text-neutral-300">{a.summary || a.action}</div>
                                  <div className="mt-1 text-[10px] text-neutral-600 tabular-nums">{a.tsMs ? new Date(a.tsMs).toLocaleString('de-CH') : ''} Â· {a.uid ? (getProfile(a.uid)?.username || shortId(a.uid, 6)) : ''}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))()}
                </div>
              </section>
            </AccordionItem>

            {/* ACCOUNT */}
            <AccordionItem id="account" label="Account" icon={User} keys={['account','datenschutz','abmelden','email']} >
              <section id="settings-account">
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <User className="w-4 h-4" /> Datenschutz & Account
                </h3>
                <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="font-medium text-white">Angemeldet als: {user?.email}</p>

                    {userProfile && (
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-neutral-400">Name: {userProfile?.displayName || userProfile?.username}</p>

                        <div className="flex items-center gap-2">
                          <p className="text-sm text-neutral-400">Alias: <span className="font-mono text-neutral-200">{userProfile?.username}</span></p>
                          <button
                            type="button"
                            onClick={() => { setAliasDraft(userProfile?.username || ''); setAliasEditError(''); setAliasEditOpen(true); }}
                            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                            title="Alias Ã¤ndern"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>

                        {aliasEditOpen && (
                          <div className="mt-3 border border-neutral-800 rounded-xl p-3 bg-black space-y-2">
                            <div className="text-xs text-neutral-500">Alias Ã¤ndern (2â€“20 Zeichen). Erlaubt: aâ€“z, 0â€“9, <span className="font-mono">._-</span>. Leerzeichen â†’ <span className="font-mono">_</span>.</div>
                            <input
                              value={aliasDraft}
                              onChange={(e) => { setAliasDraft(e.target.value); setAliasEditError(''); }}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-neutral-500"
                              placeholder="dein_alias"
                              maxLength={40}
                              autoFocus
                            />
                            {aliasEditError ? <div className="text-xs text-red-400">{aliasEditError}</div> : null}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => persistAliasUsername(aliasDraft)}
                                disabled={aliasSaving}
                                className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200 disabled:opacity-60"
                              >
                                {aliasSaving ? 'Speichernâ€¦' : 'Speichern'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAliasEditOpen(false); setAliasEditError(''); }}
                                className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 hover:bg-neutral-800"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={handleLogout} className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm hover:text-white transition-colors">Abmelden</button>
                </div>
              
                <div className="mt-4 bg-neutral-950/50 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">Passwort</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {hasPasswordProvider()
                          ? 'Passwort Ã¤ndern (mit aktuellem Passwort bestÃ¤tigen).'
                          : 'Dieses Konto nutzt keinen Passwortâ€‘Login. Du kannst dir eine Resetâ€‘Mail senden, um ein Passwort zu setzen/Ã¤ndern.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasPasswordProvider() && (
                        <button
                          type="button"
                          onClick={() => { setPwEditOpen(v => !v); setPwError(''); setPwResetSent(false); }}
                          className={"px-3 py-2 rounded-md text-xs font-semibold border transition-colors " + (pwEditOpen ? "bg-white text-black border-white hover:bg-gray-200" : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800")}
                        >
                          {pwEditOpen ? 'SchlieÃŸen' : 'Ã„ndern'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => doSendPasswordReset()}
                        className="px-3 py-2 rounded-md text-xs font-semibold bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800"
                        title="Resetâ€‘Mail senden"
                      >
                        Resetâ€‘Mail
                      </button>
                    </div>
                  </div>

                  {pwResetSent && (
                    <div className="mt-3 text-xs text-neutral-300">Resetâ€‘Mail gesendet âœ…</div>
                  )}

                  {hasPasswordProvider() && pwEditOpen && (
                    <div className="mt-4 space-y-3">
                      <input
                        type="password"
                        value={pwCurrent}
                        onChange={(e) => { setPwCurrent(e.target.value); setPwError(''); }}
                        placeholder="Aktuelles Passwort"
                        className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                        autoComplete="current-password"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="password"
                          value={pwNew}
                          onChange={(e) => { setPwNew(e.target.value); setPwError(''); }}
                          placeholder="Neues Passwort (min. 6)"
                          className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                          autoComplete="new-password"
                        />
                        <input
                          type="password"
                          value={pwNew2}
                          onChange={(e) => { setPwNew2(e.target.value); setPwError(''); }}
                          placeholder="Wiederholen"
                          className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                          autoComplete="new-password"
                        />
                      </div>

                      {pwError ? <div className="text-xs text-red-400">{pwError}</div> : null}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => doChangePassword()}
                          disabled={pwSaving}
                          className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200 disabled:opacity-60"
                        >
                          {pwSaving ? 'Speichernâ€¦' : 'Speichern'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPwEditOpen(false); setPwCurrent(''); setPwNew(''); setPwNew2(''); setPwError(''); }}
                          className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 hover:bg-neutral-800"
                        >
                          Abbrechen
                        </button>
                      </div>

                      <div className="text-[11px] text-neutral-600">
                        Tipp: Wenn du dein aktuelles Passwort nicht mehr weiÃŸt, nutze â€žResetâ€‘Mailâ€œ.
                      </div>
                    </div>
                  )}
                </div>

</section>
            </AccordionItem>

            {/* ICS */}
            <AccordionItem id="ics" label="Import/Export" icon={Download} keys={['ics','import','export','download','upload']} >
              <section id="settings-ics">
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Import / Export (.ics)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5">
                    <Download className="w-6 h-6 text-white mb-4" />
                    <h4 className="font-medium text-white mb-1">Kalender exportieren</h4>
                    <p className="text-xs text-neutral-500 mb-4 h-8">Lade deine Termine als Standard .ics Datei herunter.</p>
                    <div className="flex gap-2">
                      <button onClick={() => exportICS(true)} className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-sm hover:bg-neutral-800 transition-colors">Alle</button>
                      <button onClick={() => exportICS(false)} className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-sm hover:bg-neutral-800 transition-colors">Nur Heute</button>
                    </div>
                  </div>
                  <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-5 relative overflow-hidden group">
                    <Upload className="w-6 h-6 text-white mb-4" />
                    <h4 className="font-medium text-white mb-1">Datei importieren</h4>
                    <p className="text-xs text-neutral-500 mb-4 h-8">FÃ¼ge Termine aus einer externen .ics Datei hinzu.</p>
                    <div className="relative">
                      <button className="w-full px-3 py-2 bg-white text-black rounded-md text-sm font-medium group-hover:bg-gray-200 transition-colors text-center">Datei auswÃ¤hlen</button>
                      <input type="file" accept=".ics" onChange={handleImportICS} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </section>
            </AccordionItem>

            {/* If search yields nothing */}
            {q && visibleTabs.length === 0 && (
              <div className="border border-neutral-800 rounded-2xl p-6 bg-neutral-950/50 text-sm text-neutral-500">
                Keine Treffer fÃ¼r â€ž{settingsQuery}â€œ.
              </div>
            )}
          </main>
        </div>
      </div>
    );
  })()}

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
                               {isGroupChat(activeChatData) ? (() => { const ids = getChatParticipants(activeChatData); const onlineCount = ids.filter(id => getPresence(id).online).length; return `${onlineCount} online â€¢ ${ids.length} Mitglieder`; })() : (() => { const pr = getPresence(partnerId); if (pr.online) return 'online'; if (pr.lastSeen) return `zuletzt gesehen ${formatTime(pr.lastSeen)}`; return 'offline'; })()}
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
                      <div className="hidden md:flex items-center px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-950 text-[11px] text-neutral-400">
                        <span className="text-neutral-200 font-semibold mr-1">{Number(chatTotalCount || 0)}</span> Nachrichten
                      </div>
                    )}
                    {secretView === 'chat' && activeChat && (
                      <button onClick={() => openChatMediaViewer(0)} className="text-neutral-500 hover:text-white transition-colors p-2" title="Alle Medien">
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    )}
                    {secretView === 'chat' && activeChat && (
                      <button onClick={() => { setIsMessageSearchOpen(v => !v); setTimeout(() => document.getElementById('msgSearchInput')?.focus(), 0); }} className={`text-neutral-500 hover:text-white transition-colors p-2 ${isMessageSearchOpen ? 'bg-neutral-900 rounded-lg' : ''}`} title="Chat durchsuchen">
                        <Search className="w-5 h-5" />
                      </button>
                    )}
                    {secretView === 'chat' && activeChat && (
                      <div className="relative" ref={chatMetaMenuRef}>
                        <button onClick={() => setIsChatMetaMenuOpen(v => !v)} className="text-neutral-500 hover:text-white transition-colors p-2" title="Anzeige">
                          <AlignLeft className="w-5 h-5" />
                        </button>
                        {isChatMetaMenuOpen && (
                          <div className="absolute right-0 mt-2 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-3 z-50">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Anzeige</div>
                            <label className="flex items-center justify-between gap-3 py-2">
                              <span className="text-sm text-neutral-200">Zeit anzeigen</span>
                              <input type="checkbox" checked={chatMetaPrefs.showTime} onChange={(e) => setChatMetaPrefs(p => ({ ...p, showTime: !!e.target.checked }))} />
                            </label>
                            <div className="mt-2">
                              <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Lesestatus</div>
                              <div className="flex gap-2">
                                <button onClick={() => setChatMetaPrefs(p => ({ ...p, receipts: 'off' }))} className={"flex-1 px-2 py-2 rounded-lg text-xs border transition-colors " + (chatMetaPrefs.receipts === 'off' ? "bg-white text-black border-white" : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800")}>Aus</button>
                                <button onClick={() => setChatMetaPrefs(p => ({ ...p, receipts: 'compact' }))} className={"flex-1 px-2 py-2 rounded-lg text-xs border transition-colors " + (chatMetaPrefs.receipts === 'compact' ? "bg-white text-black border-white" : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800")}>Status</button>
                                <button onClick={() => setChatMetaPrefs(p => ({ ...p, receipts: 'full' }))} className={"flex-1 px-2 py-2 rounded-lg text-xs border transition-colors " + (chatMetaPrefs.receipts === 'full' ? "bg-white text-black border-white" : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800")}>Mit Zeit</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {secretView === 'chat' && activeChat && userProfile && (
                      <button
                        onClick={() => toggleMuteChat(activeChat.id)}
                        className="text-neutral-500 hover:text-white transition-colors p-2"
                        title={(Array.isArray(userProfile?.mutedChatIds) && userProfile?.mutedChatIds.includes(activeChat.id)) ? 'Stumm aus' : 'Stumm schalten'}
                      >
                        {(Array.isArray(userProfile?.mutedChatIds) && userProfile?.mutedChatIds.includes(activeChat.id)) ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </button>
                    )}
                    <button onClick={() => hideSecretChatNow()} className="text-red-400 hover:text-red-300 transition-colors p-2" title="Panic Mode">
                      <Bomb className="w-5 h-5" />
                    </button>
                    <button onClick={() => hideSecretChatNow('Secret Chat geschlossen')} className="text-neutral-500 hover:text-white text-2xl leading-none p-2">&times;</button>
                  </div>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {!userProfile ? (
                    <div className="flex-1 flex items-center justify-center p-6"><div className="max-w-md w-full border border-neutral-800 p-8 rounded-xl bg-neutral-950/50 text-center"><Lock className="w-8 h-8 mx-auto mb-4 text-neutral-500" /><h3 className="text-xl font-medium mb-2">IdentitÃ¤t festlegen</h3><p className="text-sm text-neutral-500 mb-6">WÃ¤hle einen einzigartigen Benutzernamen.</p>
                    <form onSubmit={saveUsername}>
                      <input type="text" name="username" defaultValue={userProfile?.displayName || userProfile?.username || user?.email?.split('@')[0] || ''} placeholder="Dein Benutzername" required maxLength={20} className="w-full bg-black border border-neutral-700 text-white placeholder-neutral-600 rounded-lg px-4 py-3 text-center focus:outline-none focus:border-white transition-colors mb-4" />
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-4">
                        <div>Deine Chat-ID:</div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-200">{userProfile?.friendCode || '-----'}</span>
                          <button type="button" onClick={() => { const v = String(userProfile?.friendCode||''); if (v) { navigator.clipboard?.writeText(v).then(()=>showToast('Chat-ID kopiert')); } }} className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-200 hover:bg-neutral-800">Kopieren</button>
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors">BestÃ¤tigen</button>
                    </form>
                    </div></div>
                  
                  ) : secretView === 'settings' ? (
                    <div className="flex-1 overflow-y-auto p-6 max-w-2xl w-full mx-auto space-y-8">
                      <div className="flex flex-col items-center border border-neutral-800 rounded-xl p-8 bg-neutral-950/50">
                        <div className="relative mb-6">
                          {userProfile?.avatarBase64 ? (
                            <img
                              src={userProfile?.avatarThumbBase64 || userProfile?.avatarBase64}
                              className="w-32 h-32 rounded-full border-2 border-neutral-700 object-cover cursor-zoom-in"
                              alt="Profilbild"
                              onClick={() => openImageViewer(userProfile?.avatarFullBase64 || userProfile?.avatarBase64 || userProfile?.avatarThumbBase64)}
                            />
                          ) : (
                            <div className="w-32 h-32 bg-neutral-900 border-2 border-neutral-700 rounded-full flex items-center justify-center text-4xl font-medium text-neutral-500">{initialsFrom(userProfile?.displayName || userProfile?.username || userProfile?.email || '')}</div>
                          )}
                          <label className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full cursor-pointer hover:bg-gray-200 shadow-lg">
                            <Camera className="w-4 h-4" />
                            <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleAvatarUpload} />
                          </label>
                        </div>
                        <form onSubmit={updateProfileSettings} className="w-full max-w-xs space-y-4">
                          <input type="text" name="displayName" defaultValue={userProfile?.displayName || userProfile?.username || ''} required className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-center focus:outline-none focus:border-white transition-colors" />
                          <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Chatâ€‘ID (5â€‘stellig)</span>
                              <span className="font-mono text-white text-sm">{userProfile?.friendCode || '-----'}</span>
                            </div>
                            <button type="button" onClick={() => { const v = String(userProfile?.friendCode||''); if (v && v !== '-----') { navigator.clipboard?.writeText(v).then(()=>showToast('Chat-ID kopiert')); } }} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200 transition-colors">
                              Kopieren
                            </button>
                          </div>
                          <p className="text-[11px] text-neutral-500 text-center">Freunde im Chat fÃ¼gst du Ã¼ber diese Chatâ€‘ID hinzu. Kalenderâ€‘Freunde werden per Eâ€‘Mail geteilt.</p>

                          <button type="submit" className="w-full bg-neutral-800 text-white font-medium py-3 rounded-lg hover:bg-neutral-700 transition-colors">Profil speichern</button>
                        </form>
                      </div>

                      <div className="border border-neutral-800 rounded-xl p-6 bg-neutral-950/50 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4" /> Freunde verwalten</h4>
                            <p className="text-xs text-neutral-500 mt-1">Anfragen annehmen/ablehnen, Kontakte blockieren oder entfernen.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                          <div className="border border-neutral-800 rounded-xl p-3 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Freunde</div><div className="text-lg text-white mt-1">{friendIds.length}</div></div>
                          <div className="border border-neutral-800 rounded-xl p-3 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Eingehend</div><div className="text-lg text-white mt-1">{friendRequestIncomingIds.length}</div></div>
                          <div className="border border-neutral-800 rounded-xl p-3 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Gesendet</div><div className="text-lg text-white mt-1">{friendRequestSentIds.length}</div></div>
                          <div className="border border-neutral-800 rounded-xl p-3 bg-black"><div className="text-[10px] uppercase tracking-widest text-neutral-500">Blockiert</div><div className="text-lg text-white mt-1">{blockedUserIds.length}</div></div>
                        </div>

                        {friendRequestIncomingIds.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Anfragen an dich</div>
                            {friendRequestIncomingIds.slice(0, 30).map((uid) => (
                              <div key={`fri_in_${uid}`} className="flex items-center justify-between gap-2 border border-neutral-800 rounded-xl p-3 bg-black">
                                <div className="text-sm text-white truncate">{getUserDisplayLabel(uid)}</div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => acceptFriendRequest(uid)} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200">Annehmen</button>
                                  <button type="button" onClick={() => rejectFriendRequest(uid)} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">Ablehnen</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {friendRequestSentIds.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Gesendete Anfragen</div>
                            {friendRequestSentIds.slice(0, 30).map((uid) => (
                              <div key={`fri_out_${uid}`} className="flex items-center justify-between gap-2 border border-neutral-800 rounded-xl p-3 bg-black">
                                <div className="text-sm text-white truncate">{getUserDisplayLabel(uid)}</div>
                                <button type="button" onClick={() => cancelFriendRequest(uid)} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">Zurückziehen</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {friendIds.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Freunde</div>
                            {friendIds.slice(0, 60).map((uid) => (
                              <div key={`fri_ok_${uid}`} className="flex items-center justify-between gap-2 border border-neutral-800 rounded-xl p-3 bg-black">
                                <div className="text-sm text-white truncate">{getUserDisplayLabel(uid)}</div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => startChatWithProfile(uid)} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">Chat</button>
                                  <button type="button" onClick={() => blockUser(uid)} className="px-3 py-2 rounded-lg border border-red-900/50 text-red-300 text-xs hover:bg-red-950/40">Blockieren</button>
                                  <button type="button" onClick={() => removeFriend(uid)} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">Entfernen</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {blockedUserIds.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Blockiert</div>
                            {blockedUserIds.slice(0, 60).map((uid) => (
                              <div key={`fri_blk_${uid}`} className="flex items-center justify-between gap-2 border border-neutral-800 rounded-xl p-3 bg-black">
                                <div className="text-sm text-white truncate">{getUserDisplayLabel(uid)}</div>
                                <button type="button" onClick={() => unblockUser(uid)} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">Entblocken</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {(friendIds.length + friendRequestIncomingIds.length + friendRequestSentIds.length + blockedUserIds.length === 0) && (
                          <div className="text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-3">Noch keine Kontakte verwaltet.</div>
                        )}
                      </div>

                      <div className="border border-neutral-800 rounded-xl p-6 bg-neutral-950/50 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4" /> Secret PIN</h4>
                            <p className="text-xs text-neutral-500 mt-1">Der Secret Chat verlangt nach dem Long-Press eine PIN mit 4 bis 8 Ziffern.</p>
                          </div>
                          <div className={"px-2 py-1 rounded-full text-[10px] uppercase tracking-widest border " + ((userProfile?.secretPinEnabled && userProfile?.secretPinHash) ? 'border-emerald-700 text-emerald-300 bg-emerald-950/40' : 'border-neutral-800 text-neutral-500 bg-black')}>
                            {(userProfile?.secretPinEnabled && userProfile?.secretPinHash) ? 'aktiv' : 'aus'}
                          </div>
                        </div>
                        {(userProfile?.secretPinEnabled && userProfile?.secretPinHash) && (
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={8}
                            value={secretPinSetupCurrent}
                            onChange={(e) => setSecretPinSetupCurrent(String(e.target.value || '').replace(/\D/g, '').slice(0, 8))}
                            placeholder="Aktuelle PIN"
                            className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-neutral-600"
                          />
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={8}
                            value={secretPinSetupNew}
                            onChange={(e) => setSecretPinSetupNew(String(e.target.value || '').replace(/\D/g, '').slice(0, 8))}
                            placeholder={(userProfile?.secretPinEnabled && userProfile?.secretPinHash) ? 'Neue PIN' : 'PIN festlegen'}
                            className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-neutral-600"
                          />
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={8}
                            value={secretPinSetupConfirm}
                            onChange={(e) => setSecretPinSetupConfirm(String(e.target.value || '').replace(/\D/g, '').slice(0, 8))}
                            placeholder="PIN bestÃ¤tigen"
                            className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-neutral-600"
                          />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={saveSecretPinSettings} disabled={secretPinActionBusy} className="px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60">
                            {secretPinActionBusy ? 'Speichernâ€¦' : ((userProfile?.secretPinEnabled && userProfile?.secretPinHash) ? 'PIN Ã¤ndern' : 'PIN aktivieren')}
                          </button>
                          {(userProfile?.secretPinEnabled && userProfile?.secretPinHash) && (
                            <button type="button" onClick={disableSecretPin} disabled={secretPinActionBusy} className="px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/40 text-red-300 text-sm font-semibold hover:bg-red-950/60 transition-colors disabled:opacity-60">
                              PIN deaktivieren
                            </button>
                          )}
                        </div>
                        <div className="border-t border-neutral-900 pt-4 flex items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Bomb className="w-4 h-4" /> Panic Mode</h4>
                            <p className="text-xs text-neutral-500 mt-1">Blendet den Secret Chat sofort aus. Optional auch automatisch beim App-Wechsel.</p>
                          </div>
                          <button type="button" onClick={toggleSecretAutoHide} className={"px-3 py-2 rounded-xl text-xs font-semibold border transition-colors " + ((userProfile?.secretPanicOnHide !== false) ? 'bg-white text-black border-white' : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-600')}>
                            {(userProfile?.secretPanicOnHide !== false) ? 'Auto-Panic an' : 'Auto-Panic aus'}
                          </button>
                        </div>
                        <button type="button" onClick={() => hideSecretChatNow()} className="w-full px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/40 text-red-300 text-sm font-semibold hover:bg-red-950/60 transition-colors">
                          Secret Chat jetzt verstecken
                        </button>
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
                        <div className="mt-2 px-4 text-xs text-neutral-500">Tipp: Gib die <span className="text-neutral-300">5-stellige Chat-ID</span> exakt ein. Es werden keine VorschlÃ¤ge angezeigt.</div>
                        
                        {chatFriendLoading && (
                          <div className="mt-3 px-4 text-xs text-neutral-500">Suche...</div>
                        )}
                        {!chatFriendLoading && chatFriendError && (
                          <div className="mt-3 px-4 text-xs text-red-400">{chatFriendError}</div>
                        )}
                        {!chatFriendLoading && chatFriendResult && (
                          <div className="absolute top-full left-0 w-full mt-2 bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-2xl z-10">
                            <div className="p-4 hover:bg-neutral-800 flex items-center gap-3">
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
                              <div className="ml-auto flex items-center gap-2">
                                {(() => {
                                  const uid = chatFriendResult.id;
                                  const isBlocked = blockedUserIds.includes(uid);
                                  const isFriend = friendIds.includes(uid);
                                  const incoming = friendRequestIncomingIds.includes(uid);
                                  const outgoing = friendRequestSentIds.includes(uid);
                                  const blockedBy = isBlockedByUser(uid);
                                  if (isBlocked) {
                                    return (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); unblockUser(uid); }} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">
                                        Entblocken
                                      </button>
                                    );
                                  }
                                  if (blockedBy) {
                                    return <span className="text-[11px] text-red-300">Kontakt blockiert dich</span>;
                                  }
                                  if (isFriend) {
                                    return (
                                      <>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); startChatWithProfile(chatFriendResult); }} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200">Chat</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); blockUser(uid); }} className="px-3 py-2 rounded-lg border border-red-900/50 text-red-300 text-xs hover:bg-red-950/40">Blockieren</button>
                                      </>
                                    );
                                  }
                                  if (incoming) {
                                    return (
                                      <>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); acceptFriendRequest(uid); }} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200">Annehmen</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); rejectFriendRequest(uid); }} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">Ablehnen</button>
                                      </>
                                    );
                                  }
                                  if (outgoing) {
                                    return (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); cancelFriendRequest(uid); }} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">
                                        Anfrage zurückziehen
                                      </button>
                                    );
                                  }
                                  return (
                                    <>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); sendFriendRequest(uid); }} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200">Anfragen</button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); startChatWithProfile(chatFriendResult); }} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-500">Direkt Chat</button>
                                    </>
                                  );
                                })()}
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
                              const mutedChatIds = (userProfile && Array.isArray(userProfile?.mutedChatIds)) ? userProfile?.mutedChatIds : [];
                              const isMuted = mutedChatIds.includes(chat.id);
                              const isDm = !isGroupChat(chat) && Array.isArray(chat.participants) && chat.participants.length === 2;
                              const otherUid = isDm ? chat.participants.find(id => id !== user?.uid) : null;
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
                                    {chat.lastMessageSenderId !== user?.uid && chat.updatedAt > lastChatVisit ? (
                                      <span className="inline-block mt-1 px-2 py-0.5 bg-white text-black text-[10px] font-bold rounded-sm uppercase tracking-wider">Neu</span>
                                    ) : (
                                      <p className="text-xs text-neutral-500 truncate mt-0.5">Tippen zum Ã–ffnen...</p>
                                    )}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); toggleMuteChat(chat.id); }} className={`p-2 rounded-lg border transition-colors ${isMuted ? 'bg-neutral-950 text-white border-neutral-500' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-500'}`} title={isMuted ? 'Stumm aus' : 'Stumm schalten'}>
                                    {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                  </button>
                                  {isDm && otherUid && (
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Freund entfernen und Chat ausblenden?')) removeFriend(otherUid); }} className="p-2 rounded-lg border border-red-900/30 bg-red-900/10 text-red-400 hover:bg-red-900/30" title="Freund entfernen">
                                      <UserMinus className="w-4 h-4" />
                                    </button>
                                  )}
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

                        <div className="px-4 py-2 bg-neutral-950 border-b border-neutral-900 flex flex-col gap-2 shrink-0">

                          <div className="flex items-center gap-2">

                            <Search className="w-4 h-4 text-neutral-500" />

                            <input

                              id="msgSearchInput"

                              value={messageSearchQuery}

                              onChange={(e) => setMessageSearchQuery(e.target.value)}

                              placeholder="Nachrichten durchsuchen..."

                              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"

                            />

                            <button onClick={() => { setMessageSearchQuery(''); setMessageMatchIndex(0); }} className="text-neutral-500 hover:text-white transition-colors" title="Leeren"><X className="w-4 h-4" /></button>


                            {(((messageSearchQuery || '').trim()) || messageSearchFilter !== 'all') && (

                              <div className="flex items-center gap-2 ml-2 text-xs text-neutral-500">

                                <span>{messageMatches.length > 0 ? (Math.max(0, Math.min(messageMatchIndex, messageMatches.length - 1)) + 1) : 0}/{messageMatches.length}</span>

                                <button onClick={() => { if (messageMatches.length > 0) setMessageMatchIndex(i => (i - 1 + messageMatches.length) % messageMatches.length); }} disabled={messageMatches.length <= 1} className="p-1 rounded hover:bg-neutral-800 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>

                                <button onClick={() => { if (messageMatches.length > 0) setMessageMatchIndex(i => (i + 1) % messageMatches.length); }} disabled={messageMatches.length <= 1} className="p-1 rounded hover:bg-neutral-800 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>

                              </div>

                            )}

                          </div>


                          <div className="flex flex-wrap items-center gap-2">

                            <button onClick={() => { setMessageSearchFilter('all'); setMessageMatchIndex(0); }} className={"px-3 py-1 rounded-full text-xs border transition-colors " + (messageSearchFilter === 'all' ? "bg-white text-black border-white" : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800")}>Alle</button>

                            <button onClick={() => { setMessageSearchFilter('media'); setMessageMatchIndex(0); }} className={"px-3 py-1 rounded-full text-xs border transition-colors " + (messageSearchFilter === 'media' ? "bg-white text-black border-white" : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800")}>Medien</button>

                            <button onClick={() => { setMessageSearchFilter('audio'); setMessageMatchIndex(0); }} className={"px-3 py-1 rounded-full text-xs border transition-colors " + (messageSearchFilter === 'audio' ? "bg-white text-black border-white" : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800")}>Audio</button>

                            <button onClick={() => { setMessageSearchFilter('links'); setMessageMatchIndex(0); }} className={"px-3 py-1 rounded-full text-xs border transition-colors " + (messageSearchFilter === 'links' ? "bg-white text-black border-white" : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800")}>Links</button>

                            <button onClick={() => { setMessageSearchFilter('favorites'); setMessageMatchIndex(0); }} className={"px-3 py-1 rounded-full text-xs border transition-colors " + (messageSearchFilter === 'favorites' ? "bg-white text-black border-white" : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:bg-neutral-800")}>Favoriten</button>

                          </div>

                        </div>
                      )}

                      
                      <div
                        ref={chatScrollRef}
                        onScroll={(e) => {
                          const el = e.currentTarget;
                          if (!el) return;

                          // Track whether user is close to bottom (used to decide auto-scroll on new messages)
                          try {
                            const distToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
                            chatStickToBottomRef.current = distToBottom < 120;
                          } catch (_) {}

                          if (chatAutoLoadLockRef.current) return;
                          if (chatLoadingMore) return;
                          if (!chatHasMore) return;
                          if (el.scrollTop < 90) {
                            chatAutoLoadLockRef.current = true;
                            loadMoreChatMessages();
                          }
                        }}
                        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 flex flex-col"
                      >
                        {chatHasMore && (
                          <div className="-mt-2 mb-2 flex items-center justify-center">
                            <div className="px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-950 text-[11px] text-neutral-400">
                              {chatLoadingMore ? "Lade Ã¤ltere Nachrichtenâ€¦" : "Scroll nach oben fÃ¼r mehr"}
                            </div>
                          </div>
                        )}

                        {(isMessageSearchOpen && messageSearchFilter === 'media') && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-3 text-xs text-neutral-500">
                              <span>{chatMediaLoading ? 'Lade Medienâ€¦' : `${mediaSearchResults.length} Medien`}</span>
                              <span>Tippe auf ein Bild fÃ¼r Vollbild</span>
                            </div>
                            {mediaSearchResults.length === 0 ? (
                              <div className="p-6 rounded-2xl border border-dashed border-neutral-800 text-center text-sm text-neutral-500 bg-neutral-950/60">Keine Medien gefunden.</div>
                            ) : (
                              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                                {mediaSearchResults.filter(Boolean).map((item) => {
                                  const absoluteIndex = (chatMediaItems || []).findIndex((x) => x && String(x.id) === String(item.id));
                                  return (
                                    <button key={item.id} type="button" onClick={() => openChatMediaViewer(Math.max(0, absoluteIndex))} className="group relative aspect-square overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
                                      <img src={item.src} alt="Medium" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-left">
                                        <div className="text-[10px] text-white/90 truncate">{senderLabelFromId(item.senderId)}</div>
                                        <div className="text-[10px] text-neutral-300">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {(isMessageSearchOpen && messageSearchFilter === 'media') ? null : visibleChatMessages.map((msg) => {
                          if (!msg) return null;
                          const isMe = msg?.senderId === user?.uid;
                          const showActions = selectedMessageId === msg?.id;
                          const isFavorite = Array.isArray(msg?.starredBy) && msg.starredBy.includes(user?.uid);
                          const reactionRows = Object.entries(msg?.reactions || {})
                            .map(([emoji, uids]) => ({ emoji, uids: Array.isArray(uids) ? uids.filter(Boolean) : [] }))
                            .filter((row) => row.emoji && row.uids.length > 0);
                          
                          return (
                            <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div 
                                onClick={(e) => { e.stopPropagation(); setSelectedMessageId(showActions ? null : msg.id); }}
                                className={`max-w-[85%] rounded-2xl p-3 cursor-pointer transition-colors relative ${isMe ? 'bg-white text-black rounded-tr-sm hover:bg-gray-200' : 'bg-neutral-900 border border-neutral-800 text-white rounded-tl-sm hover:bg-neutral-800'}${isMessageSearchOpen && currentMatchId && String(currentMatchId) === String(msg.id) ? ' ring-2 ring-white/70' : ''}`}
                              >
                                {/* SelbstzerstÃ¶rungs-Indikator */}
                                {msg.selfDestruct && (
                                  <div className="text-[10px] text-red-500 font-bold mb-2 flex items-center gap-1">
                                    <Bomb className="w-3 h-3" /> ZerstÃ¶rt sich nach Lesen
                                  </div>
                                )}
                                {!msg.deleted && msg.replyTo && (
                                  (() => {
                                    const refId = msg.replyTo?.id;
                                    const refMsg = refId ? (chatMessages || []).find(m => m && m.id === refId) : null;
                                    const label = senderLabelFromId(refMsg?.senderId || msg.replyTo?.senderId);
                                    const preview = (refMsg ? messagePreviewText(refMsg) : String(msg.replyTo?.preview || '').trim()) || 'â€”';
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!refId) return;
                                          try {
                                            const el = document.getElementById(`msg-${refId}`);
                                            if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          } catch (_) {}
                                        }}
                                        className={`mb-2 w-full text-left px-3 py-2 rounded-xl border ${isMe ? 'bg-black/10 border-black/20' : 'bg-black/40 border-neutral-700'} hover:opacity-90 transition-opacity`}
                                        title="Zitierte Nachricht"
                                      >
                                        <div className={`text-[10px] uppercase tracking-widest font-semibold ${isMe ? 'text-black/70' : 'text-neutral-400'}`}>{label}</div>
                                        <div className={`mt-0.5 text-xs break-words max-h-10 overflow-hidden ${isMe ? 'text-black/80' : 'text-neutral-200'}`}>{preview}</div>
                                      </button>
                                    );
                                  })()
                                )}
{!msg.deleted && msg.image && (
                                  <img
                                    src={msg.image}
                                    alt="Upload"
                                    className="rounded-lg mb-2 max-h-64 object-contain cursor-zoom-in"
                                    onClick={(e) => { e.stopPropagation(); openImageViewer(msg.image); }}
                                  />
                                )}
                                {!msg.deleted && msg.audio && <AudioMessageBubble src={msg.audio} msgId={msg.id} isMe={isMe} />}
                                
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
                                    Nachricht gelÃ¶scht
                                  </p>
                                ) : (
                                  msg.text && <p className="text-sm whitespace-pre-wrap">{(isMessageSearchOpen && String(messageSearchQuery || '').trim()) ? renderHighlightedText(msg.text, messageSearchQuery, { isMe, active: String(currentMatchId) === String(msg.id) }) : msg.text}</p>
                                )}

                                {!msg.deleted && reactionRows.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {reactionRows.map((row) => {
                                      const mine = row.uids.includes(user?.uid);
                                      return (
                                        <button
                                          key={`${msg.id}_${row.emoji}`}
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); toggleMessageReaction(msg, row.emoji); }}
                                          className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${mine ? 'bg-white text-black border-white' : (isMe ? 'bg-black/15 border-black/20 text-black/80' : 'bg-black/40 border-neutral-700 text-neutral-200')}`}
                                          title={mine ? 'Reaktion entfernen' : 'Reagieren'}
                                        >
                                          {row.emoji} {row.uids.length}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                <div className={`flex items-center gap-1 mt-1 justify-end opacity-60 ${isMe ? 'text-black' : 'text-neutral-400'}`}>
                                  {msg.deleted && <span className="text-[9px] mr-1">(gelÃ¶scht)</span>}
                                  {!msg.deleted && msg.edited && <span className="text-[9px] mr-1">(bearbeitet)</span>}
                                  {chatMetaPrefs.showTime && (
                                    <span className="text-[10px] block text-right">
                                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  )}
                                  {isMe && chatMetaPrefs.receipts !== 'off' && (
                                    <span className="text-[10px] ml-1">
                                      {(() => {
                                        const mode = chatMetaPrefs.receipts;
                                        const chat = activeChatData || activeChat;
                                        const group = isGroupChat(chat);
                                        if (group) {
                                          const ids = getChatParticipants(chat);
                                          const lastRead = (activeChatData && activeChatData.lastRead) ? activeChatData.lastRead : (chat && chat.lastRead) ? chat.lastRead : {};
                                          const denom = Math.max(0, ids.length - 1);
                                          const seenCount = ids.filter(id => id !== user?.uid && (lastRead?.[id] || 0) >= (msg.timestamp || 0)).length;
                                          if (seenCount > 0) return (mode === 'compact') ? `gesehen ${seenCount}/${denom}` : `gesehen von ${seenCount}/${denom}`;
                                          if (msg.deliveredAt || msg.delivered) return 'zugestellt';
                                          return 'gesendet';
                                        }
                                        if (msg.readAt) return mode === 'full' ? `gesehen ${formatTime(msg.readAt)}`.trim() : 'gesehen';
                                        if (msg.read) return 'gesehen';
                                        if (msg.deliveredAt) return mode === 'full' ? `zugestellt ${formatTime(msg.deliveredAt)}`.trim() : 'zugestellt';
                                        if (msg.delivered) return 'zugestellt';
                                        return 'gesendet';
                                      })()}
                                    </span>
                                  )}
                                </div>

                                {showActions && (
                                  <div className={`absolute top-full mt-1 flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-lg p-1 z-10 shadow-xl ${isMe ? 'right-0' : 'left-0'}`}>
                                    {!msg.deleted && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReplyToMessage({
                                            id: msg.id,
                                            senderId: msg.senderId,
                                            text: msg.text || '',
                                            image: !!msg.image,
                                            audio: !!msg.audio,
                                            event: msg.event ? { title: msg.event.title || 'Termin' } : null,
                                            deleted: !!msg.deleted
                                          });
                                          setEditingMessage(null);
                                          setSelectedMessageId(null);
                                          try { document.getElementById('chatInput')?.focus(); } catch (_) {}
                                        }}
                                        className="p-2 text-white hover:bg-neutral-700 rounded-md"
                                        title="Zitieren"
                                      >
                                        <CornerUpLeft className="w-4 h-4" />
                                      </button>
                                    )}

                                    {!msg.deleted && !msg.pending && !String(msg.id || '').startsWith('local_') && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleMessageFavorite(msg); setSelectedMessageId(null); }}
                                        className={`p-2 rounded-md ${isFavorite ? 'text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-white hover:bg-neutral-700'}`}
                                        title={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                                      >
                                        <Star className="w-4 h-4" />
                                      </button>
                                    )}

                                    {!msg.deleted && !msg.pending && !String(msg.id || '').startsWith('local_') && quickReactionEmojis.map((emoji) => {
                                      const mine = Array.isArray(msg?.reactions?.[emoji]) && msg.reactions[emoji].includes(user?.uid);
                                      return (
                                        <button
                                          key={`${msg.id}_react_${emoji}`}
                                          onClick={(e) => { e.stopPropagation(); toggleMessageReaction(msg, emoji); setSelectedMessageId(null); }}
                                          className={`px-2 py-1 rounded-md text-sm ${mine ? 'bg-white text-black' : 'text-white hover:bg-neutral-700'}`}
                                          title={`Mit ${emoji} reagieren`}
                                        >
                                          {emoji}
                                        </button>
                                      );
                                    })}
                                    
                                    {isMe && !msg.deleted && !msg.pending && !String(msg.id || '').startsWith('local_') && !msg.image && !msg.audio && !msg.event && (
                                      <button onClick={(e) => { e.stopPropagation(); setReplyToMessage(null); setEditingMessage(msg); setNewMessageText(msg.text); setSelectedMessageId(null); document.getElementById('chatInput').focus(); }} className="p-2 text-white hover:bg-neutral-700 rounded-md" title="Bearbeiten"><Edit2 className="w-4 h-4" /></button>
                                    )}
                                    {isMe && !msg.deleted && !msg.pending && !String(msg.id || '').startsWith('local_') && (
                                      <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }} className="p-2 text-red-400 hover:bg-neutral-700 rounded-md" title="LÃ¶schen"><Trash2 className="w-4 h-4" /></button>
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

                        {!editingMessage && replyToMessage && (
                          <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2 px-3 rounded-t-xl text-xs text-neutral-400 border-b-0">
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Zitieren</div>
                              <div className="truncate">
                                <span className="text-neutral-300 font-semibold">{senderLabelFromId(replyToMessage?.senderId)}</span>
                                <span className="text-neutral-600 mx-2">â€¢</span>
                                <span className="text-neutral-400">{messagePreviewText(replyToMessage)}</span>
                              </div>
                            </div>
                            <button onClick={() => { setReplyToMessage(null); }} className="hover:text-white shrink-0 ml-3"><X className="w-4 h-4"/></button>
                          </div>
                        )}

                        <form onSubmit={(e) => sendMessage(e)} className="flex items-end gap-2 relative">
                          <div className={`relative shrink-0 flex gap-1 ${editingMessage ? 'hidden' : ''} overflow-x-auto no-scrollbar`}>
                            <label
                              className="cursor-pointer p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-500 transition-colors rounded-full flex items-center justify-center shrink-0"
                              title="Bild senden"
                              onPointerDown={() => temporarilySuspendSecretAutoHide(180000)}
                              onTouchStart={() => temporarilySuspendSecretAutoHide(180000)}
                              onMouseDown={() => temporarilySuspendSecretAutoHide(180000)}
                            >
                              <ImageIcon className="w-5 h-5 text-neutral-400" /><input type="file" accept="image/*,.heic,.heif" className="hidden" onClick={() => temporarilySuspendSecretAutoHide(180000)} onChange={handleImageUpload} />
                            </label>

                            <label
                              className="cursor-pointer p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-500 transition-colors rounded-full flex items-center justify-center shrink-0"
                              title="Foto machen"
                              onPointerDown={() => temporarilySuspendSecretAutoHide(180000)}
                              onTouchStart={() => temporarilySuspendSecretAutoHide(180000)}
                              onMouseDown={() => temporarilySuspendSecretAutoHide(180000)}
                            >
                              <Camera className="w-5 h-5 text-neutral-400" /><input type="file" accept="image/*,.heic,.heif" capture="environment" className="hidden" onClick={() => temporarilySuspendSecretAutoHide(180000)} onChange={handleImageUpload} />
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
                                <span className="text-sm font-medium">Aufnahme lÃ¤uft...</span>
                              </div>
                            ) : (
                              <textarea 
                                id="chatInput"
                                value={newMessageText} 
                                onChange={handleTyping} 
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} 
                                placeholder="Nachricht..." 
                                rows="1" 
                                className={`w-full bg-black border border-neutral-800 text-white pl-4 pr-24 py-3 focus:outline-none focus:border-neutral-500 transition-colors resize-none overflow-y-auto block text-sm ${(editingMessage || replyToMessage) ? 'rounded-b-2xl rounded-t-none border-t-0' : 'rounded-2xl'} ${selfDestruct ? 'border-red-900/50 focus:border-red-500' : ''}`} 
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

          
          {workClockEditOpen && (
            <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white"><Edit2 className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Session bearbeiten</h3>
                    <p className="text-xs text-neutral-500">TÃ¤tigkeit und Belastung lassen sich nachtrÃ¤glich anpassen.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Arbeit</label>
                    {workClockEditUsePreset ? (
                      <div className="mt-1 space-y-2">
                        <select
                          value={workClockEditTitle}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '__other__') {
                              setWorkClockEditUsePreset(false);
                              setWorkClockEditTitle('');
                            } else {
                              setWorkClockEditTitle(value);
                            }
                          }}
                          className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                        >
                          {normalizeWorkClockPresets(userProfile?.workClockTaskOptions).map((preset) => (
                            <option key={preset} value={preset}>{preset}</option>
                          ))}
                          <option value="__other__">Andere TÃ¤tigkeitâ€¦</option>
                        </select>
                        <button type="button" onClick={() => { setWorkClockEditUsePreset(false); setWorkClockEditTitle(workClockEditingSession?.title || ''); }} className="text-xs text-neutral-400 hover:text-white transition-colors">Eigene TÃ¤tigkeit eingeben</button>
                      </div>
                    ) : (
                      <div className="mt-1 space-y-2">
                        <input value={workClockEditTitle} onChange={(e) => setWorkClockEditTitle(e.target.value)} placeholder="z. B. BÃ¼ro, Baustelle, Support" className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                        <button type="button" onClick={() => { const presets = normalizeWorkClockPresets(userProfile?.workClockTaskOptions); setWorkClockEditUsePreset(true); setWorkClockEditTitle(presets[0] || 'Arbeit'); }} className="text-xs text-neutral-400 hover:text-white transition-colors">Dropdown verwenden</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Level</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {['leicht','mittel','schwer'].map(level => (
                        <button key={level} type="button" onClick={() => setWorkClockEditLevel(level)} className={"px-3 py-3 rounded-xl border text-sm font-semibold transition-colors " + (workClockEditLevel === level ? 'bg-white text-black border-white' : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-600')}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Start</label>
                      <input type="datetime-local" value={workClockEditStartValue} onChange={(e) => setWorkClockEditStartValue(e.target.value)} className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Ende</label>
                      <input type="datetime-local" value={workClockEditEndValue} onChange={(e) => setWorkClockEditEndValue(e.target.value)} className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-black px-4 py-3 text-sm text-neutral-300">
                    {workClockEditingSession?.startedAt ? new Date(workClockEditingSession.startedAt).toLocaleString('de-CH', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''} Â· <span className="text-white font-medium">Pausen: {formatDurationVerbose(workClockEditingSession?.pauseMs || 0)}</span>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setWorkClockEditOpen(false); setWorkClockEditingSession(null); }} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm font-semibold hover:border-neutral-500 transition-colors">Schliessen</button>
                  <button type="button" onClick={saveEditedWorkClockSession} className="ml-auto px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors">Speichern</button>
                </div>
              </div>
            </div>
          )}

          {workClockModalOpen && (
            <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white"><Briefcase className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Arbeitszeit abschliessen</h3>
                    <p className="text-xs text-neutral-500">Erfasse kurz die TÃ¤tigkeit und die Belastung.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Arbeit</label>
                    {workClockDraftUsePreset ? (
                      <div className="mt-1 space-y-2">
                        <select
                          value={workClockDraftTitle}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '__other__') {
                              setWorkClockDraftUsePreset(false);
                              setWorkClockDraftTitle('');
                            } else {
                              setWorkClockDraftTitle(value);
                            }
                          }}
                          className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                        >
                          {normalizeWorkClockPresets(userProfile?.workClockTaskOptions).map((preset) => (
                            <option key={preset} value={preset}>{preset}</option>
                          ))}
                          <option value="__other__">Andere TÃ¤tigkeitâ€¦</option>
                        </select>
                        <button type="button" onClick={() => { setWorkClockDraftUsePreset(false); setWorkClockDraftTitle(''); }} className="text-xs text-neutral-400 hover:text-white transition-colors">Eigene TÃ¤tigkeit eingeben</button>
                      </div>
                    ) : (
                      <div className="mt-1 space-y-2">
                        <input value={workClockDraftTitle} onChange={(e) => setWorkClockDraftTitle(e.target.value)} placeholder="z. B. BÃ¼ro, Baustelle, Support" className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" />
                        <button type="button" onClick={() => { const presets = normalizeWorkClockPresets(userProfile?.workClockTaskOptions); setWorkClockDraftUsePreset(true); setWorkClockDraftTitle(presets[0] || 'Arbeit'); }} className="text-xs text-neutral-400 hover:text-white transition-colors">Dropdown verwenden</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Level</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {['leicht','mittel','schwer'].map(level => (
                        <button key={level} type="button" onClick={() => setWorkClockDraftLevel(level)} className={"px-3 py-3 rounded-xl border text-sm font-semibold transition-colors " + (workClockDraftLevel === level ? 'bg-white text-black border-white' : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-600')}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-black px-4 py-3 text-sm text-neutral-300">
                    Aktuelle Arbeitszeit: <span className="text-white font-medium">{formatDurationVerbose(activeWorkMs)}</span>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setWorkClockModalOpen(false)} className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm font-semibold hover:border-neutral-500 transition-colors">ZurÃ¼ck</button>
                  <button type="button" onClick={cancelWorkClock} className="px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/40 text-red-200 text-sm font-semibold hover:bg-red-950/60 transition-colors">Verwerfen</button>
                  <button type="button" onClick={finishWorkClock} disabled={workClockSaving} className="ml-auto px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60">{workClockSaving ? 'Speichernâ€¦' : 'Speichern'}</button>
                </div>
              </div>
            </div>
          )}

          {secretPinModalOpen && (
            <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-sm border border-neutral-800 rounded-2xl bg-neutral-950 p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-5 h-5 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Secret PIN</h3>
                    <p className="text-xs text-neutral-500">Gib deine PIN ein, um den Secret Chat zu Ã¶ffnen.</p>
                  </div>
                </div>
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={secretPinInput}
                  onChange={(e) => { setSecretPinInput(String(e.target.value || '').replace(/\D/g, '').slice(0, 8)); setSecretPinError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') verifySecretPinAndEnter(); if (e.key === 'Escape') { setSecretPinModalOpen(false); setSecretPinInput(''); setSecretPinError(''); } }}
                  placeholder="PIN eingeben"
                  className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-neutral-600"
                />
                {secretPinError ? <div className="mt-3 text-sm text-red-400">{secretPinError}</div> : <div className="mt-3 text-xs text-neutral-500">4 bis 8 Ziffern.</div>}
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={() => { setSecretPinModalOpen(false); setSecretPinInput(''); setSecretPinError(''); }} className="flex-1 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 transition-colors">Abbrechen</button>
                  <button type="button" onClick={verifySecretPinAndEnter} disabled={secretPinBusy} className="flex-1 px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60">{secretPinBusy ? 'PrÃ¼feâ€¦' : 'Ã–ffnen'}</button>
                </div>
              </div>
            </div>
          )}

          {/* WETTER MODAL */}
          {plusMenuOpen && (
        <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPlusMenuOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-950 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Neu erstellen</h3><button onClick={() => setPlusMenuOpen(false)} className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500"><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => { setPlusMenuOpen(false); openNewEventModal(); }} className="p-4 rounded-2xl border border-neutral-800 hover:border-neutral-500 transition-colors text-left">
                <div className="text-sm font-semibold text-white flex items-center gap-2"><CalendarPlus className="w-4 h-4" /> Termin</div>
                <div className="text-xs text-neutral-500 mt-1">Neuen Kalender-Eintrag erstellen.</div>
              </button>
              <button onClick={() => { setShoppingListModalOpen(true); setPlusMenuOpen(false); }} className="p-4 rounded-2xl border border-neutral-800 hover:border-neutral-500 transition-colors text-left">
                <div className="text-sm font-semibold text-white flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Einkaufsliste</div>
                <div className="text-xs text-neutral-500 mt-1">Liste mit Artikeln, Preisen und Durchstreichen anlegen.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {shoppingListModalOpen && (
        <div className="fixed inset-0 z-[141] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShoppingListModalOpen(false)}>
          <div className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-950 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Neue Einkaufsliste</h3><button onClick={() => setShoppingListModalOpen(false)} className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500"><X className="w-4 h-4" /></button></div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-2 uppercase tracking-[0.18em]">Titel</label>
                <input value={shoppingDraftTitle} onChange={(e) => setShoppingDraftTitle(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" placeholder="z. B. Wochenendeinkauf" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-2 uppercase tracking-[0.18em]">Ort / Laden</label>
                <input value={shoppingDraftStore} onChange={(e) => setShoppingDraftStore(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500" placeholder="z. B. Migros" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShoppingListModalOpen(false)} className="px-4 py-3 rounded-xl border border-neutral-800 text-neutral-300 hover:border-neutral-500 transition-colors">Abbrechen</button>
                <button onClick={createShoppingList} disabled={shoppingSaving} className="px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50">Erstellen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isWeatherModalOpen && (
            <div className="fixed inset-0 z-[75] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={() => { setIsWeatherModalOpen(false); setSearchResults([]); }}>
              <div ref={eventModalScrollRef} className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up max-h-[92dvh] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">Wetter</p>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-neutral-400" /> {location.name}</h3>
                  </div>
                  <button onClick={() => { setIsWeatherModalOpen(false); setSearchResults([]); }} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="SchlieÃŸen">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-black border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-4xl font-light">{weather ? `${Math.round(weather.temperature)}Â°` : '--Â°'}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {weather ? `Wind ${Math.round(weather.windspeed || 0)} km/h` : 'Lade Datenâ€¦'}
                    </p>
                    <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{todayWeatherAdvice}</p>
                  </div>
                  <div className="shrink-0">
                    {getWeatherIcon(weather?.weathercode, "w-12 h-12 text-white")}
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">Vorhersage</h4>
                  <div className="space-y-2">
                    {(dailyForecast?.time || []).slice(0, 7).map((d, i) => (
                      <div key={d} className="bg-black border border-neutral-800 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedForecastDay((prev) => (prev === i ? null : i))}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-900 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 text-[11px] font-semibold text-neutral-300">{formatDayName(d)}</div>
                            <div className="flex items-center gap-2">
                              {getWeatherIcon(dailyForecast?.weathercode?.[i], "w-5 h-5 text-white")}
                              <span className="text-xs text-neutral-400">{new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 text-[11px] text-neutral-400">
                              <span className="px-2 py-1 rounded-full border border-neutral-800 bg-neutral-950">ðŸ’§ {Math.round(dailyForecast?.precipitation_probability_max?.[i] ?? 0)}%</span>
                              <span className="px-2 py-1 rounded-full border border-neutral-800 bg-neutral-950">ðŸŒ¬ï¸ {Math.round(dailyForecast?.windspeed_10m_max?.[i] ?? 0)} km/h</span>
                            </div>
                            <div className="text-sm tabular-nums">
                              <span className="text-white">{Math.round(dailyForecast?.temperature_2m_max?.[i] ?? 0)}Â°</span>
                              <span className="text-neutral-600 mx-1">/</span>
                              <span className="text-neutral-400">{Math.round(dailyForecast?.temperature_2m_min?.[i] ?? 0)}Â°</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${selectedForecastDay === i ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {selectedForecastDay === i && (
                          <div className="px-3 pb-3 pt-2 border-t border-neutral-900 text-sm text-neutral-300">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Regen</div>
                                <div className="mt-1 text-sm">{Math.round(dailyForecast?.precipitation_probability_max?.[i] ?? 0)}% â€¢ {Math.round(dailyForecast?.precipitation_sum?.[i] ?? 0)} mm</div>
                              </div>
                              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Wind</div>
                                <div className="mt-1 text-sm">bis {Math.round(dailyForecast?.windspeed_10m_max?.[i] ?? 0)} km/h</div>
                              </div>
                              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Sonnenaufgang</div>
                                <div className="mt-1 text-sm">{dailyForecast?.sunrise?.[i] ? new Date(dailyForecast.sunrise[i]).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : 'â€”'}</div>
                              </div>
                              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                                <div className="text-[10px] uppercase tracking-widest text-neutral-500">Sonnenuntergang</div>
                                <div className="mt-1 text-sm">{dailyForecast?.sunset?.[i] ? new Date(dailyForecast.sunset[i]).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : 'â€”'}</div>
                              </div>
                            </div>

                            {/* Optional: mini hourly for this day (first ~8 hours) */}
                            {Array.isArray(hourlyForecast?.time) && (
                              <div className="mt-3">
                                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">StÃ¼ndlich</div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                  {(() => {
                                    try {
                                      const dayStr = String(d).slice(0, 10);
                                      const idxs = [];
                                      for (let k = 0; k < hourlyForecast.time.length; k++) {
                                        if (String(hourlyForecast.time[k]).slice(0, 10) === dayStr) idxs.push(k);
                                      }
                                      return idxs.slice(0, 8).map((k) => (
                                        <div key={hourlyForecast.time[k]} className="min-w-[64px] rounded-xl border border-neutral-800 bg-neutral-950 px-2 py-2 text-center">
                                          <div className="text-[11px] text-neutral-400">{new Date(hourlyForecast.time[k]).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</div>
                                          <div className="mt-1 text-sm font-medium text-white tabular-nums">{Math.round(hourlyForecast?.temperature_2m?.[k] ?? 0)}Â°</div>
                                          <div className="mt-1 text-[11px] text-neutral-400">ðŸ’§ {Math.round(hourlyForecast?.precipitation_probability?.[k] ?? 0)}%</div>
                                        </div>
                                      ));
                                    } catch (_) { return null; }
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
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
                      placeholder="Ort (z.B. ZÃ¼rich)â€¦"
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
                          <span className="text-neutral-500 text-xs ml-2">{loc.admin1 ? `${loc.admin1}` : ''} {loc.country ? `â€¢ ${loc.country}` : ''}</span>
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
                    SchlieÃŸen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EVENT MODAL */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[85] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={closeEventModal}>
              <div ref={eventModalScrollRef} className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up max-h-[92dvh] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">{eventToEdit ? (eventModalMode === 'view' ? 'Ansicht' : 'Bearbeiten') : 'Neu'}</p>
                    <h3 className="text-lg font-medium text-white">{eventToEdit ? (eventModalMode === 'view' ? 'Termin' : 'Termin bearbeiten') : 'Neuer Termin'}</h3>
                    {eventToEdit && !eventCanEdit && (
                      <p className="mt-1 text-[11px] text-neutral-500">Nur Lesezugriff</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {eventToEdit && eventModalMode === 'view' && eventCanEdit && (
                      <button
                        type="button"
                        onClick={enterEventEditMode}
                        className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    {eventToEdit && eventModalMode === 'view' && (
                      <button
                        type="button"
                        onClick={() => {
                          const snap = {
                            eventId: (eventToEdit?._baseId || eventToEdit?.id || null),
                            title: eventForm.title,
                            date: eventForm.date,
                            time: eventForm.time,
                            location: eventForm.location,
                            durationMinutes: eventForm.durationMinutes,
                            desc: eventForm.desc,
                            calendarId: (eventForm.calendarId || eventToEdit?.calendarId || 'default'),
                          };
                          openShareLinkModalForEvent(snap, snap.calendarId);
                        }}
                        className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                        title="Public Link (Event)"
                      >
                        <Link2 className="w-5 h-5" />
                      </button>
                    )}
                    {eventToEdit && eventModalMode !== 'view' && (
                      <button
                        type="button"
                        onClick={backToEventViewMode}
                        className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                        title="ZurÃ¼ck"
                      >
                        <CornerUpLeft className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={closeEventModal} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="SchlieÃŸen">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>


                {eventToEdit && eventModalMode !== 'view' && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && (
                  <div className="mb-4 p-4 bg-black border border-neutral-800 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-2">Ã„nderung gilt fÃ¼r</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEventEditScope('single'); setEventForm(prev => ({ ...prev, date: selectedDateForEvent })); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${eventEditScope === 'single' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}>Nur dieses Datum</button>
                      <button type="button" onClick={() => { setEventEditScope('series'); setEventForm(prev => ({ ...prev, date: eventToEdit.date })); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${eventEditScope === 'series' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}>Ganze Serie</button>
                    </div>
                    <p className="mt-2 text-[11px] text-neutral-500">Aktuelles Datum: <span className="text-neutral-300">{selectedDateForEvent}</span></p>
                  </div>
                )}

                {eventToEdit && eventModalMode === 'view' && (
                  <div className="space-y-3">
                    <div className="bg-black border border-neutral-800 rounded-2xl p-4">
                      <div className="text-white text-lg font-medium">{eventForm.title || 'Termin'}</div>
                      <div className="mt-1 text-sm text-neutral-300">
                        <span className="tabular-nums">{eventForm.date}</span>
                        {eventForm.time ? <span className="text-neutral-600 mx-2">â€¢</span> : null}
                        {eventForm.time ? <span className="tabular-nums">{eventForm.time}</span> : null}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                          <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Kategorie</div>
                          <div className="mt-1 text-neutral-200">{eventForm.type || 'â€”'}</div>
                        </div>
                        <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                          <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Kalender</div>
                          <div className="mt-1 text-neutral-200">{getCalendarById(eventForm.calendarId || 'default')?.name || 'Privat'}</div>
                        </div>
                                              <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                          <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Ort</div>
                          <div className="mt-1 text-neutral-200">{eventForm.location ? eventForm.location : 'â€”'}</div>
                        </div>
                        <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                          <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Dauer</div>
                          <div className="mt-1 text-neutral-200">{(eventForm.durationMinutes !== null && typeof eventForm.durationMinutes !== 'undefined' && String(eventForm.durationMinutes).trim() !== '') ? `${eventForm.durationMinutes} min` : 'â€”'}</div>
                        </div>
</div>

                      {(eventForm.recurrenceFreq && eventForm.recurrenceFreq !== 'NONE') && (
                        <div className="mt-3 bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                          <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Wiederholung</div>
                          <div className="mt-1 text-neutral-200">
                            {eventForm.recurrenceFreq === 'DAILY' ? 'TÃ¤glich' : eventForm.recurrenceFreq === 'WEEKLY' ? 'WÃ¶chentlich' : eventForm.recurrenceFreq === 'MONTHLY' ? 'Monatlich' : eventForm.recurrenceFreq}
                            {eventForm.recurrenceInterval && eventForm.recurrenceInterval > 1 ? ` â€¢ alle ${eventForm.recurrenceInterval}` : ''}
                            {eventForm.recurrenceUntil ? ` â€¢ bis ${eventForm.recurrenceUntil}` : ''}
                          </div>
                        </div>
                      )}

                      {eventForm.desc ? (
                        <div className="mt-3 bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                          <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Beschreibung</div>
                          <div className="mt-1 text-neutral-200 whitespace-pre-wrap">{eventForm.desc}</div>
                        </div>
                      ) : (
                        <div className="mt-3 text-[11px] text-neutral-500">Keine Beschreibung.</div>
                      )}
                    </div>

                    {eventCanEdit && (
                      <button
                        type="button"
                        onClick={enterEventEditMode}
                        className="w-full py-3 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" /> Bearbeiten
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={closeEventModal}
                      className="w-full py-3 rounded-lg text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 hover:text-white transition-colors"
                    >
                      SchlieÃŸen
                    </button>
                  </div>
                )}

                {!(eventToEdit && eventModalMode === 'view') && (
                  <form onSubmit={saveEvent} className="space-y-3">
                  <div className="bg-black border border-neutral-800 rounded-2xl p-4">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">âš¡ Schnelleingabe</label>
                    <textarea
                      value={quickEventText}
                      onChange={(e) => updateQuickEventText(e.target.value)}
                      placeholder="z.B. Fr 14:30 Arzt bei Dr. X, 45min"
                      rows="2"
                      className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
                    />
                    {quickEventPreview && (
                      <div className="mt-2 text-[11px] text-neutral-500">
                        Erkannt: <span className="text-neutral-300">{quickEventPreview.date || (selectedDateForEvent || eventForm.date)}{quickEventPreview.time ? ` â€¢ ${quickEventPreview.time}` : ''}{(quickEventPreview.durationMinutes !== null && typeof quickEventPreview.durationMinutes !== 'undefined') ? ` â€¢ ${quickEventPreview.durationMinutes}min` : ''}{quickEventPreview.location ? ` â€¢ Ort: ${quickEventPreview.location}` : ''}</span>
                        <span className="text-neutral-600"> â€” </span><span className="text-white">{quickEventPreview.title}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={applyQuickEventToForm}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors"
                      >
                        Ãœbernehmen
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQuickEventText(''); setQuickEventPreview(null); }}
                        className="px-3 py-2 rounded-lg text-sm border border-neutral-800 text-neutral-300 hover:border-neutral-500"
                      >
                        Leeren
                      </button>
                    </div>
                  </div>

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

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Ort</label>
                      <input
                        value={eventForm.location || ''}
                        onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="z.B. BÃ¼ro / Dr. X"
                        className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Dauer</label>
                      <input
                        type="number"
                        min="0"
                        value={eventForm.durationMinutes === null || typeof eventForm.durationMinutes === 'undefined' ? '' : eventForm.durationMinutes}
                        onChange={(e) => setEventForm(prev => ({ ...prev, durationMinutes: e.target.value }))}
                        placeholder="min"
                        className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                      />
                    </div>
                  </div>

                  {!eventToEdit && (
                    <div className="bg-black border border-neutral-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">ðŸ—³ï¸ Abstimmung</label>
                          <p className="mt-1 text-[11px] text-neutral-500">Beim Speichern werden ZeitvorschlÃ¤ge an Mitglieder mit Schreibrecht gesendet.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCreatePollOnSave(v => {
                              const next = !v;
                              if (next) initPollDraftFromEvent({ date: eventForm.date, time: eventForm.time, calendarId: eventForm.calendarId || 'default' });
                              return next;
                            });
                          }}
                          className={"px-3 py-2 rounded-lg text-xs font-semibold border transition-colors " + (createPollOnSave ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500')}
                        >
                          {createPollOnSave ? 'Ja, abstimmen' : 'Nein'}
                        </button>
                      </div>

                      {createPollOnSave && (
                        <div className="mt-3 space-y-3">
                          <div className="text-xs text-neutral-400">VorschlÃ¤ge (mind. 2):</div>
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

                          

                          <div className="mt-2 bg-neutral-950/40 border border-neutral-800 rounded-xl p-3">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-2">Deadline (optional)</div>
                            <div className="flex gap-2">
                              <input
                                type="date"
                                value={pollDeadlineDate}
                                onChange={(e) => setPollDeadlineDate(e.target.value)}
                                className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                              />
                              <input
                                type="time"
                                value={pollDeadlineTime}
                                onChange={(e) => setPollDeadlineTime(e.target.value)}
                                className="w-28 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="text-[11px] text-neutral-500">Auto-Finalisieren nach Deadline</div>
                              <button
                                type="button"
                                onClick={() => setPollAutoFinalize(v => !v)}
                                className={"px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors " + (pollAutoFinalize ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500')}
                              >
                                {pollAutoFinalize ? 'An' : 'Aus'}
                              </button>
                            </div>
                            <div className="mt-2 text-[11px] text-neutral-500">Voting 2.0: âœ… Fix Â· ðŸ¤· Kann Â· âŒ Nein (pro Vorschlag)</div>
                          </div>
<div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => initPollDraftFromEvent({ date: eventForm.date, time: eventForm.time, calendarId: eventForm.calendarId || 'default' })}
                              className="flex-1 px-3 py-2 rounded-lg border border-neutral-800 text-neutral-300 text-sm hover:border-neutral-500"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Convenience: setze Hauptdatum/Zeit auf ersten Vorschlag
                                const first = (pollDraft && pollDraft[0]) ? pollDraft[0] : null;
                                if (first?.date) setEventForm(prev => ({ ...prev, date: first.date }));
                                if (first?.time) setEventForm(prev => ({ ...prev, time: first.time }));
                              }}
                              className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm hover:border-neutral-500"
                            >
                              1. Vorschlag Ã¼bernehmen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-black border border-neutral-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Erinnerung</label>
                      {!eventForm.time && <span className="text-[10px] text-neutral-500">benÃ¶tigt Uhrzeit</span>}
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
                    <p className="mt-2 text-[11px] text-neutral-500">Hinweis: In der PWA funktionieren Erinnerungen zuverlÃ¤ssig, wenn Benachrichtigungen erlaubt sind und Onyx mindestens im Hintergrund aktiv ist.</p>
                  </div>


                  <div className="bg-black border border-neutral-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Wiederholung</label>
                      {eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single' && (
                        <span className="text-[10px] text-neutral-500">nur in Serie Ã¤nderbar</span>
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
                      <option value="DAILY">TÃ¤glich</option>
                      <option value="WEEKLY">WÃ¶chentlich</option>
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
                      placeholder="Optionalâ€¦"
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
                        .filter(c => c.type !== 'shift' && (c.ownerId === user?.uid || c.sharedWith?.[user?.uid] === 'write'))
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.ownerId !== user?.uid ? ' (geteilt)' : ''}
                          </option>
                        ))
                      }
                    </select>
                    <p className="mt-1 text-[11px] text-neutral-500">{(eventToEdit && eventToEdit.recurrence && eventToEdit.recurrence.freq && eventToEdit.recurrence.freq !== 'NONE' && selectedDateForEvent && eventToEdit.date && selectedDateForEvent !== eventToEdit.date && eventEditScope === 'single') ? 'Hinweis: Einzelnes Vorkommen kann nicht in einen anderen Kalender verschoben werden.' : 'SchichtplÃ¤ne kÃ¶nnen nur Ã¼ber die Tagesauswahl bearbeitet werden.'}</p>
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
                          LÃ¶schen
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
                      SchlieÃŸen
                    </button>
                  )}
                </form>
                )}


{eventToEdit && (
  <div className="mt-4 pt-4 border-t border-neutral-800">
    <div className="flex gap-2 mb-3">
      <button
        type="button"
        onClick={() => { setShowEventComments(v => !v); setShowEventPoll(false); }}
        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${showEventComments ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}
      >
        ðŸ’¬ Kommentare
      </button>
      <button
        type="button"
        onClick={() => { setShowEventPoll(v => !v); setShowEventComments(false); initPollDraftFromEvent(modalEvent || eventToEdit); }}
        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${showEventPoll ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'}`}
      >
        ðŸ—³ï¸ Abstimmung
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
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${c.senderId === user?.uid ? 'bg-white text-black ml-auto' : 'bg-neutral-900 text-white'}`}
            >
              <div className="text-[10px] opacity-70 mb-1">{c.senderId === user?.uid ? 'Du' : (c.senderName || 'User')}</div>
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
            Letzte Abstimmung geschlossen âœ…
          </div>
        )}

        {(!modalEvent || !modalEvent.poll || modalEvent.poll.status !== 'open') ? (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">
              3 VorschlÃ¤ge senden â†’ Mitglieder mit <span className="text-white">Schreibrecht</span> im Kalender stimmen ab. Gewinner wird automatisch gesetzt.
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

            <div className="mt-2 bg-neutral-950/40 border border-neutral-800 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-2">Deadline (optional)</div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={pollDeadlineDate}
                  onChange={(e) => setPollDeadlineDate(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                />
                <input
                  type="time"
                  value={pollDeadlineTime}
                  onChange={(e) => setPollDeadlineTime(e.target.value)}
                  className="w-28 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[11px] text-neutral-500">Auto-Finalisieren nach Deadline</div>
                <button
                  type="button"
                  onClick={() => setPollAutoFinalize(v => !v)}
                  className={"px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors " + (pollAutoFinalize ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500')}
                >
                  {pollAutoFinalize ? 'An' : 'Aus'}
                </button>
              </div>
              <div className="mt-2 text-[11px] text-neutral-500">Voting 2.0: âœ… Fix Â· ðŸ¤· Kann Â· âŒ Nein (pro Vorschlag)</div>
            </div>


            <div className="flex gap-2">
              <button
                type="button"
                disabled={pollBusy}
                onClick={createPollForEvent}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm ${pollBusy ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-black'}`}
              >
                VorschlÃ¤ge senden
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
            {(() => {
              const poll = modalEvent.poll || {};
              const voterIds = Array.isArray(poll.voterIds) ? poll.voterIds : [];
              const tally = computePollTally(poll, voterIds);
              const deadlineLabel = tally.deadlineAt ? formatDeadlineShort(tally.deadlineAt) : '';
              const canFinalizeNow = !!tally.canFinalizeNow;
              const winnerId = tally.winnerOptionId;
              const myLegacyVote = (tally.version < 2) ? ((tally.votes || {})[user?.uid] || '') : '';
              const myRow = (tally.version >= 2 && tally.votes && typeof tally.votes[user?.uid] === 'object') ? tally.votes[user?.uid] : {};
              const myComplete = (tally.version < 2) ? !!myLegacyVote : ((poll.options || []).every(o => isPollState((myRow || {})[o.id])));

              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-neutral-400">
                      Abstimmung lÃ¤uft â€¢ {tally.respondedCount}/{tally.totalVoters || (poll.voterIds || []).length} Antworten{deadlineLabel ? ` Â· Deadline: ${deadlineLabel}` : ''}
                    </div>
                    <button
                      type="button"
                      disabled={!canFinalizeNow || pollBusy}
                      onClick={finalizePollForEvent}
                      className={"px-3 py-2 rounded-lg font-semibold text-xs " + ((!canFinalizeNow || pollBusy) ? 'bg-neutral-900 border border-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-white text-black')}
                      title={canFinalizeNow ? 'Gewinner Ã¼bernehmen' : 'Warten bis alle fertig sind oder Deadline'}
                    >
                      Gewinner Ã¼bernehmen
                    </button>
                  </div>

                  {tally.version < 2 && (
                    <div className="text-[11px] text-yellow-300 border border-yellow-900/30 bg-yellow-900/10 rounded-xl p-3">
                      Diese Abstimmung ist 1.0 (eine Stimme pro Person). Neue Abstimmungen nutzen 2.0 (âœ…/ðŸ¤·/âŒ pro Vorschlag).
                      {(poll.createdBy === user?.uid) && (
                        <div className="mt-2">
                          <button
                            type="button"
                            disabled={pollBusy}
                            onClick={() => upgradePollToV2(modalEvent)}
                            className={"px-3 py-2 rounded-lg text-[11px] font-semibold border " + (pollBusy ? 'bg-neutral-900 border-neutral-800 text-neutral-500' : 'bg-white text-black border-white')}
                          >
                            Auf 2.0 upgraden (Votes reset)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {(poll.options || []).map((opt) => {
                      const t = (tally.byOptionId && tally.byOptionId[opt.id]) ? tally.byOptionId[opt.id] : { yes: 0, maybe: 0, no: 0, score: 0 };
                      const isWinner = winnerId === opt.id;

                      if (tally.version >= 2) {
                        const myState = (myRow || {})[opt.id] || '';
                        const baseBtn = 'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors';
                        const onCls = 'bg-white text-black border-white';
                        const offCls = 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-500';

                        return (
                          <div
                            key={opt.id}
                            className={"w-full border rounded-xl px-3 py-2 transition-colors " + (isWinner ? 'border-white bg-neutral-900' : 'border-neutral-800')}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm text-white">{opt.date} â€¢ {opt.time}{isWinner ? ' â­' : ''}</div>
                              <div className="flex items-center gap-1">
                                <button type="button" disabled={pollBusy} onClick={() => voteInPoll(opt.id, POLL_STATE.YES)} className={baseBtn + ' ' + (myState === POLL_STATE.YES ? onCls : offCls)} title="Fix">âœ…</button>
                                <button type="button" disabled={pollBusy} onClick={() => voteInPoll(opt.id, POLL_STATE.MAYBE)} className={baseBtn + ' ' + (myState === POLL_STATE.MAYBE ? onCls : offCls)} title="Kann">ðŸ¤·</button>
                                <button type="button" disabled={pollBusy} onClick={() => voteInPoll(opt.id, POLL_STATE.NO)} className={baseBtn + ' ' + (myState === POLL_STATE.NO ? onCls : offCls)} title="Nein">âŒ</button>
                              </div>
                            </div>
                            <div className="mt-1 text-[11px] text-neutral-500 tabular-nums">âœ…{t.yes} &nbsp; ðŸ¤·{t.maybe} &nbsp; âŒ{t.no}</div>
                          </div>
                        );
                      }

                      // Legacy (1.0)
                      const myVote = myLegacyVote;
                      const voted = myVote === opt.id;
                      const c = t.yes || 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => voteInPoll(opt.id)}
                          className={"w-full text-left border rounded-xl px-3 py-2 " + (voted ? 'border-white bg-neutral-900' : 'border-neutral-800 hover:border-neutral-500')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-white">{opt.date} â€¢ {opt.time}</div>
                            <div className="text-xs text-neutral-400">{c} Vote{c === 1 ? '' : 's'}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-neutral-500">
                    {myComplete ? 'Du: fertig âœ…' : 'Du: offen'}
                  </div>
                </>
              );
            })()}
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
                  <button onClick={() => setIsCalManageModalOpen(false)} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="SchlieÃŸen">
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

                  <div className="flex items-center justify-between bg-black border border-neutral-800 rounded-2xl p-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Farbe</div>
                      <div className="mt-1 text-xs text-neutral-500">Wird fÃ¼r Marker/Rand im Kalender genutzt.</div>
                    </div>
                    <input
                      type="color"
                      value={calForm?.color || '#ffffff'}
                      onChange={(e) => setCalForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-10 h-10 rounded-lg bg-transparent border border-neutral-800"
                      title="Kalenderfarbe"
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
                    <p className="mt-1 text-[11px] text-neutral-500">Schichtplan: Tippen wechselt Schichten, lang drÃ¼cken Ã¶ffnet Auswahl, â€žPinselâ€œ malt mehrere Tage.</p>
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
                          Noch keine Schichten. FÃ¼ge mindestens eine hinzu.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[45vh] overflow-y-auto no-scrollbar pr-1">
                          {(calForm?.shifts || []).filter(Boolean).map((sh) => (
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
                                  placeholder="Name (z.B. FrÃ¼h)"
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
                  <button onClick={() => { setIsShareCalModalOpen(false); setShareUsername(''); }} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="SchlieÃŸen">
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
                    <p className="mt-1 text-[11px] text-neutral-500">Hinweis: Der andere Nutzer muss sich einmal registriert haben, damit sein Profil Ã¼ber E-Mail gefunden wird.</p>
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
                    SchlieÃŸen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PUBLIC SHARE LINK MODAL (Busy-only / Passcode / Magic-Link / Expiry) */}
          {isShareLinkModalOpen && (
            <div className="fixed inset-0 z-[83] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={() => { setIsShareLinkModalOpen(false); setShareLinkCreated(null); }}>
              <div className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">Privacy-first Sharing</p>
                    <h3 className="text-lg font-medium text-white">Public Link</h3>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      {shareLinkDraft.kind === 'calendar' ? `Busyâ€‘Only: ${shareLinkDraft.calName || 'Kalender'}` : `Event: ${(shareLinkDraft.eventSnapshot?.title || 'Termin')}`}
                    </p>
                  </div>
                  <button onClick={() => { setIsShareLinkModalOpen(false); setShareLinkCreated(null); }} className="p-2 rounded-full hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" title="SchlieÃŸen">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {shareLinkDraft.kind === 'calendar' && (
                  <div className="bg-black border border-neutral-800 rounded-xl p-4 mb-4">
                    <div className="text-xs font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4" /> Busyâ€‘Only</div>
                    <div className="mt-1 text-[11px] text-neutral-500">Extern sieht nur ZeitblÃ¶cke (keine Titel/Orte).</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Schutz</label>
                    <select
                      value={shareLinkDraft.protection}
                      onChange={(e) => setShareLinkDraft(prev => ({ ...prev, protection: e.target.value, passcode: '' }))}
                      className="mt-1 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                    >
                      <option value="magic">Magicâ€‘Link (ohne Eingabe)</option>
                      <option value="passcode">Passcode</option>
                      <option value="none">Offen (nicht empfohlen)</option>
                    </select>
                    {shareLinkDraft.protection === 'passcode' && (
                      <input
                        value={shareLinkDraft.passcode}
                        onChange={(e) => setShareLinkDraft(prev => ({ ...prev, passcode: e.target.value }))}
                        placeholder="Passcode (min. 4)"
                        className="mt-2 w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Ablauf</label>
                    <div className="mt-1 bg-black border border-neutral-800 rounded-lg px-3 py-3">
                      <label className="flex items-center gap-2 text-xs text-neutral-300">
                        <input type="checkbox" checked={!!shareLinkDraft.noExpiry} onChange={(e) => setShareLinkDraft(prev => ({ ...prev, noExpiry: e.target.checked }))} />
                        Kein Ablauf
                      </label>
                      {!shareLinkDraft.noExpiry && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={shareLinkDraft.expiresInDays}
                            onChange={(e) => setShareLinkDraft(prev => ({ ...prev, expiresInDays: e.target.value }))}
                            className="w-20 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                          />
                          <span className="text-xs text-neutral-500">Tage</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={createShareLink} className="flex-1 py-3 rounded-lg text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors">
                    Link erstellen
                  </button>
                  <button type="button" onClick={() => { setIsShareLinkModalOpen(false); setShareLinkCreated(null); }} className="px-4 py-3 rounded-lg text-sm bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-500">
                    SchlieÃŸen
                  </button>
                </div>

                {shareLinkCreated && (
                  <div className="mt-4 bg-black border border-neutral-800 rounded-xl p-4">
                    <div className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Link</div>
                    <div className="mt-2 flex items-center gap-2">
                      <input readOnly value={shareLinkCreated.url} className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white" />
                      <button type="button" onClick={() => { try { navigator.clipboard?.writeText(shareLinkCreated.url); showToast('Kopiert'); } catch (_) {} }} className="p-2 rounded-lg bg-white text-black hover:bg-gray-200" title="Kopieren">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] text-neutral-500">Hinweis: Externe Links benÃ¶tigen passende Firestoreâ€‘Rules fÃ¼r <span className="font-mono text-neutral-300">shares</span>.</div>
                  </div>
                )}

                <div className="mt-5">
                  <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">Aktive Links</h4>
                  {(() => {
                    const relevant = (shareLinks || []).filter(l => {
                      if (!l || l.revokedAtMs) return false;
                      if (String(l.kind) !== String(shareLinkDraft.kind)) return false;
                      if (String(l.calId || 'default') !== String(shareLinkDraft.calId || 'default')) return false;
                      if (shareLinkDraft.kind === 'event') {
                        const want = String(shareLinkDraft.eventId || '');
                        const got = String(l.eventId || '');
                        if (want && got && want !== got) return false;
                      }
                      return true;
                    });
                    if (relevant.length === 0) {
                      return <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl p-4 text-center">Keine aktiven Links.</div>;
                    }
                    return (
                      <div className="space-y-2 max-h-[32vh] overflow-y-auto no-scrollbar pr-1">
                        {relevant.slice(0, 20).map(l => {
                          const url = makeShareUrl(l.id || l.token || l.shareId || l._id || l.docId || l.id, '');
                          const exp = l.expiresAtMs ? new Date(l.expiresAtMs).toLocaleDateString('de-CH') : 'â€”';
                          return (
                            <div key={l.id} className="flex items-center justify-between bg-black border border-neutral-800 rounded-xl px-4 py-3">
                              <div className="min-w-0">
                                <div className="text-sm text-white font-medium truncate">{l.kind === 'calendar' ? 'Busyâ€‘Only' : 'Event'} â€¢ {shareLinkDraft.calName}</div>
                                <div className="text-[11px] text-neutral-500">Ablauf: {exp}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => { try { navigator.clipboard?.writeText(makeShareUrl(l.id)); showToast('Kopiert'); } catch (_) {} }} className="p-2 border border-neutral-800 rounded-lg text-neutral-300 hover:bg-neutral-900" title="Kopieren"><Copy className="w-4 h-4"/></button>
                                <button type="button" onClick={() => revokeShareLink(l.id)} className="p-2 border border-red-900/30 bg-red-900/10 rounded-lg text-red-500 hover:bg-red-900/30 transition-colors" title="Widerrufen"><Trash2 className="w-4 h-4"/></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}


          {/* SCHICHT AUSWAHL MODAL (Langes DrÃ¼cken) */}
          {shiftModalData && (
             <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-safe" onClick={() => setShiftModalData(null)}>
                <div className="bg-neutral-950 border border-neutral-800 w-full sm:max-w-xs rounded-t-2xl sm:rounded-xl p-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                   <h3 className="text-white font-medium mb-1 text-center">Schicht wÃ¤hlen</h3>
                   <p className="text-neutral-500 text-xs text-center mb-4 border-b border-neutral-800 pb-3">{new Date(shiftModalData.dateStr).toLocaleDateString('de-DE')}</p>
                   
                   <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                      {(shiftModalData?.shifts || []).filter(Boolean).map(s => (
                         <button key={s.id} onClick={() => handleShiftModalSelect(s)} className="w-full py-3 rounded-xl text-sm font-semibold text-black transition-transform active:scale-95 shadow-sm" style={{backgroundColor: s?.color || '#ffffff'}}>
                            {s?.name || 'Schicht'} <span className="font-normal opacity-70 ml-2">{s?.time || ''}</span>
                         </button>
                      ))}
                      <button onClick={() => handleShiftModalSelect('delete')} className="w-full py-3 rounded-xl text-sm font-medium text-red-500 bg-red-500/10 border border-red-900/50 hover:bg-red-500/20 mt-4 transition-colors">
                         Frei / LÃ¶schen
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
                <input value={groupDraftName} onChange={(e) => setGroupDraftName(e.target.value)} placeholder="z.B. Team, Familieâ€¦" className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neutral-500 mt-2" />

                <div className="mt-5">
                  <label className="text-xs text-neutral-400">Mitglieder hinzufÃ¼gen</label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input value={groupMemberSearch} onChange={(e) => setGroupMemberSearch(e.target.value)} placeholder="Name suchenâ€¦" className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-neutral-500" />
                  </div>

                  {(groupMemberSearch || '').trim() !== '' && (
                    <div className="mt-2 max-h-52 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl">
                      {allProfiles
                        .filter(p => p.id !== user?.uid)
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
                      {allProfiles.filter(p => p.id !== user?.uid).filter(p => (p.username || '').toLowerCase().includes(groupMemberSearch.toLowerCase())).filter(p => !(groupDraftMembers || []).includes(p.id)).length === 0 && (
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
                            <button onClick={(e) => { e.stopPropagation(); setGroupDraftMembers(prev => (prev || []).filter(x => x !== id)); }} className="text-neutral-400 hover:text-white">Ã—</button>
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
                           <p className="text-2xl font-light text-white">{chatMessages.filter(m => m.senderId === user?.uid).length}</p>
                         </div>
                         <div className="bg-black border border-neutral-800 p-4 rounded-xl text-center">
                           <p className="text-xs text-neutral-500 uppercase mb-1">Von {safeTrim(getChatPartnerName(activeChat), "Unbekannt").slice(0,6)}.</p>
                           <p className="text-2xl font-light text-white">{chatMessages.filter(m => m.senderId !== user?.uid).length}</p>
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
                           const me = uid === user?.uid;
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
                               <input value={groupEditSearch} onChange={(e) => setGroupEditSearch(e.target.value)} placeholder="Mitglied hinzufÃ¼genâ€¦" className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-neutral-500" />
                             </div>
                             {(groupEditSearch || '').trim() !== '' && (
                               <div className="mt-2 max-h-40 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl">
                                 {allProfiles
                                   .filter(p => p.id !== user?.uid)
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
                                 {allProfiles.filter(p => p.id !== user?.uid).filter(p => (p.username || '').toLowerCase().includes(groupEditSearch.toLowerCase())).filter(p => !getChatParticipants(activeChatData || activeChat).includes(p.id)).length === 0 && (
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
                     <p className="text-sm text-neutral-300">Total <strong className="text-white ml-1">{chatTotalCount || chatMessages.length}</strong> Nachrichten</p>
                   </div>
                   <div className="mt-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                     <div className="flex items-center justify-between gap-3 mb-3">
                       <div>
                         <div className="text-xs uppercase tracking-widest text-neutral-500">Medien</div>
                         <div className="text-sm text-neutral-300">{chatMediaLoading ? 'Ladeâ€¦' : `${chatMediaItems.length} Bilder im Chat`}</div>
                       </div>
                       <button type="button" onClick={() => openChatMediaViewer(0)} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200 disabled:opacity-50" disabled={!chatMediaItems.length}>Galerie Ã¶ffnen</button>
                     </div>
                     {chatMediaItems.length > 0 ? (
                       <div className="grid grid-cols-4 gap-2">
                         {chatMediaItems.slice(0, 8).map((item, idx) => (
                           <button key={item.id} type="button" onClick={() => openChatMediaViewer(idx)} className="aspect-square rounded-xl overflow-hidden border border-neutral-800 bg-black">
                             <img src={item.src} alt="Medium" className="w-full h-full object-cover" />
                           </button>
                         ))}
                       </div>
                     ) : (
                       <div className="p-4 rounded-xl border border-dashed border-neutral-800 text-sm text-neutral-500 text-center">Noch keine Medien im Chat.</div>
                     )}
                   </div>
                </div>
             </div>
          )}

          {isChatMediaGalleryOpen && (
            <div className="fixed inset-0 z-[85] bg-black/95 backdrop-blur-sm flex flex-col">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-neutral-900">
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500">Medien</div>
                  <div className="text-sm text-neutral-300">{chatMediaItems.length ? `${chatMediaViewerIndex + 1} / ${chatMediaItems.length}` : '0 / 0'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => moveChatMediaViewer(-1)} className="p-2 rounded-xl border border-neutral-800 text-neutral-200 hover:bg-neutral-900" disabled={chatMediaItems.length <= 1}><ChevronLeft className="w-5 h-5" /></button>
                  <button type="button" onClick={() => moveChatMediaViewer(1)} className="p-2 rounded-xl border border-neutral-800 text-neutral-200 hover:bg-neutral-900" disabled={chatMediaItems.length <= 1}><ChevronRight className="w-5 h-5" /></button>
                  <button type="button" onClick={closeChatMediaViewer} className="p-2 rounded-xl border border-neutral-800 text-neutral-200 hover:bg-neutral-900"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-h-0 flex items-center justify-center p-4 md:p-8">
                  {chatMediaItems[chatMediaViewerIndex] ? (
                    <img src={chatMediaItems[chatMediaViewerIndex].src} alt="Medium Vollbild" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                  ) : (
                    <div className="text-neutral-500">Keine Medien vorhanden.</div>
                  )}
                </div>
                <div className="border-l border-neutral-900 min-h-0 flex flex-col bg-black/40">
                  <div className="p-4 border-b border-neutral-900 text-sm text-neutral-300">
                    <div>{senderLabelFromId(chatMediaItems[chatMediaViewerIndex]?.senderId || '')}</div>
                    <div className="text-xs text-neutral-500 mt-1">{chatMediaItems[chatMediaViewerIndex]?.timestamp ? new Date(chatMediaItems[chatMediaViewerIndex].timestamp).toLocaleString() : ''}</div>
                    {chatMediaItems[chatMediaViewerIndex]?.text && <div className="mt-2 text-xs text-neutral-400 whitespace-pre-wrap">{chatMediaItems[chatMediaViewerIndex].text}</div>}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2 content-start">
                    {(chatMediaItems || []).filter(Boolean).map((item, idx) => (
                      <button key={item.id} type="button" onClick={() => setChatMediaViewerIndex(idx)} className={`aspect-square rounded-xl overflow-hidden border ${idx === chatMediaViewerIndex ? 'border-white' : 'border-neutral-800'} bg-black`}>
                        <img src={item.src} alt="Medium Miniatur" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
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
                aria-label="SchlieÃŸen"
                title="SchlieÃŸen"
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
