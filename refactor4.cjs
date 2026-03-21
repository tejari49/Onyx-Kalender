const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8').replace(/\r\n/g, '\n');

const blockStartStr = `          {/* IMAGE VIEWER (Vollbild) */}`;
const blockEndStr = `    </div>
          )}`;

const startObj = appCode.indexOf(blockStartStr);
if (startObj === -1) {
    console.error("Start not found");
    process.exit(1);
}

const endObjSearch = appCode.indexOf("              />", startObj);
const endObj = appCode.indexOf(blockEndStr, endObjSearch);

if (endObj === -1) {
    console.error("End not found");
    process.exit(1);
}

const blockRaw = appCode.slice(startObj, endObj + blockEndStr.length);

const componentCode = `import React from 'react';
import { X } from 'lucide-react';

export default function ImageViewer({ isOpen, src, onClose }) {
  if (!isOpen || !src) return null;
  
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/70 border border-neutral-700 text-white hover:bg-neutral-800 transition-colors"
        aria-label="Schliessen"
        title="Schliessen"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt="Bild"
        className="max-h-[90vh] max-w-[95vw] object-contain rounded-2xl border border-neutral-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
`;

const compDir = path.join(cwd, 'src', 'components');
if (!fs.existsSync(compDir)) fs.mkdirSync(compDir);
fs.writeFileSync(path.join(compDir, 'ImageViewer.jsx'), componentCode);

// Replace the block with the component usage
const replacement = `          <ImageViewer isOpen={isImageViewerOpen} src={imageViewerSrc} onClose={closeImageViewer} />\n`;
appCode = appCode.slice(0, startObj) + replacement + appCode.slice(endObj + blockEndStr.length);

// Add import
const importStmt = `import ImageViewer from './components/ImageViewer.jsx';\n`;
const importPoint = appCode.indexOf('import { \n');
if (importPoint !== -1) {
    appCode = appCode.slice(0, importPoint) + importStmt + appCode.slice(importPoint);
} else {
    appCode = importStmt + appCode;
}

fs.writeFileSync(appFile, appCode);
console.log("SUCCESS_IMAGE_VIEWER");
