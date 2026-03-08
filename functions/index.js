const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

const REGION = "europe-west6";
const APP_LINK = "https://DEINE-RENDER-URL.onrender.com"; // <- anpassen

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
      const token = profileSnap.exists ? profileSnap.get("fcmTokenWeb") : null;

      if (!token) {
        await testRef.set(
          { status: "error", lastError: "NO_FCM_TOKEN", updatedAt: Date.now() },
          { merge: true }
        );
        return;
      }

      const message = {
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
        webpush: {
          fcmOptions: { link: APP_LINK },
          headers: { Urgency: "high" },
        },
      };

      const msgId = await admin.messaging().send(message);

      await testRef.set(
        { status: "sent", fcmMessageId: msgId, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (e) {
      await testRef.set(
        { status: "error", lastError: String(e?.message || e), updatedAt: Date.now() },
        { merge: true }
      );
    }
  }
);
