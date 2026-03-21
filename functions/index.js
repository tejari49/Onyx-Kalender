const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

const REGION = "europe-west6";
const FIRESTORE_TRIGGER_REGION = "europe-west1";
const APP_LINK = process.env.APP_LINK || "";
const APP_TIME_ZONE = "Europe/Zurich";
const REMINDER_LOOKAHEAD_MS = 90 * 1000;
const PROFILE_PAGE_SIZE = 250;

const CHAT_NEUTRAL_QUOTES = [
  "Eine neue diskrete Nachricht ist eingetroffen.",
  "Etwas Neues wartet im Secret Chat.",
  "Du hast eine neue private Nachricht.",
  "Im geschützten Chat gibt es ein Update.",
  "Eine stille Nachricht ist für dich da."
];

const fnv1a32 = (input) => {
  let h = 0x811c9dc5;
  const s = String(input || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

const pickChatQuote = (seed = "") => {
  const list =
    Array.isArray(CHAT_NEUTRAL_QUOTES) && CHAT_NEUTRAL_QUOTES.length
      ? CHAT_NEUTRAL_QUOTES
      : ["Eine neue diskrete Nachricht ist eingetroffen."];
  const idx = fnv1a32(String(seed || Date.now())) % list.length;
  return list[idx] || list[0];
};

const normalizeTokenList = (...values) => {
  const out = [];
  const seen = new Set();

  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const token = String(item || "").trim();
        if (!token || seen.has(token)) continue;
        seen.add(token);
        out.push(token);
      }
      continue;
    }

    const token = String(value || "").trim();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }

  return out;
};

const parseIntSafe = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const getPartsInZone = (timestampMs, timeZone = APP_TIME_ZONE) => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = fmt.formatToParts(new Date(timestampMs));
  const map = {};

  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  return {
    year: parseIntSafe(map.year),
    month: parseIntSafe(map.month),
    day: parseIntSafe(map.day),
    hour: parseIntSafe(map.hour),
    minute: parseIntSafe(map.minute),
    second: parseIntSafe(map.second) || 0,
  };
};

const getZoneOffsetMsAtUtc = (utcTs, timeZone = APP_TIME_ZONE) => {
  const p = getPartsInZone(utcTs, timeZone);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
    0
  );
  return asUtc - utcTs;
};

const parseDateTimeInZoneMs = (dateStr, timeStr, timeZone = APP_TIME_ZONE) => {
  if (!dateStr || !timeStr) return null;

  const dateParts = String(dateStr).split("-").map((n) => parseIntSafe(n));
  const timeParts = String(timeStr).split(":").map((n) => parseIntSafe(n));

  if (dateParts.some((n) => n === null) || timeParts.some((n) => n === null)) {
    return null;
  }

  const [y, m, d] = dateParts;
  const hh = timeParts[0];
  const mm = timeParts[1];

  let utcTs = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const offset1 = getZoneOffsetMsAtUtc(utcTs, timeZone);
  utcTs -= offset1;

  const offset2 = getZoneOffsetMsAtUtc(utcTs, timeZone);
  if (offset2 !== offset1) utcTs -= offset2 - offset1;

  return utcTs;
};

const dateStrInZone = (ts = Date.now(), timeZone = APP_TIME_ZONE) => {
  const p = getPartsInZone(ts, timeZone);
  if (!p.year || !p.month || !p.day) {
    return new Date(ts).toISOString().slice(0, 10);
  }
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(
    2,
    "0"
  )}-${String(p.day).padStart(2, "0")}`;
};

const addDaysStr = (dateStr, delta) => {
  const [y, m, d] = String(dateStr).split("-").map((n) => parseIntSafe(n));
  if (!y || !m || !d) return dateStr;

  const ts = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + delta * 86400000;
  const dt = new Date(ts);

  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

const effectiveReminderMinutes = (eventData = {}, profileData = {}) => {
  const mode = String(eventData.reminderMode || "default");

  if (mode === "none") return null;

  if (mode === "custom") {
    const m = parseIntSafe(eventData.reminderMinutes);
    return m === null ? null : Math.max(0, m);
  }

  const def = parseIntSafe(profileData.defaultReminderMinutes);
  return def === null ? null : Math.max(0, def);
};

const isValidHttpsUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

exports.sendPushTestOnCreate = onDocumentCreated(
  {
    region: FIRESTORE_TRIGGER_REGION,
    document: "artifacts/{appId}/public/data/pushTests/{testId}",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() || {};
    const testRef = snap.ref;
    const appId = event.params.appId;
    const testId = event.params.testId;
    const uid = String(data.uid || "");
    const status = String(data.status || "pending");

    if (!uid || status !== "pending") return;

    try {
      const profileRef = admin
        .firestore()
        .doc(`artifacts/${appId}/public/data/profiles/${uid}`);

      const profileSnap = await profileRef.get();
      const tokenFromProfile = profileSnap.exists
        ? profileSnap.get("fcmTokenWeb") || profileSnap.get("fcmToken")
        : null;
      const tokenFromTestDoc =
        data && (data.fcmTokenWeb || data.fcmToken)
          ? data.fcmTokenWeb || data.fcmToken
          : null;

      const token = String(tokenFromProfile || tokenFromTestDoc || "").trim();

      if (!token) {
        await testRef.set(
          {
            status: "error",
            lastError: "NO_FCM_TOKEN_IN_PROFILE_OR_TESTDOC",
            updatedAt: Date.now(),
          },
          { merge: true }
        );
        return;
      }

      const baseMessage = {
        token,
        notification: {
          title: "Onyx Test",
          body: "Server-Push funktioniert",
        },
        data: {
          kind: "test",
          forceShow: "1",
          tag: `onyx_test_${testId}`,
          title: "Onyx Test",
          body: "Server-Push funktioniert",
        },
      };

      const hasLink = isValidHttpsUrl(APP_LINK);

      const firstTryMessage = hasLink
        ? {
            ...baseMessage,
            webpush: {
              fcmOptions: { link: APP_LINK },
              headers: { Urgency: "high" },
            },
          }
        : {
            ...baseMessage,
            webpush: {
              headers: { Urgency: "high" },
            },
          };

      let msgId = "";

      try {
        msgId = await admin.messaging().send(firstTryMessage);
      } catch (sendErr) {
        const sendCode = String(sendErr?.code || "");
        const sendMsg = String(sendErr?.message || sendErr || "");
        const isInternal =
          sendCode.includes("messaging/internal-error") ||
          sendMsg.includes("messaging/internal-error");

        if (!isInternal) throw sendErr;

        msgId = await admin.messaging().send(baseMessage);
      }

      await testRef.set(
        {
          status: "sent",
          fcmMessageId: msgId,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (e) {
      await testRef.set(
        {
          status: "error",
          lastError: `${String(e?.code || "unknown")}: ${String(
            e?.message || e
          )}`.slice(0, 500),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }
  }
);

exports.sendDueEventReminders = onSchedule(
  {
    region: REGION,
    schedule: "every 1 minutes",
    timeZone: APP_TIME_ZONE,
    retryCount: 0,
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const dueMin = now - 30 * 1000;
    const dueMax = now + REMINDER_LOOKAHEAD_MS;
    const today = dateStrInZone(now);
    const tomorrow = addDaysStr(today, 1);

    const artifactDocs = await db.collection("artifacts").listDocuments();

    for (const artifactRef of artifactDocs) {
      const appId = artifactRef.id;
      let lastDoc = null;

      while (true) {
        let query = db
          .collection(`artifacts/${appId}/public/data/profiles`)
          .orderBy(admin.firestore.FieldPath.documentId())
          .limit(PROFILE_PAGE_SIZE);

        if (lastDoc) query = query.startAfter(lastDoc);

        const profilesSnap = await query.get();
        if (profilesSnap.empty) break;

        for (const profileDoc of profilesSnap.docs) {
          const uid = profileDoc.id;
          const profile = profileDoc.data() || {};
          const token = String(profile.fcmTokenWeb || profile.fcmToken || "").trim();
          if (!token) continue;

          const eventsSnap = await db
            .collection(`artifacts/${appId}/users/${uid}/events`)
            .where("date", ">=", today)
            .where("date", "<=", tomorrow)
            .get();

          for (const evDoc of eventsSnap.docs) {
            const ev = evDoc.data() || {};
            if (!ev.time || !ev.date) continue;
            if (String(ev.type || "") === "shift") continue;

            const mins = effectiveReminderMinutes(ev, profile);
            if (mins === null) continue;

            const startMs = parseDateTimeInZoneMs(ev.date, ev.time, APP_TIME_ZONE);
            if (!startMs) continue;

            const dueMs = startMs - mins * 60000;
            if (dueMs < dueMin || dueMs > dueMax) continue;

            const dedupeRaw = `${appId}:${uid}:${evDoc.id}:${ev.date}:${ev.time}:${mins}`;
            const dedupeId = `r_${fnv1a32(dedupeRaw)}`;
            const lockRef = db.doc(`artifacts/${appId}/public/data/reminderLocks/${dedupeId}`);

            let lockCreated = false;

            try {
              await db.runTransaction(async (tx) => {
                const lockSnap = await tx.get(lockRef);
                if (lockSnap.exists) return;

                tx.set(lockRef, {
                  uid,
                  eventId: evDoc.id,
                  dueMs,
                  createdAt: Date.now(),
                });

                lockCreated = true;
              });
            } catch (_) {
              continue;
            }

            if (!lockCreated) continue;

            const title = "Erinnerung";
            const body = `${String(ev.title || "Termin")} • ${String(ev.time || "")}`;
            const tag = `onyx_event_${fnv1a32(`${uid}:${evDoc.id}:${mins}:${dueMs}`)}`;

            try {
              const hasLink = isValidHttpsUrl(APP_LINK);

              await admin.messaging().send({
                token,
                notification: { title, body },
                data: {
                  kind: "reminder",
                  title,
                  body,
                  tag,
                  eventId: evDoc.id,
                  occurrenceDate: String(ev.date || ""),
                },
                webpush: {
                  headers: { Urgency: "high", TTL: "120" },
                  ...(hasLink ? { fcmOptions: { link: APP_LINK } } : {}),
                },
              });

              await lockRef.set({ sentAt: Date.now() }, { merge: true });
            } catch (e) {
              await lockRef.set(
                {
                  sendError: `${String(e?.code || "unknown")}: ${String(
                    e?.message || e
                  )}`.slice(0, 300),
                  failedAt: Date.now(),
                },
                { merge: true }
              );
            }
          }
        }

        lastDoc = profilesSnap.docs[profilesSnap.docs.length - 1];
        if (profilesSnap.size < PROFILE_PAGE_SIZE) break;
      }
    }
  }
);

exports.sendChatPushOnCreate = onDocumentCreated(
  {
    region: FIRESTORE_TRIGGER_REGION,
    document: "artifacts/{appId}/public/data/chats/{chatId}/messages/{messageId}",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const message = snap.data() || {};
    const appId = String(event.params.appId || "");
    const chatId = String(event.params.chatId || "");
    const messageId = String(event.params.messageId || "");
    const senderId = String(message.senderId || "");
    const createdAtMs =
      Number(message.timestamp || message.createdAtMs || Date.now()) || Date.now();

    if (!appId || !chatId || !messageId || !senderId) return;

    try {
      const db = admin.firestore();
      const chatRef = db.doc(`artifacts/${appId}/public/data/chats/${chatId}`);
      const chatSnap = await chatRef.get();
      if (!chatSnap.exists) return;

      const chat = chatSnap.data() || {};
      const participants = Array.isArray(chat.participants)
        ? chat.participants
            .map((v) => String(v || "").trim())
            .filter(Boolean)
        : [];

      const recipientIds = participants.filter((uid) => uid && uid !== senderId);
      if (!recipientIds.length) return;

      const senderProfileSnap = await db
        .doc(`artifacts/${appId}/public/data/profiles/${senderId}`)
        .get()
        .catch(() => null);

      const senderProfile =
        senderProfileSnap && senderProfileSnap.exists
          ? senderProfileSnap.data() || {}
          : {};

      const senderName = String(
        senderProfile.displayName ||
          senderProfile.username ||
          senderProfile.email ||
          "Kontakt"
      );

      const quote = pickChatQuote(`${chatId}:${messageId}:${senderId}`);
      const isGroup = String(chat.type || "") === "group" || participants.length > 2;
      const title = isGroup ? "Kalender Aktuell 🔏" : "Kalender Aktuell 🔏";

      const baseData = {
        kind: "chat",
        title,
        body: quote,
        chatId,
        messageId,
        senderId,
        senderName,
        sentAt: String(createdAtMs),
        tag: `onyx_chat_${chatId}`,
      };

      const hasLink = isValidHttpsUrl(APP_LINK);

      for (const recipientId of recipientIds) {
        const profileRef = db.doc(`artifacts/${appId}/public/data/profiles/${recipientId}`);
        const profileSnap = await profileRef.get();
        if (!profileSnap.exists) continue;

        const profile = profileSnap.data() || {};
        const mutedChatIds = Array.isArray(profile.mutedChatIds)
          ? profile.mutedChatIds.map((v) => String(v || ""))
          : [];

        if (mutedChatIds.includes(chatId)) continue;

        const tokens = normalizeTokenList(
          profile.fcmTokenWeb,
          profile.fcmToken,
          profile.fcmTokensWeb,
          profile.fcmTokens
        );

        if (!tokens.length) continue;

        for (const token of tokens) {
          try {
            await admin.messaging().send({
              token,
              notification: {
                title,
                body: quote,
              },
              data: {
                ...baseData,
                recipientId,
              },
              webpush: {
                headers: { Urgency: "high", TTL: "120" },
                ...(hasLink ? { fcmOptions: { link: APP_LINK } } : {}),
              },
            });
          } catch (e) {
            const errCode = String(e?.code || e?.errorInfo?.code || "");
            if (
              errCode.includes("registration-token-not-registered") ||
              errCode.includes("invalid-registration-token")
            ) {
              await profileRef
                .set(
                  {
                    fcmTokenWeb:
                      profile.fcmTokenWeb === token
                        ? admin.firestore.FieldValue.delete()
                        : profile.fcmTokenWeb,
                    fcmToken:
                      profile.fcmToken === token
                        ? admin.firestore.FieldValue.delete()
                        : profile.fcmToken,
                    updatedAt: Date.now(),
                  },
                  { merge: true }
                )
                .catch(() => {});
            }
          }
        }
      }

      await chatRef
        .set({ lastServerPushAt: Date.now() }, { merge: true })
        .catch(() => {});
    } catch (_) {
      return;
    }
  }
);