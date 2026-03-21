const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8').replace(/\r\n/g, '\n');

// BLOCK ERROR BOUNDARY
const blockStartStr = `    class ErrorBoundary extends React.Component {`;
const blockEndStr = `        return this.props.children;
      }
    }`;

function extractBlock(startStr, endStr) {
    const startObj = appCode.indexOf(startStr);
    if (startObj === -1) throw new Error("Start not found:\n" + startStr);
    
    // Exact search for end string
    const endObj = appCode.indexOf(endStr, startObj);
    if (endObj === -1) throw new Error("Full End not found:\n" + endStr);
    
    const blockRaw = appCode.slice(startObj, endObj + endStr.length);
    appCode = appCode.slice(0, startObj) + appCode.slice(endObj + endStr.length);
    return blockRaw;
}

try {
    const blockRaw = extractBlock(blockStartStr, blockEndStr);

    let componentCode = `import React from 'react';\n\nexport default ` + blockRaw.trim() + `\n`;
    
    const compDir = path.join(cwd, 'src', 'components');
    if (!fs.existsSync(compDir)) fs.mkdirSync(compDir);
    fs.writeFileSync(path.join(compDir, 'ErrorBoundary.jsx'), componentCode);

    const importStmt = `import ErrorBoundary from './components/ErrorBoundary.jsx';\n`;

    const importPoint = appCode.indexOf('import { \n');
    if (importPoint !== -1) {
        appCode = appCode.slice(0, importPoint) + importStmt + appCode.slice(importPoint);
    } else {
        appCode = importStmt + appCode;
    }
    
    // Also remove the `// --- ERROR BOUNDARY...` comment above it to be perfectly clean
    appCode = appCode.replace(/    \/\/ --- ERROR BOUNDARY \(verhindert "schwarzer Screen" bei Runtime-Fehlern\) ---\n\n/g, '');

    fs.writeFileSync(appFile, appCode);
    console.log("SUCCESS_ERROR_BOUNDARY");
} catch (err) {
    console.error("FAIL:", err.message);
    process.exit(1);
}
