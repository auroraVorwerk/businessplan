/* ---------- Anmeldung ---------- */
const loginEl = document.getElementById('login'), loginBox = document.getElementById('loginBox');
let lgStep = "start", lg = {}, lgErrText = "", lgBusy = false;
const FALSCH = "Passwort oder Daten falsch, bitte überprüfen.";

/* PIN-Wiederherstellung: das Passwort liegt mit dem PIN verschlüsselt in der Datenbank */
const b64  = u8 => btoa(String.fromCharCode(...u8));
const ub64 = t => Uint8Array.from(atob(t), c=>c.charCodeAt(0));
async function pinKey(pin, dk){
  const enc = new TextEncoder();
  const basis = await crypto.subtle.importKey("raw", enc.encode(pin+"|"+dk), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {name:"PBKDF2", salt:enc.encode("bunte-woche|"+dk), iterations:150000, hash:"SHA-256"},
    basis, {name:"AES-GCM", length:256}, false, ["encrypt","decrypt"]);
}
async function pinSpeichern(pin, dk, passwort){
  const key = await pinKey(pin, dk);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, new TextEncoder().encode(passwort));
  await db.ref('recovery/'+dk).set({iv:b64(iv), ct:b64(new Uint8Array(ct))});
}
async function pinOeffnen(pin, dk){
  const rec = (await db.ref('recovery/'+dk).once('value')).val();
  if(!rec) throw new Error("Für diese DK-Nummer ist kein PIN hinterlegt.");
  const key = await pinKey(pin, dk);
  const pt = await crypto.subtle.decrypt({name:"AES-GCM", iv:ub64(rec.iv)}, key, ub64(rec.ct));
  return new TextDecoder().decode(pt);
}

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
      ${lg.zeigeMail ? feld("lgMail","Hinterlegte E-Mail-Adresse", lg.mail||"", 'placeholder="nur falls im Profil eingetragen"') : ""}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy?"einen Moment …":"Anmelden"}</button>
      <button class="linkbtn" data-go="forgot">Passwort vergessen?</button>
      <button class="zurueck" data-go="start">Zurück</button>`;
  }
  if(lgStep === "reg1"){
    h = kopf + `<h2>Neu registrieren</h2><p class="lgsub">Deine Daten und ein selbst gewähltes Passwort.</p>
      ${feld("lgDk","DK-Nummer", lg.dk||"", 'placeholder="DK00000000"')}
      <div class="row2">${feld("lgVor","Vorname", lg.vor||"")}${feld("lgNach","Nachname", lg.nach||"")}</div>
      ${pwFeld("lgPw","Passwort")}
      ${pwFeld("lgPw2","Passwort wiederholen")}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy?"einen Moment …":"Weiter"}</button>
      <button class="zurueck" data-go="start">Zurück</button>`;
  }
  if(lgStep === "reg2"){
    h = kopf + `<h2>Dein PIN</h2>
      <p class="lgsub">Der vierstellige PIN, den du intern bekommen hast. Er ist deine Absicherung, falls du dein Passwort vergisst.</p>
      ${pinFeld("lgPin","PIN")}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy?"einen Moment …":"Registrieren"}</button>
      <button class="zurueck" data-go="reg1">Zurück</button>`;
  }
  if(lgStep === "forgot"){
    h = kopf + `<h2>Passwort vergessen</h2><p class="lgsub">Mit hinterlegter E-Mail schicken wir dir einen Link, sonst prüfen wir deinen PIN.</p>
      ${feld("lgDk","DK-Nummer", lg.dk||"", 'placeholder="DK00000000"')}
      <div class="row2">${feld("lgVor","Vorname", lg.vor||"")}${feld("lgNach","Nachname", lg.nach||"")}</div>
      ${pinFeld("lgPin","PIN")}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy?"einen Moment …":"Weiter"}</button>
      <button class="zurueck" data-go="login">Zurück</button>`;
  }
  if(lgStep === "neuespw"){
    h = kopf + `<h2>Neues Passwort</h2><p class="lgsub">PIN erkannt. Vergib jetzt ein neues Passwort.</p>
      ${pwFeld("lgPw","Neues Passwort")}
      ${pwFeld("lgPw2","Neues Passwort wiederholen")}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy?"einen Moment …":"Passwort speichern"}</button>`;
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
  const pw = wert('lgPw'), pw2 = wert('lgPw2'), pin = wert('lgPin');

  if(["login","reg1","forgot"].includes(lgStep) && !DK_RE.test(dk))
    return lgFehler("Die DK-Nummer besteht aus DK und acht Ziffern.");

  if(!auth || !db){                                   // Notbetrieb ohne Firebase
    if(lgStep !== "reg1" && lgStep !== "login") return lgFehler("Ohne Verbindung nicht möglich.");
    let u = localUsers()[dk];
    if(!u) u = {dk, vorname:lg.vor||"?", nachname:lg.nach||"?",
                rolle: rolleAus(dk), team:[]};
    await userSet(u); store.set('bw-session',{dk});
    return starteSitzung(u);
  }

  lgBusy = true; renderLogin();
  try{
    if(lgStep === "login"){
      if(!pw) throw new Error(FALSCH);
      /* Angemeldet wird immer mit der reinen DK-Nummer. Gibt es dazu keinen
         Zugang, wird still auch TL-DK… geprüft – Teamleiter müssen das
         Kürzel also nicht mehr selbst tippen. */
      let dkEff = dk;
      if(!/^TL-/i.test(dk)){
        const direkt = await userGet(dk);
        if(!direkt || !direkt.uid){
          const tl = await userGet("TL-"+dk);
          if(tl && tl.uid) dkEff = "TL-"+dk;
        }
      }
      if(await istGeloescht(dkEff)) throw new Error("Dieser Zugang wurde entfernt.");
      const u0 = await userGet(dkEff);
      if(u0 && !u0.uid) throw new Error("Für diese DK-Nummer gibt es noch kein Passwort. Bitte einmal über „Neu registrieren“ gehen — deine Daten bleiben erhalten.");
      const cred = await anmelden(u0, dkEff, pw);            // niemals neu anlegen
      if(!cred){
        if(!lg.zeigeMail){
          lg.zeigeMail = true;
          throw new Error(FALSCH + " Falls du im Profil eine E-Mail hinterlegt hast, trage sie bitte zusätzlich ein.");
        }
        throw new Error(FALSCH);
      }
      if(cred.user.email && cred.user.email !== mailOf(dkEff) && u0 && u0.mail !== cred.user.email){
        try{ await db.ref('users/'+dkEff+'/mail').set(cred.user.email); }catch(e){}
      }
      const u = u0 || await userGet(dkEff);
      if(!u){ await auth.signOut(); throw new Error(FALSCH); }
      await verknuepfe(cred.user.uid, dkEff, u);
      return starteSitzung(u);
    }

    if(lgStep === "reg1"){
      if(!lg.vor || !lg.nach) throw new Error("Bitte Vor- und Nachnamen eintragen.");
      if(pw.length < 6)  throw new Error("Das Passwort braucht mindestens 6 Zeichen.");
      if(pw !== pw2)     throw new Error("Die beiden Passwörter stimmen nicht überein.");
      if(await istGeloescht(dk)) throw new Error("Diese DK-Nummer wurde gelöscht. Bitte im Team melden.");
      const u = await userGet(dk);
      if(u && u.uid) throw new Error("Diese DK-Nummer ist bereits registriert. Bitte anmelden.");
      if(u && !nameGleich(u.vorname,lg.vor)) throw new Error("Zu dieser DK-Nummer ist ein anderer Name hinterlegt.");
      if(u && !nameGleich(u.nachname,lg.nach)) throw new Error("Zu dieser DK-Nummer ist ein anderer Name hinterlegt.");
      lg.pw = pw; lgStep = "reg2"; lgBusy = false; return renderLogin();
    }

    if(lgStep === "reg2"){
      if(!/^\d{4}$/.test(pin)) throw new Error("Der PIN besteht aus genau vier Ziffern.");
      let cred;
      try{ cred = await auth.createUserWithEmailAndPassword(mailOf(dk), lg.pw); }
      catch(err){
        if(err.code === "auth/email-already-in-use") throw new Error("Diese DK-Nummer ist bereits registriert. Bitte anmelden.");
        throw new Error(fehlertext(err));
      }
      const vorhanden = await userGet(dk);
      const u = vorhanden
        ? {...vorhanden, uid:cred.user.uid, vorname:lg.vor, nachname:lg.nach}
        : {dk, uid:cred.user.uid, vorname:lg.vor, nachname:lg.nach,
           rolle: rolleAus(dk)};        // Teamleiter setzt der Admin im Profil
      await db.ref('uids/'+cred.user.uid).set(dk);
      await userSet(u);
      await pinSpeichern(pin, dk, lg.pw);
      try{ await db.ref('secret/'+dk).set({pin}); }catch(e){}   // im Profil einsehbar
      await starteSitzung(u);
      return tourStart(true);
    }

    if(lgStep === "forgot"){
      const u0 = await userGet(dk);
      const mailZiel = u0 && (u0.mail || u0.mailPending);
      if(mailZiel){                                        // Zurücksetzen per E-Mail
        if(!nameGleich(u0.vorname,lg.vor) || !nameGleich(u0.nachname,lg.nach)) throw new Error(FALSCH);
        await auth.sendPasswordResetEmail(mailZiel);
        lgBusy = false;
        return lgFehler("Wir haben dir einen Link an "+mailZiel+" geschickt.");
      }
      if(!/^\d{4}$/.test(pin)) throw new Error("Der PIN besteht aus genau vier Ziffern.");
      const u = u0;
      if(!u || !nameGleich(u.vorname,lg.vor) || !nameGleich(u.nachname,lg.nach)) throw new Error(FALSCH);
      let altesPw;
      try{ altesPw = await pinOeffnen(pin, dk); }
      catch(err){ throw new Error(FALSCH); }
      if(!await anmelden(u, dk, altesPw)) throw new Error("Der hinterlegte Zugang passt nicht mehr. Bitte im Team melden.");
      lg.pin = pin; lgStep = "neuespw"; lgBusy = false; return renderLogin();
    }

    if(lgStep === "neuespw"){
      if(pw.length < 6) throw new Error("Das Passwort braucht mindestens 6 Zeichen.");
      if(pw !== pw2)    throw new Error("Die beiden Passwörter stimmen nicht überein.");
      await auth.currentUser.updatePassword(pw);
      await pinSpeichern(lg.pin, dk, pw);
      const u = await userGet(dk);
      await verknuepfe(auth.currentUser.uid, dk, u);
      return starteSitzung(u);
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
  /* Wurde eine neue E-Mail bestätigt, gilt ab jetzt sie als Zugang */
  if(auth && auth.currentUser && auth.currentUser.email && auth.currentUser.email !== mailOf(u.dk) && me.mail !== auth.currentUser.email){
    me.mail = auth.currentUser.email;
    delete me.mailPending;
    try{ await userSet(me, ["mailPending"]); }catch(e){}
  }
  /* Der eine feste Admin-Zugang trägt sich selbst als Admin ein */
  if(db && auth && auth.currentUser && me.dk === "V-DK00000000"){
    db.ref('admins/'+auth.currentUser.uid).set(true).catch(()=>{});
  }
  /* Kennung fürs Kalenderabo einmalig im Hintergrund vergeben */
  if(db && !me.feedToken){
    me.feedToken = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()) + String(Math.random())).replace(/[^a-z0-9]/gi,"");
    try{ await db.ref('users/'+me.dk+'/feedToken').set(me.feedToken); }catch(e){}
  }
  if(db){
    try{ const k = (await db.ref('katalog').once('value')).val(); if(k && k.length) katalog.liste = k; }catch(e){}
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
function logout(){
  clearTimeout(saveTimer); flushSave();
  store.del('bw-session');
  me = null; viewUser = null;
  applyData(null); shadow = {};
  lgStep = "start"; lg = {}; lgErrText = "";
  renderLogin();
  loginEl.hidden = false;
  location.hash = "#heute";
  setMenu(false);
  if(auth) auth.signOut();
}

