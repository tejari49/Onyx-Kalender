const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');

const tIdx = code.indexOf("currentView === 'home'");
if (tIdx !== -1) {
    const start = Math.max(0, tIdx - 200);
    const end = Math.min(code.length, tIdx + 4000);
    fs.writeFileSync('dashboardSnippet.txt', code.slice(start, end));
    console.log("WROTE_SNIPPET");
} else {
    console.log("NOT_FOUND");
}
