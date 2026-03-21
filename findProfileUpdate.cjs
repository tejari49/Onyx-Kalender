const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');

const targetStr = `const updateProfile`;
const idx = code.indexOf(targetStr);
if (idx !== -1) {
    console.log("Found:", code.slice(idx, idx + 500));
} else {
    // maybe saveProfile?
    const t2 = `const saveProfile`;
    const idx2 = code.indexOf(t2);
    if (idx2 !== -1) {
        console.log("Found:", code.slice(idx2, idx2 + 500));
    } else {
        // Find general updateDoc for userProfile
        let it = code.indexOf(`updateDoc`);
        while (it !== -1) {
            let context = code.slice(Math.max(0, it - 50), it + 150);
            if (context.includes('users') || context.includes('profile')) {
                console.log("Found updateDoc:", context);
            }
            it = code.indexOf(`updateDoc`, it + 9);
        }
    }
}
