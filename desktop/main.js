// Wuju Calc, application de bureau.
// Ouvre le site du dépôt et lui transmet, une fois par seconde, ce que le jeu publie
// sur son API locale officielle (Live Client Data). Aucun accès au processus du jeu.
const { app, BrowserWindow, shell } = require('electron');
const https = require('https');
const path = require('path');

const GAME = { host: '127.0.0.1', port: 2999, path: '/liveclientdata/allgamedata' };
const EVERY_MS = { game: 1000, idle: 3000 };     // en partie / hors partie
let win = null, timer = null;

function send(channel, payload) { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); }

function poll() {
  let next = EVERY_MS.idle;
  const done = () => { timer = setTimeout(poll, next); };
  // Le jeu utilise un certificat signé par Riot, absent des autorités connues de Node.
  // La vérification n'est désactivée que pour cette requête vers la machine locale.
  const req = https.get({ ...GAME, rejectUnauthorized: false, timeout: 900 }, res => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', c => { body += c; });
    res.on('end', () => {
      try {
        if (res.statusCode === 200) { send('live:data', JSON.parse(body)); next = EVERY_MS.game; }
        else { send('live:status', 'loading'); next = EVERY_MS.game; }     // écran de chargement
      } catch (e) { send('live:status', 'loading'); }
      done();
    });
  });
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.on('error', () => { send('live:status', 'idle'); done(); });           // aucune partie en cours
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 980, minWidth: 420, minHeight: 600,
    backgroundColor: '#0b0914', autoHideMenuBar: true, title: 'Wuju Calc',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  // La fenêtre ne navigue nulle part : les liens externes s'ouvrent dans le navigateur.
  win.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('https://')) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.once('did-finish-load', poll);
  win.on('closed', () => { clearTimeout(timer); win = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
