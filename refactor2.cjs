const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8').replace(/\r\n/g, '\n'); // Normalize newlines!

// BLOCK A
const blockAStartStr = `const DEFAULT_EXTRAS_ORDER = ['workclock','goals','sollist','notes','weather'];`;
const blockAEndStr = `    function reorderExtraKeys(list, draggedKey, targetKey) {
      const src = normalizeExtrasOrder(list);
      const from = src.indexOf(String(draggedKey || ''));
      const to = src.indexOf(String(targetKey || ''));
      if (from < 0 || to < 0 || from === to) return src;
      const next = src.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    }`; // exactly multiline string to avoid newline guesswork

// BLOCK B
const blockBStartStr = `const PASTEL_COLORS = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF', '#D3D3D3', '#FFC8DD'];`;
const blockBEndStr = `    const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];`;

// BLOCK C
const blockCStartStr = `function safeTrim(v) {`;
const blockCEndStr = `    function shortId(id, n = 6) {
      const s = String(id || '');
      if (s.length <= n) return s;
      return s.slice(0, n);
    }`;

function extractBlock(startStr, endStr) {
    const startObj = appCode.indexOf(startStr);
    if (startObj === -1) throw new Error("Start not found: " + startStr.substring(0,30));
    
    // We only need a partial match for endStr if it's long, but indexOf requires exact.
    // Let's use indexOf with the first line of endStr if it's multiline.
    const endStrLines = endStr.split('\n');
    const endObjSearch = appCode.indexOf(endStrLines[0], startObj);
    if (endObjSearch === -1) throw new Error("End not found: " + endStrLines[0].substring(0,30));
    
    // Now find the literal end of the block based on the exact full endStr
    const endObj = appCode.indexOf(endStr, startObj);
    if (endObj === -1) throw new Error("Full End not found:\n" + endStr);
    
    const blockRaw = appCode.slice(startObj, endObj + endStr.length);
    appCode = appCode.slice(0, startObj) + appCode.slice(endObj + endStr.length);
    return blockRaw;
}

try {
    const blockA = extractBlock(blockAStartStr, blockAEndStr);
    const blockB = extractBlock(blockBStartStr, blockBEndStr);
    const blockC = extractBlock(blockCStartStr, blockCEndStr);

    let helpersCode = blockA + "\n\n" + blockB + "\n\n" + blockC + "\n";
    
    // Exports
    helpersCode = helpersCode.replace(/^(\s*)function\s+([a-zA-Z0-9_]+)/gm, '$1export function $2');
    helpersCode = helpersCode.replace(/^(\s*)const\s+([a-zA-Z0-9_]+)\s*=/gm, '$1export const $2 =');

    const utilsDir = path.join(cwd, 'src', 'utils');
    if (!fs.existsSync(utilsDir)) fs.mkdirSync(utilsDir);
    fs.writeFileSync(path.join(utilsDir, 'helpers.js'), helpersCode);

    // Extract names for import
    const exportedNames = [];
    const exportRegex = /export\s+(?:function|const)\s+([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = exportRegex.exec(helpersCode)) !== null) {
        exportedNames.push(match[1]);
    }

    const importStmt = `import { \n  ${exportedNames.join(', ')} \n} from './utils/helpers.js';\n\n`;

    const importPoint = appCode.indexOf('import heic2any');
    if (importPoint !== -1) {
        const importEnd = appCode.indexOf(';', importPoint) + 2;
        appCode = appCode.slice(0, importEnd) + importStmt + appCode.slice(importEnd);
    } else {
        appCode = importStmt + appCode;
    }

    fs.writeFileSync(appFile, appCode);
    console.log("SUCCESS_HELPERS");
} catch (err) {
    console.error("FAIL:", err.message);
    process.exit(1);
}
