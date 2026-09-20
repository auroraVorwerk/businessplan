/* ================= Konto, Team, Cloud ================= */
/* ▼▼▼ Firebase: hier die Zugangsdaten aus der Firebase-Konsole eintragen ▼▼▼ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAqTQoE4qKzjZ1ef2No33guv40qZVZLCUQ",
  authDomain: "businessplan-digital.firebaseapp.com",
  databaseURL: "https://businessplan-digital-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "businessplan-digital",
  storageBucket: "businessplan-digital.firebasestorage.app",
  messagingSenderId: "813567632305",
  appId: "1:813567632305:web:a55102ceccc82a4ad7d390"
};
/* ▲▲▲ Bleibt das leer, läuft alles nur lokal im Browser ▲▲▲ */

/* Adresse des Kalender-Workers – einmal eintragen, ohne Schrägstrich am Ende */
const KALENDER_BASIS = "https://bunte-woche-kalender.aurorabrosen.workers.dev";


let db = null, auth = null, me = null;
try{
  if(FIREBASE_CONFIG.databaseURL && typeof firebase !== "undefined"){
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    auth = firebase.auth();
  }
}catch(err){ db = null; auth = null; }
/* Aus der DK-Nummer wird eine technische Mailadresse für Firebase Auth */
const mailOf = dk => dk.toLowerCase().replace(/[^a-z0-9]/g,"") + "@bunte-woche.app";

/* Lokaler Speicher – schlägt er fehl, läuft die App trotzdem */
const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const DK_RE = /^(V-|TL-)?DK\d{8}$/;
const istAdmin      = () => !!me && me.dk.startsWith("V-DK");
/* Teamleiter ist, wer eine TL-DK-Nummer hat ODER im Datensatz ausdruecklich
   als Teamleader eingetragen ist. Das zweite gibt es fuer alle, die sich
   versehentlich ohne das Kuerzel registriert haben - so bleiben Daten,
   Anmeldung und Firebase-Regeln unveraendert. */
const istTeamleiter = () => !!me &&
  (me.dk.startsWith("TL-DK") || me.rolle === "Teamleader" || istAdmin());
const rolleAus = dk => dk.startsWith("V-DK") ? "Admin" : (dk.startsWith("TL-DK") ? "Teamleader" : "Kundenberater");
const SEED_USERS = {
  "V-DK00000000": {dk:"V-DK00000000", vorname:"admin", nachname:"admin", rolle:"Admin", team:[]}
};
function localUsers(){ const u = store.get('bw-users'); return u || {...SEED_USERS}; }
async function userGet(dk){
  if(db){
    const s = await db.ref('users/'+dk).once('value');   // Fehler bewusst weiterreichen
    return s.val();
  }
  return localUsers()[dk] || null;
}
/* WICHTIG: hier stand frueher .set() - das ueberschrieb den ganzen Datensatz
   und loeschte dabei "leader". Genau daran haengt in den Firebase-Regeln das
   Leserecht des Teamleiters: war es weg, kam "kein Zugriff auf diese Daten".
   .update() laesst unbekannte Felder stehen. Was wirklich weg soll, wird in
   "entferne" ausdruecklich genannt. */
async function userSet(u, entferne){
  if(db){
    const paket = clean(u) || {};
    (entferne || []).forEach(k => { paket[k] = null; });
    await db.ref('users/'+u.dk).update(paket);
    return;
  }
  const all = localUsers(); all[u.dk] = u; store.set('bw-users', all);
}

/* Alle Daten eines Benutzers als ein Paket */
function dataBlob(){
  return {entries, potenzial, empfehlungen, wiedervorlagen, papierkorb, nachtrag, verlauf, archiv, einkaeufe, inventur, settings, wunsch, fahrten, jobtickets, teamumsatz, ts:Date.now()};
}
function applyData(d){
  Object.keys(entries).forEach(k=>delete entries[k]);
  Object.assign(entries, (d && d.entries) || {});
  potenzial.length = 0; ((d && d.potenzial) || []).forEach(x=>potenzial.push(x));
  empfehlungen.length = 0; ((d && d.empfehlungen) || []).forEach(x=>empfehlungen.push(x));
  wiedervorlagen.length = 0; ((d && d.wiedervorlagen) || []).forEach(x=>wiedervorlagen.push(x));
  const grenze = Date.now() - 30*86400000;
  papierkorb.length = 0; ((d && d.papierkorb) || []).filter(x=>x.weg > grenze).forEach(x=>papierkorb.push(x));
  verlauf.length = 0;   ((d && d.verlauf)   || []).forEach(x=>verlauf.push(x));
  archiv.length = 0;    ((d && d.archiv)    || []).forEach(x=>archiv.push(x));
  fahrten.length = 0;   ((d && d.fahrten)   || []).forEach(x=>fahrten.push(x));
  Object.keys(jobtickets).forEach(k=>delete jobtickets[k]);
  Object.assign(jobtickets, (d && d.jobtickets) || {});
  Object.keys(teamumsatz).forEach(k=>delete teamumsatz[k]);
  Object.assign(teamumsatz, (d && d.teamumsatz) || {});
  einkaeufe.length = 0; ((d && d.einkaeufe) || []).forEach(x=>einkaeufe.push(x));
  Object.keys(inventur).forEach(k=>delete inventur[k]);
  Object.assign(inventur, (d && d.inventur) || {});
  Object.keys(nachtrag).forEach(k=>delete nachtrag[k]);
  Object.assign(nachtrag, (d && d.nachtrag) || {});
  bestandUmstellen();
  /* WICHTIG: erst leeren, dann setzen. Vorher wurde nur ergaenzt - beim
     Umschalten auf ein Teammitglied blieben eigene Werte stehen und
     vermischten sich mit dessen Daten. */
  Object.keys(settings).forEach(k => delete settings[k]);
  Object.assign(settings, {bestellrahmen:0}, (d && d.settings) || {});
  if(typeof bewegungSetzen === "function") bewegungSetzen();
  Object.assign(wunsch, {einkommen:0,tage:5,proAuftrag:270,quote:0}, (d && d.wunsch) || {});
  wunsch.proAuftrag = 270;
  wvUmstellen();                       // taggenaue Alt-Termine werden zu Monaten
}
/* Der neuere Stand gewinnt – ist dort ein Bereich leer, springt der ältere ein.
   Verhindert, dass ein Teil der Daten durch einen halben Speichervorgang verschwindet. */
/* Führt zwei Stände zusammen, ohne dass ein Gerät die Arbeit des anderen verwirft.
   Termine werden einzeln verglichen, gelöschte bleiben gelöscht (der Papierkorb ist der Nachweis). */
function mische(wolke, lokal){
  const wNeuer = (wolke.ts||0) >= (lokal.ts||0);
  const neuer = wNeuer ? wolke : lokal;
  const alt   = wNeuer ? lokal : wolke;
  const out = {...neuer};
  const leer = v => !v || (Array.isArray(v) ? !v.length : !Object.keys(v).length);

  /* Termine: alles aus beiden Ständen, bei Dopplung gewinnt der zuletzt geänderte */
  const eN = neuer.entries || {}, eA = alt.entries || {};
  const korbZeit = blob => {
    const m = {};
    (blob.papierkorb || []).forEach(x=>{
      if(!x || !x.tag) return;
      const k = x.tag + "|" + x.h;
      m[k] = Math.max(m[k] || 0, +x.weg || 0);
    });
    return m;
  };
  const kN = korbZeit(neuer), kA = korbZeit(alt);
  const ent = {};
  const alleKeys = new Set([...Object.keys(eN), ...Object.keys(eA)]);
  alleKeys.forEach(k=>{
    const a = eA[k], n = eN[k];
    if(a && n){ ent[k] = ((+a.mts||0) > (+n.mts||0)) ? a : n; return; }
    const da = a || n;
    const eigen = a ? (+a.mts || 0) : (+n.mts || 0);
    const geloescht = a ? (kN[k] || 0) : (kA[k] || 0);   // hat die andere Seite ihn weggeworfen?
    if(geloescht && geloescht >= eigen) return;
    ent[k] = da;
  });
  out.entries = ent;

  /* Listen mit Kennung: zusammenlegen statt ersetzen */
  const nachId = (feld, idFeld) => {
    const map = new Map();
    (alt[feld] || []).forEach(x=> x && map.set(x[idFeld] || JSON.stringify(x), x));
    (neuer[feld] || []).forEach(x=> x && map.set(x[idFeld] || JSON.stringify(x), x));
    out[feld] = [...map.values()];
  };
  nachId("potenzial", "id");
  nachId("empfehlungen", "id");
  nachId("wiedervorlagen", "id");
  nachId("fahrten", "id");

  /* Objekte je Schlüssel zusammenlegen, der neuere Stand gewinnt bei Dopplung */
  ["nachtrag","jobtickets","teamumsatz","inventur"].forEach(f=>{
    if(leer(alt[f])) return;
    out[f] = {...(alt[f] || {}), ...(neuer[f] || {})};
  });

  /* Der Rest: nur einspringen, wenn der neuere Stand dort nichts hat */
  ["papierkorb","einkaeufe","verlauf","archiv","settings","wunsch"].forEach(f=>{
    if(leer(out[f]) && !leer(alt[f])) out[f] = alt[f];
  });
  return out;
}
async function loadData(dk, fremd){
  const lokal = fremd ? null : store.get('bw-data-'+dk);
  if(!db){ if(!fremd) cloudOk = false; return lokal; }
  try{
    const s = await db.ref('data/'+dk).once('value');
    if(!fremd) cloudOk = true;
    const wolke = s.val();
    if(!wolke) return lokal;                                  // in der Cloud noch nichts
    if(!lokal)  return wolke;
    return mische(wolke, lokal);                              // neuerer Stand gewinnt, Lücken werden gefüllt
  }catch(err){
    if(fremd){                                                // fremde Daten: eigener Stand bleibt unberührt
      const kein = (err && err.code === "PERMISSION_DENIED") || /permission/i.test(err&&err.message||"");
      saveState(kein ? "kein Zugriff auf diese Daten" : "Daten nicht geladen", true);
      return null;
    }
    cloudOk = false;
    saveState("Laden fehlgeschlagen · "+fehlerkurz(err), true);
    return lokal;
  }
}
/* Firebase lehnt einen ganzen Schreibvorgang ab, sobald irgendwo undefined steht.
   Deshalb wird das Paket vorher gesäubert. */
function clean(v){
  if(Array.isArray(v)) return v.map(clean).filter(x=>x!==undefined);
  if(v && typeof v === "object"){
    const o = {};
    Object.keys(v).forEach(k=>{ const c = clean(v[k]); if(c !== undefined) o[k] = c; });
    return o;
  }
  if(v === undefined || v === null) return undefined;
  if(typeof v === "number" && !isFinite(v)) return undefined;
  return v;
}
let saveTimer = null, dataReady = false, cloudOk = false, shadow = {};
let letzterFehler = "";
function saveState(text, warn){
  const el = document.getElementById('saveState');
  if(!el) return;
  el.textContent = text;
  el.classList.toggle('warn', !!warn);
  el.title = letzterFehler || text;
}
const gleich = (a,b) => JSON.stringify(a) === JSON.stringify(b);
/* Schreibt nur, was sich seit dem letzten Speichern geändert hat */
function fehlerkurz(err){
  const c = (err && (err.code || err.message)) || "";
  if(/PERMISSION_DENIED|permission/i.test(c)) return "kein Schreibrecht – Firebase-Regeln prüfen";
  if(/network|offline|unavailable/i.test(c))  return "offline";
  return String(c).slice(0,60);
}
function flushSave(){
  if(!me || !dataReady) return;
  if(fremdAktiv){                                     // Notbremse: niemals fremde Daten unter eigener DK ablegen
    console.warn("Speichern uebersprungen - es lagen fremde Daten im Speicher.");
    return;
  }
  const zielDk = me.dk;                               // gespeichert wird immer der eigene Stand
  const blob = clean(dataBlob());
  store.set('bw-data-'+zielDk, blob);
  if(!db){ saveState("lokal gespeichert"); return; }

  const basis = 'data/'+zielDk+'/';
  const updates = {};
  const neuE = blob.entries || {}, altE = shadow.entries || {};
  const stempel = Date.now();
  Object.keys(neuE).forEach(k=>{
    if(gleich(neuE[k], altE[k])) return;
    neuE[k] = {...neuE[k], mts: stempel};          // wann dieser Termin zuletzt geändert wurde
    if(entries[k]) entries[k].mts = stempel;       // damit der nächste Vergleich ruhig bleibt
    updates[basis+'entries/'+k] = neuE[k];
  });
  Object.keys(altE).forEach(k=>{ if(!(k in neuE)) updates[basis+'entries/'+k] = null; });
  ["potenzial","empfehlungen","wiedervorlagen","papierkorb","nachtrag","verlauf","archiv","einkaeufe","inventur","settings","wunsch","fahrten","jobtickets","teamumsatz"].forEach(f=>{
    if(!gleich(blob[f], shadow[f])) updates[basis+f] = (blob[f] === undefined ? null : blob[f]);
  });
  if(!Object.keys(updates).length){ saveState("gespeichert"); return; }
  updates[basis+'ts'] = blob.ts;

  saveState("speichert …");
  db.ref().update(updates)
    .then(()=>{ shadow = JSON.parse(JSON.stringify(blob)); cloudOk = true; saveState("gespeichert"); })
    .catch(err=>{ cloudOk = false; letzterFehler = (err&&err.message)||""; saveState("nur lokal · "+fehlerkurz(err), true); });   // nächster Versuch läuft wieder
}
var fremdAktiv = false;        // solange true, liegen fremde Daten im Speicher - es wird nichts geschrieben
/* E40: ein sehr kurzer Impuls bestätigt, dass etwas gezählt oder gesichert wurde */
function stups(ms=8, el){
  try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){}
  /* Sichtbare Quittung zusaetzlich zum Vibrieren - viele haben es aus */
  if(el){ el.classList.remove('stups'); void el.offsetWidth; el.classList.add('stups'); }
}
function saveData(){
  if(!me || !dataReady || fremdAktiv) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
}
/* Beim Verlassen der Seite sofort sichern */
addEventListener('pagehide', ()=>{ clearTimeout(saveTimer); flushSave(); if(me) store.set('bw-lastseen', Date.now()); });
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === "hidden"){ clearTimeout(saveTimer); flushSave(); }
});

