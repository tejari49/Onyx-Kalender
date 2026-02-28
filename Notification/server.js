const admin = require("firebase-admin");
const cron = require("node-cron");

// ACHTUNG: Du musst dir in den Firebase Projekteinstellungen unter "Dienstkonten" 
// einen "Neuen privaten Schlüssel generieren". Die heruntergeladene JSON-Datei
// legst du neben diese Datei und nennst sie serviceAccountKey.json
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const APP_ID = 'onyx-pwa-live'; // Gleiche ID wie im Frontend
const startTime = Date.now();

console.log("Onyx Backend gestartet. Überwache Termine und Chats...");

// 1. CHAT-ÜBERWACHUNG (Live Push)
db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('chats')
  .onSnapshot(async snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'modified' || change.type === 'added') {
        const chatData = change.doc.data();
        
        // Nur reagieren, wenn es nach dem Serverstart passierte und eine neue Nachricht ist
        if (chatData.updatedAt > startTime && chatData.lastMessageSenderId) {
           const senderId = chatData.lastMessageSenderId;
           const receiverId = chatData.participants.find(id => id !== senderId);
           if(!receiverId) return;

           const receiverDoc = await db.doc(`artifacts/${APP_ID}/public/data/profiles/${receiverId}`).get();
           if (receiverDoc.exists && receiverDoc.data().fcmToken) {
              const senderDoc = await db.doc(`artifacts/${APP_ID}/public/data/profiles/${senderId}`).get();
              const senderName = senderDoc.exists ? senderDoc.data().username : "Jemand";

              admin.messaging().send({
                 token: receiverDoc.data().fcmToken,
                 notification: {
                    title: `Neue Nachricht von ${senderName} 🔒`,
                    body: "Tippe hier, um den sicheren Chat zu öffnen."
                 }
              }).catch(e => console.log("FCM Fehler (Chat):", e.message));
           }
        }
      }
    });
  });

// 2. KALENDER-ÜBERWACHUNG (Minütlicher Cron-Job)
cron.schedule('* * * * *', async () => {
   const targetTime = new Date(Date.now() + 15 * 60000); // Exakt in 15 Minuten
   const dateStr = targetTime.toISOString().split('T')[0];
   const timeStr = targetTime.toTimeString().substring(0,5); // Format: "15:30"

   try {
     const profilesSnap = await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('profiles').get();
     
     profilesSnap.forEach(async profileDoc => {
        const profile = profileDoc.data();
        if (profile.fcmToken && profile.uid) {
           const eventsSnap = await db.collection('artifacts').doc(APP_ID).collection('users').doc(profile.uid).collection('events')
              .where('date', '==', dateStr)
              .where('time', '==', timeStr)
              .get();

           eventsSnap.forEach(eventDoc => {
              const eventData = eventDoc.data();
              admin.messaging().send({
                 token: profile.fcmToken,
                 notification: {
                    title: `🗓️ Erinnerung: ${eventData.title}`,
                    body: `Beginnt in 15 Minuten (${eventData.time} Uhr)`
                 }
              }).catch(e => console.log("FCM Fehler (Kalender):", e.message));
           });
        }
     });
   } catch(error) {
       console.error("Fehler beim Kalender-Cronjob:", error);
   }
});

// Ein minimaler Webserver, damit Anbieter wie Render.com das Skript nicht stoppen
const http = require('http');
http.createServer((req, res) => { res.writeHead(200); res.end('Onyx Server Online'); }).listen(process.env.PORT || 3000);
