const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

const REGION = "europe-west6";
const APP_LINK = process.env.APP_LINK || ""; // optional, z.B. https://deine-domain.tld
const REMINDER_LOOKAHEAD_MS = 90 * 1000;

const fnv1a32 = (input) => {
  let h = 0x811c9dc5;
  const s = String(input || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0);
};

const parseDateTimeLocalMs = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = String(dateStr).split("-").map((n) => parseInt(n, 10));
  const [hh, mm] = String(timeStr).split(":").map((n) => parseInt(n, 10));
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
};

const addDaysStr = (dateStr, delta) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
};

const effectiveReminderMinutes = (eventData = {}, profileData = {}) => {
  const mode = String(eventData.reminderMode || "default");
  if (mode === "none") return null;
  if (mode === "custom") {
    const m = parseInt(eventData.reminderMinutes, 10);
    return Number.isNaN(m) ? null : Math.max(0, m);
  }
  const def = parseInt(profileData.defaultReminderMinutes, 10);
  return Number.isNaN(def) ? null : Math.max(0, def);
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
    region: REGION,
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
      const tokenFromProfile = profileSnap.exists ? (profileSnap.get("fcmTokenWeb") || profileSnap.get("fcmToken")) : null;
      const tokenFromTestDoc = data && (data.fcmTokenWeb || data.fcmToken) ? (data.fcmTokenWeb || data.fcmToken) : null;
      const token = String(tokenFromProfile || tokenFromTestDoc || "").trim();

      if (!token) {
        await testRef.set(
          { status: "error", lastError: "NO_FCM_TOKEN_IN_PROFILE_OR_TESTDOC", updatedAt: Date.now() },
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
      const firstTryMessage = hasLink ? {
        ...baseMessage,
        webpush: {
          fcmOptions: { link: APP_LINK },
          headers: { Urgency: "high" },
        },
      } : {
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
        const isInternal = sendCode.includes("messaging/internal-error") || sendMsg.includes("messaging/internal-error");
        if (!isInternal) throw sendErr;

        // Fallback für sporadische FCM/Internal-Errors: ohne webpush-Optionen erneut senden.
        msgId = await admin.messaging().send(baseMessage);
      }

      await testRef.set(
        { status: "sent", fcmMessageId: msgId, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (e) {
      await testRef.set(
        { status: "error", lastError: `${String(e?.code || "unknown")}: ${String(e?.message || e)}`.slice(0, 500), updatedAt: Date.now() },
        { merge: true }
      );
    }
  }
);

exports.sendDueEventReminders = onSchedule(
  {
    region: REGION,
    schedule: "every 1 minutes",
    timeZone: "Europe/Zurich",
    retryCount: 0,
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const dueMin = now - 30 * 1000;
    const dueMax = now + REMINDER_LOOKAHEAD_MS;

    const artifactDocs = await db.collection("artifacts").listDocuments();

    for (const artifactRef of artifactDocs) {
      const appId = artifactRef.id;
      const profilesSnap = await db
        .collection(`artifacts/${appId}/public/data/profiles`)
        .where("fcmTokenWeb", "!=", null)
        .limit(200)
        .get();

      for (const profileDoc of profilesSnap.docs) {
        const uid = profileDoc.id;
        const profile = profileDoc.data() || {};
        const token = String(profile.fcmTokenWeb || profile.fcmToken || "").trim();
        if (!token) continue;

        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = addDaysStr(today, 1);
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

          const startMs = parseDateTimeLocalMs(ev.date, ev.time);
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
                fcmOptions: isValidHttpsUrl(APP_LINK) ? { link: APP_LINK } : undefined,
              },
            });
          } catch (e) {
            await lockRef.set(
              {
                sendError: `${String(e?.code || "unknown")}: ${String(e?.message || e)}`.slice(0, 300),
                failedAt: Date.now(),
              },
              { merge: true }
            );
          }
        }
      }
    }
  }
);
