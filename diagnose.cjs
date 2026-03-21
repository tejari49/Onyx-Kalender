const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');
console.log("Lines:", code.split('\n').length);
console.log("Has customFirebaseConfig:", code.indexOf('const customFirebaseConfig') !== -1);
console.log("Has TABS array:", code.indexOf("const TABS = [") !== -1);
console.log("Has AccordionItem:", code.indexOf('AccordionItem') !== -1);
console.log("Has id design:", code.indexOf("id: 'design'") !== -1);
console.log("Has id booking:", code.indexOf("id: 'booking'") !== -1);
console.log("Has updateProfileField:", code.indexOf('updateProfileField') !== -1);
console.log("Has themes.css:", code.indexOf('themes.css') !== -1);
console.log("Has Palette:", code.indexOf('Palette') !== -1);
console.log("Has BookingHostManager:", code.indexOf('BookingHostManager') !== -1);
// Show first 500 chars
console.log("\nFirst 500 chars:\n", code.slice(0, 500));
