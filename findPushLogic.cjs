const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');
const searchStr = `ensureWebPushToken = async`;
const startIdx = code.indexOf(searchStr);

if (startIdx !== -1) {
    const snippet = code.slice(startIdx, startIdx + 1500);
    fs.writeFileSync('pushLogicOutput.txt', snippet);
}
