// Optional packaging for the existing Sites hosting configuration.
// GitHub Pages serves index.html directly from the repository root.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const file of ['index.html', '.nojekyll', 'style.css', 'night.css', 'jogos.css', 'design.css', 'personalizar.js', 'script.js', 'jogos.js']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.cpSync(path.join(root, 'fotos'), path.join(output, 'fotos'), { recursive: true });
console.log('Static Site package prepared in dist/.');
