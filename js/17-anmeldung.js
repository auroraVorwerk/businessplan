/* ---------- Anmeldung ---------- */
const loginEl = document.getElementById('login'), loginBox = document.getElementById('loginBox');
let lgStep = "start", lg = {}, lgErrText = "", lgBusy = false;
const FALSCH = "Passwort oder Daten falsch, bitte überprüfen.";

/* PIN-Wiederherstellung (bis Update 22) ist ausgebaut.
   Das Passwort lag mit einem vierstelligen PIN verschlüsselt offen lesbar in
   der Datenbank - in Minuten zu knacken. Ab Update 23 läuft "Passwort
   vergessen" nur noch per E-Mail-Link oder über den Admin.
   Die Funktionen bleiben als leere Hüllen, damit ältere Aufrufe nicht brechen. */
async function pinSpeichern(){ /* ausgebaut */ }
async function pinOeffnen(){ throw new Error("Die PIN-Wiederherstellung gibt es nicht mehr."); }
/* E-Mail des Zugangs je DK auf diesem Gerät merken - die Datenbank verrät sie
   vor der Anmeldung nicht mehr. */
const mailMerken = (dk, m) => { if(dk && m && !/@bunte-woche\.app$/.test(m)) store.set('bw-mail-'+dk, m); };
const mailGemerkt = dk => store.get('bw-mail-'+dk) || "";

const feld  = (id,l,v="",extra="") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" value="${v}" autocomplete="off" spellcheck="false" ${extra}></div>`;
const APPLE_LOGO = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.6zM14.2 5.3c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.7-1.3z"/></svg>`;
const GOOGLE_LOGO = `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>`;
const EYE_AN = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg>`;
const EYE_AUS = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M2 12s3.6-6 10-6c2.1 0 3.9.6 5.4 1.5M22 12s-3.6 6-10 6c-2.1 0-3.9-.6-5.4-1.5"/><line x1="4" y1="20" x2="20" y2="4"/></svg>`;
const pwFeld = (id,l) => `<div class="field pw"><label for="${id}">${l}</label>
  <input id="${id}" type="password" autocomplete="new-password" placeholder="••••••••">
  <button type="button" class="eye" data-eye="${id}" aria-label="Passwort anzeigen">${EYE_AN}</button></div>`;
const pinFeld = (id,l) => `<div class="field pinput"><label for="${id}">${l}</label>
  <input id="${id}" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></div>`;
const wert = id => { const e = document.getElementById(id); return e ? e.value.trim() : ""; };
function lgFehler(t){ lgErrText = t; renderLogin(); }

function renderLogin(){
  const kopf = `<div class="lgmark">Digitaler Businessplan</div>`;
  const fehler = lgErrText ? `<p class="err">${lgErrText}</p>` : "";
  const laden = lgBusy ? ` disabled` : "";
  let h = "";
  if(lgStep === "start"){
    h = kopf + `<h2>Willkommen</h2><p class="lgsub">Melde dich an oder lege deinen Zugang an.</p>
      <button class="opt" data-go="login">Anmelden</button>
      <button class="opt" data-go="reg1">Neu registrieren</button>`;
  }
  if(lgStep === "login"){
    h = kopf + `<h2>Anmelden</h2><p class="lgsub">DK-Nummer und Passwort genügen.</p>
      ${feld("lgDk","DK-Nummer", lg.dk||"", 'placeholder="DK00000000"')}
      ${pwFeld("lgPw","Passwort")}
      ${lg.zeigeMail ? feld("lgMail","Hinterlegte E-Mail-Adresse", lg.mail||"", 'placeholder="falls im Profil eingetragen" type="email"') : ""}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy?"einen Moment …":"Anmelden"}</button>
      <button class="linkbtn" data-go="forgot">Passwort vergessen?</button>
      <button class="zurueck" data-go="start">Zurück</button>`;
  }
  if(lgStep === "reg1"){
    h = kopf + `<h2>Neu registrieren</h2><p class="lgsub">Deine Daten und ein selbst gewähltes Passwort.</p>
      ${feld("lgDk","DK-Nummer", lg.dk||"", 'placeholder="DK00000000"')}
      <div class="row2">${feld("lgVor","Vorname", lg.vor||"")}${feld("lgNach","Nachname", lg.nach||"")}</div>
      ${pwFeld("lgPw","Passwort (mindestens 8 Zeichen)")}
      ${pwFeld("lgPw2","Passwort wiederholen")}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy?"einen Moment …":"Registrieren"}</button>
      <button class="zurueck" data-go="start">Zurück</button>`;
  }
  if(lgStep === "forgot"){
    h = kopf + `<h2>Passwort vergessen</h2><p class="lgsub">Trag die E-Mail-Adresse ein, die du im Profil hinterlegt hast. Du bekommst einen Link zum Zurücksetzen.</p>
      ${feld("lgMail","E-Mail-Adresse", lg.mail||"", 'type="email" placeholder="name@beispiel.de"')}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy?"einen Moment …":"Link schicken"}</button>
      <p class="lgsub" style="margin-top:14px">Keine E-Mail hinterlegt? Dann melde dich bei deinem Teamleiter — der Admin setzt deinen Zugang zurück und du registrierst dich mit derselben DK-Nummer neu. Deine Daten bleiben erhalten.</p>
      <button class="zurueck" data-go="login">Zurück</button>`;
  }
  loginBox.innerHTML = h + `<p class="lghint">DK-Nummer: DK und acht Ziffern ohne Leerzeichen.<br>Für alle gleich, auch für Teamleiter.</p>`;
  const go = document.getElementById('lgGo');
  if(go) go.onclick = lgWeiter;
}
loginBox.addEventListener('click', ev=>{
  const nav = ev.target.closest('[data-go]');
  if(nav){ merkeEingaben(); lgErrText=""; lgStep = nav.dataset.go; renderLogin(); return; }
});
/* Auge-Umschalter überall auf der Seite */
document.addEventListener('click', ev=>{
  const eye = ev.target.closest('[data-eye]');
  if(!eye) return;
  const inp = document.getElementById(eye.dataset.eye);
  if(!inp) return;
  inp.type = inp.type === "password" ? "text" : "password";
  eye.innerHTML = inp.type === "password" ? EYE_AN : EYE_AUS;
  eye.setAttribute('aria-label', inp.type === "password" ? "Passwort anzeigen" : "Passwort verbergen");
});
loginBox.addEventListener('keydown', e=>{ if(e.key === "Enter") lgWeiter(); });
function merkeEingaben(){
  if(document.getElementById('lgDk')){
    /* Das alte Kuerzel TL- wird stillschweigend entfernt: angemeldet und
       registriert wird ab jetzt ausschliesslich mit der reinen DK-Nummer. */
    lg.dk = wert('lgDk').toUpperCase().replace(/\s/g,"").replace(/^TL-/, "");
  }
  if(document.getElementById('lgVor'))  lg.vor  = wert('lgVor');
  if(document.getElementById('lgNach')) lg.nach = wert('lgNach');
  if(document.getElementById('lgMail')) lg.mail = wert('lgMail').toLowerCase();
}
const nameGleich = (a,b) => (a||"").trim().toLowerCase() === (b||"").trim().toLowerCase();

async function lgWeiter(){
  if(lgBusy) return;
  merkeEingaben();
  lgErrText = "";
  const dk = lg.dk || "";
  const pw = wert('lgPw'), pw2 = wert('lgPw2');

  if(["login","reg1"].includes(lgStep) && !DK_RE.test(dk))
    return lgFehler("Die DK-Nummer besteht aus DK und acht Ziffern.");

  if(!auth || !db){                                   // Notbetrieb ohne Firebase
    if(lgStep !== "reg1" && lgStep !== "login") return lgFehler("Ohne Verbindung nicht möglich.");
    let u = localUsers()[dk];
    if(!u) u = {dk, vorname:lg.vor||"?", nachname:lg.nach||"?", rolle: ROLLE_KB, team:[]};
    await userSet(u); store.set('bw-session',{dk});
    return starteSitzung(u);
  }

  lgBusy = true; renderLogin();
  try{
    /* ---- Anmelden: erst anmelden, dann lesen. Vor der Anmeldung wird
       nichts mehr aus der Datenbank geholt. ---- */
    if(lgStep === "login"){
      if(!pw) throw new Error(FALSCH);
      const kandidaten = [...new Set([lg.mail, mailGemerkt(dk), mailGemerkt("TL-"+dk),
                                      mailOf(dk), mailOf("TL-"+dk)].filter(Boolean))];
      let cred = null;
      for(const m of kandidaten){
        try{ cred = await auth.signInWithEmailAndPassword(m, pw); break; }
        catch(err){ if(err && err.code === "auth/too-many-requests") throw new Error(fehlertext(err)); }
      }
      if(!cred){
        if(!lg.zeigeMail){
          lg.zeigeMail = true;
          throw new Error(FALSCH + " Falls du im Profil eine E-Mail hinterlegt hast, trage sie bitte zusätzlich ein.");
        }
        throw new Error(FALSCH);
      }
      const uid = cred.user.uid, email = (cred.user.email || "").toLowerCase();
      let dkEff = (await db.ref('uids/'+uid).once('value')).val();
      if(!dkEff) dkEff = (email === mailOf("TL-"+dk)) ? "TL-"+dk : dk;
      if(await istGeloescht(dkEff)){ await auth.signOut(); throw new Error("Dieser Zugang wurde entfernt."); }
      let u = null;
      try{ u = await userGet(dkEff); }catch(e){ u = null; }
      if(!u){ await auth.signOut(); throw new Error(FALSCH); }
      if(email && email !== mailOf(dkEff) && u.mail !== email){
        try{ await db.ref('users/'+dkEff+'/mail').set(email); u.mail = email; }catch(e){}
      }
      mailMerken(dk, email);
      await verknuepfe(uid, dkEff, u);
      return starteSitzung(u);
    }

    /* ---- Registrieren: Zugang anlegen, dann prüfen. Passt etwas nicht,
       wird der eben angelegte Zugang sofort wieder entfernt. ---- */
    if(lgStep === "reg1"){
      if(!lg.vor || !lg.nach) throw new Error("Bitte Vor- und Nachnamen eintragen.");
      if(pw.length < 8)  throw new Error("Das Passwort braucht mindestens 8 Zeichen.");
      if(pw !== pw2)     throw new Error("Die beiden Passwörter stimmen nicht überein.");
      let cred;
      try{ cred = await auth.createUserWithEmailAndPassword(mailOf(dk), pw); }
      catch(err){
        if(err.code === "auth/email-already-in-use") throw new Error("Diese DK-Nummer ist bereits registriert. Bitte anmelden.");
        throw new Error(fehlertext(err));
      }
      const zurueck = async (text)=>{
        try{ await cred.user.delete(); }catch(e){ try{ await auth.signOut(); }catch(e2){} }
        throw new Error(text);
      };
      if(await istGeloescht(dk)) return await zurueck("Diese DK-Nummer wurde gelöscht. Bitte im Team melden.");
      let vorhanden = null;
      try{ vorhanden = await userGet(dk); }
      catch(e){ return await zurueck("Diese DK-Nummer ist bereits registriert. Bitte anmelden."); }
      if(vorhanden && vorhanden.uid && vorhanden.uid !== cred.user.uid)
        return await zurueck("Diese DK-Nummer ist bereits registriert. Bitte anmelden.");
      if(vorhanden && (!nameGleich(vorhanden.vorname,lg.vor) || !nameGleich(vorhanden.nachname,lg.nach)))
        return await zurueck("Zu dieser DK-Nummer ist ein anderer Name hinterlegt.");
      const u = vorhanden
        ? {...vorhanden, uid:cred.user.uid, vorname:lg.vor, nachname:lg.nach}
        : {dk, uid:cred.user.uid, vorname:lg.vor, nachname:lg.nach, rolle: ROLLE_KB};   // Rollen vergibt nur der Admin
      delete u.feedToken;
      await db.ref('uids/'+cred.user.uid).set(dk);
      await userSet(u);
      await starteSitzung(u);
      return tourStart(true);
    }

    /* ---- Passwort vergessen: nur noch per E-Mail ---- */
    if(lgStep === "forgot"){
      const mail = (lg.mail || "").trim().toLowerCase();
      if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(mail)) throw new Error("Bitte die hinterlegte E-Mail-Adresse eintragen.");
      try{ await auth.sendPasswordResetEmail(mail); }catch(e){ /* bewusst still: verrät nicht, ob es die Adresse gibt */ }
      lgBusy = false; lgStep = "login";
      return lgFehler("Ist die Adresse hinterlegt, ist ein Link unterwegs — bitte auch im Spam nachsehen.");
    }
  }catch(err){
    lgBusy = false;
    return lgFehler(err.message || FALSCH);
  }
}
/* Verknüpft Zugang und DK-Datensatz, auch für Nutzer aus der Zeit ohne Passwort */
/* Der Zugang kann auf der technischen oder auf der echten Adresse laufen */
function mailKandidaten(u, dk){
  const liste = [];
  if(lg && lg.mail) liste.push(lg.mail);          // von Hand eingetragene Adresse
  if(u && u.mail) liste.push(u.mail);
  if(u && u.mailPending) liste.push(u.mailPending);
  liste.push(mailOf(dk));
  return [...new Set(liste)];
}
async function anmelden(u, dk, pw){
  for(const m of mailKandidaten(u, dk)){
    try{ return await auth.signInWithEmailAndPassword(m, pw); }catch(err){}
  }
  return null;
}
async function istGeloescht(dk){
  if(!db) return false;
  try{ return !!(await db.ref('deleted/'+dk).once('value')).val(); }catch(e){ return false; }
}
async function verknuepfe(uid, dk, u){
  const map = (await db.ref('uids/'+uid).once('value')).val();
  if(!map) await db.ref('uids/'+uid).set(dk);
  if(u && !u.uid){ u.uid = uid; await userSet(u); }
}
function fehlertext(err){
  const c = (err && err.code) || "";
  if(c==="auth/weak-password") return "Das Passwort braucht mindestens 6 Zeichen.";
  if(c==="auth/network-request-failed") return "Keine Verbindung. Bitte Internet prüfen.";
  if(c==="auth/too-many-requests") return "Zu viele Versuche. Bitte kurz warten.";
  return (err && err.message) || "Anmeldung fehlgeschlagen.";
}
async function starteSitzung(u){
  me = u;
  /* alte, offen lesbare Kalenderkennung entfernen */
  if(db && me.feedToken){
    delete me.feedToken;
    db.ref('users/'+me.dk+'/feedToken').remove().catch(()=>{});
  }
  /* Wurde eine neue E-Mail bestätigt, gilt ab jetzt sie als Zugang */
  if(auth && auth.currentUser && auth.currentUser.email && auth.currentUser.email !== mailOf(u.dk) && me.mail !== auth.currentUser.email){
    me.mail = auth.currentUser.email;
    delete me.mailPending;
    try{ await userSet(me, ["mailPending"]); }catch(e){}
  }
  if(auth && auth.currentUser && auth.currentUser.email) mailMerken(me.dk.replace(/^TL-/,""), auth.currentUser.email);
  /* Kalenderabo (Update 23): die Kennung liegt nicht mehr im Nutzersatz,
     den andere lesen können, sondern unter privat/DK - nur für einen selbst.
     Die alte, offen lesbare Kennung wird entfernt und gilt nicht mehr. */
  if(db) feedHolen().catch(()=>{});
  if(db){
    try{ const k = entschaerfen((await db.ref('katalog').once('value')).val()); if(k && k.length) katalog.liste = k; }catch(e){}
  }
  if(me.thema) themaSetzen(me.thema);
  me.lastLogin = Date.now();
  store.set('bw-lastseen', Date.now());
  if(db){ db.ref('users/'+u.dk+'/lastLogin').set(me.lastLogin).catch(()=>{}); }
  dataReady = false;
  applyData(await loadData(u.dk));
  shadow = JSON.parse(JSON.stringify(clean(dataBlob())));
  dataReady = true;
  lgBusy = false; lg = {}; lgStep = "start"; lgErrText = "";
  loginEl.hidden = true;
  renderMenu();
  await fuelleMemberSelect();
  renderAll();
  if(istTeamleiter()) teamVergleich();
}
/* ---------- Kalenderabo-Kennung ---------- */
let meinFeed = "";
async function feedHolen(){
  if(!db || !me) return "";
  const pf = db.ref('privat/'+me.dk+'/feed');
  let t = (await pf.once('value')).val();
  if(!t){
    const z = crypto.getRandomValues(new Uint8Array(16));
    t = Array.from(z, b => b.toString(16).padStart(2,"0")).join("");
    await db.ref('feeds/'+t).set(me.dk);                 // zuerst die Zuordnung für den Kalenderdienst
    await pf.set(t);
  }
  meinFeed = t;
  try{ if(location.hash === "#profil") renderProfil(); }catch(e){}
  return t;
}
function logout(){
  clearTimeout(saveTimer); flushSave();
  /* Kundendaten nicht auf dem Gerät liegen lassen, sobald alles gesichert ist
     (wichtig bei geteilten iPads). Wartet noch etwas, bleibt die Kopie. */
  try{ if(me && !warteZahl()) store.del('bw-data-' + me.dk); }catch(e){}
  store.del('bw-session');
  me = null; viewUser = null; meinFeed = "";
  applyData(null); shadow = {};
  lgStep = "start"; lg = {}; lgErrText = "";
  renderLogin();
  loginEl.hidden = false;
  location.hash = "#heute";
  setMenu(false);
  if(auth) auth.signOut();
}

