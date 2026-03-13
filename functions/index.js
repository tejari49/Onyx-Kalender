const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

const REGION = "europe-west6";
const APP_LINK = process.env.APP_LINK || ""; // optional, z.B. https://deine-domain.tld

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
