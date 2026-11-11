// Builds two self-contained pages from src/:
//   dist/index.html      the browser version (fonts from Google Fonts)
//   dist/app/index.html  the Android app version (fonts embedded, edge-to-edge, works offline)
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, 'src'), dist = path.join(__dirname, 'dist');
const js = fs.readdirSync(src).filter((f) => f.endsWith('.js')).sort().map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
new Function(js.replace(/window\./g, 'globalThis.__w.')); // syntax check only
const tpl = fs.readFileSync(path.join(src, 'index.template.html'), 'utf8').replace('/*__GAME__*/', () => js);

const webFonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Grenze+Gotisch:wght@300;500;700&display=swap" rel="stylesheet">';
const face = (family, pkg, w) => {
  const f = path.join(__dirname, 'node_modules', '@fontsource', pkg, 'files', pkg + '-latin-' + w + '-normal.woff2');
  return "@font-face{font-family:'" + family + "';font-style:normal;font-weight:" + w + ';font-display:block;src:url(data:font/woff2;base64,' + fs.readFileSync(f).toString('base64') + ") format('woff2');}";
};
const appFonts = '<style>' + [face('Grenze Gotisch', 'grenze-gotisch', 300), face('Grenze Gotisch', 'grenze-gotisch', 500), face('Alegreya Sans', 'alegreya-sans', 400), face('Alegreya Sans', 'alegreya-sans', 500), face('Alegreya Sans', 'alegreya-sans', 700)].join('\n') + '</style>';
const appHead = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n' +
  "<script>window.RIMEBELL_APP = true; document.documentElement.classList.add('app');</script>";

const web = tpl.replace('<!--__APP_HEAD__-->', '').replace('<!--__FONTS__-->', webFonts);
const app = tpl.replace(/<meta name="viewport"[^>]*>\n<!--__APP_HEAD__-->/, appHead).replace('<!--__FONTS__-->', appFonts);
fs.mkdirSync(path.join(dist, 'app'), { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), web);
fs.writeFileSync(path.join(dist, 'app', 'index.html'), app);
console.log('built dist/index.html ' + (web.length / 1024).toFixed(1) + ' KB, dist/app/index.html ' + (app.length / 1024).toFixed(1) + ' KB');
