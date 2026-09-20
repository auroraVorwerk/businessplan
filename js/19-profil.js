/* ================= Profil, Löschen, Sitzungspflege ================= */
const TAG = 86400000;
async function pinLesen(dk){
  if(!db) return "";
  try{ return (await db.ref('secret/'+dk+'/pin').once('value')).val() || ""; }catch(e){ return ""; }
}
async function renderProfil(){
  const box = document.getElementById('profil');
  if(!box || !me) return;
  const pin = await pinLesen(me.dk);
  const letzter = me.lastLogin ? fmt(new Date(me.lastLogin)) : "–";
  box.innerHTML = `
    <div class="asec">
      <h3>Profil</h3>
      <p class="sub">${me.rolle} · letzte Anmeldung ${letzter}</p>
      <div class="grp">
        <div class="field"><label>DK-Nummer</label><div class="fixed">${me.dk}</div></div>
        <div class="row2">
          ${fld("pfVor","Vorname",me.vorname)}${fld("pfNach","Nachname",me.nachname)}
        </div>
        ${fld("pfMail","E-Mail-Adresse (ab dem zweiten Monat)",me.mail||me.mailPending||"","email")}
        ${fld("pfEinst","Einstellungsdatum", settings.einstellung||"", "date")}
        <div class="field vorschlagfeld"><label for="pfWohn_str">Wohnadresse — Start im Fahrtenbuch</label>
          <input id="pfWohn_str" data-adr="pfWohn" value="${settings.wohnort||""}" autocomplete="off" spellcheck="false"
            placeholder="Straße, PLZ und Ort">
          <div class="vorschlaege" id="pfWohn_vorschlaege" hidden></div></div>
        <p class="hinweis" style="margin-top:0">Im Fahrtenbuch lässt sie sich dann mit einem Tipp
          als Start- oder Zieladresse einsetzen.</p>
        <p class="hinweis" style="margin-top:0">Wer weniger als 52 Wochen dabei ist, gilt als Berufseinsteiger —
          davon hängen die Ziele ab.</p>
        ${me.mailPending && !me.mail ? `<p class="hinweis">Für ${me.mailPending} steht die Bestätigung noch aus.</p>` : ""}
        <div class="field pw"><label for="pfPin">Dein PIN</label>
          <input id="pfPin" type="password" value="${pin || ""}" placeholder="${pin ? "" : "noch nicht hinterlegt"}" readonly>
          <button type="button" class="eye" data-eye="pfPin" aria-label="PIN anzeigen">${EYE_AN}</button></div>
      </div>
      <p class="err" id="pfErr" hidden></p>
      <div class="ah4">Was gerade läuft</div>
      <div class="grp"><div class="aline"><span class="nm">Programmstand</span>
          <span class="vl">${BUILD}</span></div>
        <div class="aline"><span class="nm">Stilvorlage geladen</span>
          <span class="vl" id="pfCss">wird geprüft …</span></div>
        <div class="aline"><span class="nm">Telefon: Bewegung reduzieren</span>
          <span class="vl" id="pfMotion">–</span></div>
        <div class="aline"><span class="nm">Animationen in der App</span>
          <span class="vl" id="pfAnim">–</span></div>
      </div>

      <div class="ah4">Erscheinungsbild</div>
      <div class="grp"><div class="seg">${
        ["Dunkel","Hell"].map(t=>`<button type="button" data-thema="${t}"
          aria-pressed="${themaJetzt()===t}">${t}</button>`).join("")}</div>
        <div class="field" style="margin-top:14px"><label>Bewegung</label>
          <div class="seg">${
            [["system","Wie im System"],["an","Immer an"],["aus","Aus"]].map(([w,t])=>
              `<button type="button" data-bewegung="${w}"
                 aria-pressed="${bewegungJetzt()===w}">${t}</button>`).join("")}</div>
          <p class="hinweis">Steht am Telefon unter Bedienungshilfen „Bewegung reduzieren“ an,
            sind die Animationen der App aus. Mit „Immer an“ laufen sie trotzdem.</p></div>
      </div>
      <div class="actions"><button class="btn primary" id="pfSave">Speichern</button></div>
      <div class="actions"><button class="btn" id="pfPinNeu">${pin ? "PIN ändern" : "PIN festlegen"}</button></div>
      ${KALENDER_BASIS && me.feedToken ? `
      <div class="ah4">Apple Kalender</div>
      <div class="grp">
        <p class="hinweis" style="margin-top:0">Deine Termine erscheinen automatisch im Kalender und im Widget.
          Einmal antippen genügt — der Kalender fragt dann nach der Bestätigung.</p>
        <div class="actions">
          <a class="btn abo apple" href="webcal://${KALENDER_BASIS.replace(/^https?:\/\//,"")}/kalender/${me.feedToken}.ics">
            <span class="logo">${APPLE_LOGO}</span>Im Apple Kalender abonnieren</a>
        </div>
        <div class="actions">
          <a class="btn abo google" target="_blank" rel="noopener"
             href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent("webcal://" + KALENDER_BASIS.replace(/^https?:\/\//,"") + "/kalender/" + me.feedToken + ".ics")}">
            <span class="logo">${GOOGLE_LOGO}</span>Im Google Kalender abonnieren</a>
        </div>
        <div class="actions"><button class="btn" id="pfFeedCopy">Adresse kopieren</button></div>
        <p class="hinweis">Passiert beim Antippen nichts, öffne diese Seite in <b>Safari</b> statt in der installierten App —
          aus der App heraus darf iOS den Kalender nicht starten. Alternativ Adresse kopieren und im Kalender
          unter „Neues Kalenderabo“ einfügen.<br>
          Google aktualisiert abonnierte Kalender nur alle paar Stunden — Apple lässt sich auf fünf Minuten stellen.</p>
      </div>` : ""}
      <p class="hinweis">${me.mail
        ? "Passwort vergessen läuft für dich per E-Mail — du bekommst dann einen Link von Firebase."
        : "Solange keine E-Mail hinterlegt ist, läuft „Passwort vergessen“ über deinen PIN. Das Passwort selbst kann niemand einsehen."}</p>
      <div class="sicherung">
        <p class="hinweis"><button type="button" class="mini" id="pfBackup">Daten sichern</button>
          legt eine Datei mit allen deinen Einträgen auf dem Gerät ab.</p>
        <p class="hinweis"><button type="button" class="mini" id="pfRestore">Sicherung einspielen</button>
          ersetzt alle Einträge durch den Stand aus einer solchen Datei — auch aus einer Serversicherung.
          <input type="file" id="pfDatei" accept=".json,application/json" hidden></p>
        <p class="hinweis"><button type="button" class="mini gefahr" id="pfLeeren">Alle Einträge zurücksetzen</button>
          löscht Termine, Listen und Zahlen — Profil, PIN und Kalender bleiben.</p>
      </div>
      <p class="buildzeile">Stand ${BUILD}</p>
    </div>`;
  document.getElementById('pfSave').onclick = ()=>{
    profilSpeichern();
    const b = document.getElementById('pfSave');
    if(b && !b.dataset.laeuft){
      b.dataset.laeuft = "1";
      const alt = b.textContent;
      b.textContent = "Gespeichert ✓"; b.classList.add('okpuls');
      setTimeout(()=>{ b.textContent = alt; b.classList.remove('okpuls'); delete b.dataset.laeuft; }, 1800);
    }
  };
  const rs = document.getElementById('pfRestore');
  const datei = document.getElementById('pfDatei');
  if(rs) rs.onclick = ()=> datei.click();
  if(datei) datei.onchange = ()=>{
    const f = datei.files && datei.files[0];
    if(!f) return;
    const leser = new FileReader();
    leser.onload = ()=>{
      let paket;
      try{ paket = JSON.parse(leser.result); }
      catch(e){ alert("Diese Datei lässt sich nicht lesen."); return; }
      const blob = paket && paket.daten ? paket.daten : paket;
      if(!blob || typeof blob !== "object" || !("entries" in blob)){
        alert("Das sieht nicht nach einer Sicherung aus."); return;
      }
      const anzahl = Object.keys(blob.entries||{}).length;
      const wann = paket && paket.stand ? new Date(paket.stand).toLocaleString("de-DE") : "unbekannt";
      if(!confirm(`Sicherung vom ${wann} mit ${anzahl} Terminen einspielen?\n\nAlle jetzigen Einträge werden ersetzt.`)) return;
      if(!confirm("Wirklich einspielen? Das lässt sich nicht rückgängig machen.")) return;
      const vorher = clean(dataBlob());
      applyData(blob);
      shadow = JSON.parse(JSON.stringify(vorher));   // erzwingt das Schreiben aller Unterschiede
      dataReady = true;
      clearTimeout(saveTimer); flushSave(); renderAll();
      alert("Sicherung eingespielt.");
    };
    leser.readAsText(f);
    datei.value = "";
  };

  const leeren = document.getElementById('pfLeeren');
  if(leeren) leeren.onclick = ()=>{
    if(!confirm("Alle Termine, Listen, Nachträge und Zahlen löschen?\n\nProfil, PIN und Kalenderabo bleiben erhalten.")) return;
    if(!confirm("Wirklich alles zurücksetzen? Das lässt sich nicht rückgängig machen.")) return;
    const vorher = clean(dataBlob());
    applyData(null);
    shadow = JSON.parse(JSON.stringify(vorher));
    dataReady = true;
    clearTimeout(saveTimer); flushSave(); renderAll();
    alert("Alle Einträge wurden zurückgesetzt.");
  };

  const bk = document.getElementById('pfBackup');
  if(bk) bk.onclick = ()=>{
    const daten = JSON.stringify({dk:me.dk, name:`${me.vorname} ${me.nachname}`, stand:new Date().toISOString(),
      daten: clean(dataBlob())}, null, 1);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([daten], {type:"application/json"}));
    a.download = `businessplan-${me.dk}-${dk(new Date())}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 4000);
    bk.textContent = "gesichert"; setTimeout(()=> bk.textContent = "Daten sichern", 1800);
  };
  /* Sagt in einem Satz, ob der neue Stand wirklich angekommen ist -
     statt dass wir es per Screenshot raten muessen. */
  (function selbstauskunft(){
    const css = document.getElementById('pfCss');
    if(css){
      const link = document.querySelector('link[href*="ui.css"]');
      const geladen = [...document.styleSheets].some(b => (b.href||"").includes("ui.css"));
      const regel = getComputedStyle(document.documentElement).getPropertyValue('--tab-h').trim();
      css.textContent = (link ? link.getAttribute('href').split("=")[1] : "?")
        + (geladen && regel ? " · aktiv" : " · NICHT aktiv");
    }
    const mm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const m = document.getElementById('pfMotion');
    if(m) m.textContent = mm ? "an" : "aus";
    const a = document.getElementById('pfAnim');
    if(a) a.textContent = (bewegungJetzt() === "aus" || (mm && bewegungJetzt() !== "an"))
      ? "laufen nicht" : "laufen";
  })();
  box.querySelectorAll('[data-thema]').forEach(b=> b.onclick = ()=>{ themaSetzen(b.dataset.thema, true); renderProfil(); });
  box.querySelectorAll('[data-bewegung]').forEach(b=> b.onclick = ()=>{
    settings.bewegung = b.dataset.bewegung;
    bewegungSetzen(); saveData(); renderProfil();
  });
  document.getElementById('pfPinNeu').onclick = pinDialog;
  const fc = document.getElementById('pfFeedCopy');
  if(fc) fc.onclick = ()=>{
    const url = KALENDER_BASIS + "/kalender/" + me.feedToken + ".ics";
    navigator.clipboard.writeText(url)
      .then(()=>{ fc.textContent = "Kopiert"; setTimeout(()=>fc.textContent="Adresse kopieren",1500); })
      .catch(()=>{ fc.textContent = "Kopieren nicht möglich"; });
  };

}
/* PIN setzen oder ändern – braucht das aktuelle Passwort, weil es damit verschlüsselt hinterlegt wird */
function pinDialog(){
  simpleDialog("PIN festlegen", "Vier Ziffern, dazu dein aktuelles Passwort",
    `<div class="grp">
       <div class="field pinput"><label for="pdPin">Neuer PIN</label>
         <input id="pdPin" inputmode="numeric" maxlength="4" placeholder="0000" autocomplete="off"></div>
       <div class="field pw"><label for="pdPw">Aktuelles Passwort</label>
         <input id="pdPw" type="password" autocomplete="current-password" placeholder="••••••••">
         <button type="button" class="eye" data-eye="pdPw" aria-label="Passwort anzeigen">${EYE_AN}</button></div>
     </div>
     <p class="err" id="pdErr" hidden></p>
     <p class="hinweis">Der PIN öffnet dein Passwort, falls du es vergisst. Er wird nur bei dir und beim Admin angezeigt.</p>`,
    async ()=>{
      const err = document.getElementById('pdErr');
      const zeig = m => { err.textContent = m; err.hidden = !m; };
      const pin = document.getElementById('pdPin').value.trim();
      const pw  = document.getElementById('pdPw').value;
      zeig("");
      if(!/^\d{4}$/.test(pin)) return zeig("Der PIN besteht aus genau vier Ziffern.");
      if(!pw) return zeig("Bitte dein aktuelles Passwort eingeben.");
      try{
        if(!await anmelden(me, me.dk, pw)) throw new Error('pw');   // Passwort prüfen
        await pinSpeichern(pin, me.dk, pw);
        await db.ref('secret/'+me.dk).set({pin});
        closeModal(); renderProfil();
      }catch(e2){ zeig(fehlerkurz(e2) === "kein Schreibrecht – Firebase-Regeln prüfen"
        ? "Kein Schreibrecht — bitte die Firebase-Regeln prüfen."
        : "Das Passwort stimmt nicht."); }
    }, "PIN speichern");
}
async function profilSpeichern(){
  const err = document.getElementById('pfErr');
  const zeig = m => { err.textContent = m; err.hidden = !m; err.classList.remove('ok'); };
  zeig("");
  const vor = document.getElementById('pfVor').value.trim();
  const nach = document.getElementById('pfNach').value.trim();
  const mail = document.getElementById('pfMail').value.trim().toLowerCase();
  const wohn = document.getElementById('pfWohn_str');
  if(wohn){
    const v = wohn.value.trim();
    if(v) settings.wohnort = v; else { delete settings.wohnort; delete settings.wohnLat; delete settings.wohnLon; }
    if(adrZielFeld && adrZielFeld.feld === "pfWohn" && adrZielFeld.lat){
      settings.wohnLat = +adrZielFeld.lat; settings.wohnLon = +adrZielFeld.lon;
    }
    saveData();
  }
  const einst = document.getElementById('pfEinst');
  if(einst){
    const v = einst.value.trim();
    if(v) settings.einstellung = v; else delete settings.einstellung;
    saveData();
  }
  if(!vor || !nach) return zeig("Vor- und Nachname dürfen nicht leer sein.");
  if(mail && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(mail)) return zeig("Diese E-Mail-Adresse sieht nicht gültig aus.");
  try{
    let hinweis = "";
    if(mail && mail !== (me.mail||"") && auth && auth.currentUser){
      /* Firebase verlangt eine Bestätigung, bevor die Adresse übernommen wird */
      await db.ref('users/'+me.dk+'/mailPending').set(mail);   // zuerst merken, dann ändern
      if(auth.currentUser.verifyBeforeUpdateEmail) await auth.currentUser.verifyBeforeUpdateEmail(mail);
      else await auth.currentUser.updateEmail(mail);
      me = {...me, mailPending: mail};
      hinweis = "Wir haben eine Bestätigungsmail an "+mail+" geschickt. Sobald du den Link angeklickt hast, gilt die neue Adresse — melde dich danach einmal neu an.";
    }
    me = {...me, vorname:vor, nachname:nach};
    await userSet(me);
    if(hinweis){ err.textContent = hinweis; err.hidden = false; err.classList.add('ok'); return renderProfil(); }
    renderMenu();
    zeig("");
    renderProfil();
  }catch(e2){
    if(e2.code === "auth/requires-recent-login") return zeig("Bitte melde dich einmal neu an, dann lässt sich die E-Mail ändern.");
    zeig(e2.message || "Speichern fehlgeschlagen.");
  }
}

/* ---------- Kundenberater löschen (nur Teamleiter und Admin) ---------- */
async function alleNutzer(){
  if(!db) return Object.values(localUsers());
  const snap = await db.ref('users').once('value');
  return Object.values(snap.val() || {});
}
async function renderDelete(){
  const box = document.getElementById('kbdel');
  if(!box || !istTeamleiter()) return;
  let inaktiv = [];
  try{
    const alle = istAdmin() ? await alleNutzer() : [];
    const grenze = Date.now() - 365*TAG;
    inaktiv = alle.filter(u => u.dk !== me.dk && !u.dk.startsWith("V-DK") && !u.dk.startsWith("TL-DK")
                               && u.rolle !== "Teamleader"
                               && (u.lastLogin || 0) < grenze);
  }catch(e){}
  box.innerHTML = `
    <div class="asec">
      <h3>Kundenberater löschen</h3>
      <p class="sub">Entfernt Zugang, Termine, Potenzialliste und alle Auswertungen. Das lässt sich nicht rückgängig machen.</p>
      <div class="grp">
        ${fld("delDk","DK-Nummer","","text",'placeholder="DK00000000"')}
        <div class="row2">${fld("delVor","Vorname")}${fld("delNach","Nachname")}</div>
      </div>
      <p class="err" id="delErr" hidden></p>
      <div class="actions"><button class="btn danger" id="delGo">Löschen</button></div>
    </div>
    ${istAdmin() ? `<div class="asec">
      <h3>Rolle ändern</h3>
      <p class="sub">Für alle, die sich ohne das Kürzel TL-DK registriert haben.
        Die DK-Nummer bleibt, nur die Rolle wechselt.</p>
      <div class="grp">
        ${fld("rolDk","DK-Nummer","","text",'autocomplete="off" spellcheck="false"')}
        <div class="field"><label>Neue Rolle</label>
          <div class="seg" id="rolSeg">
            <button type="button" data-rolle="Teamleader" aria-pressed="true">Teamleiter</button>
            <button type="button" data-rolle="Kundenberater" aria-pressed="false">Kundenberater</button>
          </div></div>
      </div>
      <p class="err" id="rolErr" hidden></p>
      <p class="hinweis" id="rolOk" hidden></p>
      <div class="actions einzeln"><button class="btn" id="rolGo">Rolle setzen</button></div>
      <p class="hinweis">Die betroffene Person muss sich danach einmal ab- und wieder
        anmelden, damit die neuen Menüpunkte erscheinen.</p>
    </div>

    <div class="asec">
      <h3>Seit über 12 Monaten inaktiv</h3>
      ${inaktiv.length ? inaktiv.map(u=>`<div class="aline">
          <span class="nm">${u.vorname} ${u.nachname} · ${u.dk}</span>
          <span class="vl">${u.lastLogin ? fmt(new Date(u.lastLogin)) : "nie"}</span>
          <button class="mini" data-inaktiv="${u.dk}">löschen</button></div>`).join("")
        : `<p class="aempty">Keine inaktiven Zugänge.</p>`}
      <p class="hinweis">Die Liste erscheint bei jedem Aufruf neu — ein automatisches Löschen im Hintergrund ist ohne kostenpflichtige Serverfunktionen nicht möglich.</p>
    </div>` : ""}`;
  const rolSeg = document.getElementById('rolSeg');
  if(rolSeg) rolSeg.querySelectorAll('[data-rolle]').forEach(b=> b.onclick = ()=>
    rolSeg.querySelectorAll('[data-rolle]').forEach(x=> x.setAttribute('aria-pressed', x===b)));
  const rolGo = document.getElementById('rolGo');
  if(rolGo) rolGo.onclick = async ()=>{
    const err = document.getElementById('rolErr'), ok = document.getElementById('rolOk');
    const zeig = m => { err.textContent = m; err.hidden = !m; ok.hidden = true; };
    const dkv = document.getElementById('rolDk').value.trim().toUpperCase();
    const rolle = (rolSeg.querySelector('[aria-pressed="true"]') || {}).dataset.rolle;
    zeig("");
    if(!dkv) return zeig("Bitte eine DK-Nummer eintragen.");
    if(dkv === me.dk) return zeig("Die eigene Rolle lässt sich hier nicht ändern.");
    let u;
    try{ u = await userGet(dkv); }catch(e){ return zeig("Keine Verbindung zur Datenbank."); }
    if(!u) return zeig("Zu dieser DK-Nummer ist niemand angemeldet.");
    if(u.rolle === "Admin") return zeig("Ein Admin-Zugang lässt sich hier nicht ändern.");
    try{ await db.ref('users/'+dkv+'/rolle').set(rolle); }
    catch(e){ return zeig("Nicht gespeichert: " + (e.message || e)); }
    err.hidden = true;
    ok.textContent = `${u.vorname} ${u.nachname} ist jetzt ${rolle}.`;
    ok.hidden = false;
  };
  document.getElementById('delGo').onclick = ()=> loeschenStarten(
    document.getElementById('delDk').value.trim().toUpperCase(),
    document.getElementById('delVor').value.trim(),
    document.getElementById('delNach').value.trim());
  box.querySelectorAll('[data-inaktiv]').forEach(b=> b.onclick = async ()=>{
    const u = await userGet(b.dataset.inaktiv);
    if(u) loeschenStarten(u.dk, u.vorname, u.nachname);
  });
}
async function loeschenStarten(dk, vor, nach){
  const err = document.getElementById('delErr');
  const zeig = m => { if(err){ err.textContent = m; err.hidden = !m; } };
  zeig("");
  if(!DK_RE.test(dk)) return zeig("Die DK-Nummer muss DK und acht Ziffern haben.");
  if(dk === me.dk) return zeig("Den eigenen Zugang kannst du hier nicht löschen.");
  let u;
  try{ u = await userGet(dk); }catch(e){ return zeig("Keine Verbindung zur Datenbank."); }
  if(!u) return zeig("Zu dieser DK-Nummer ist niemand registriert.");
  if(!nameGleich(u.vorname,vor) || !nameGleich(u.nachname,nach)) return zeig("Name und DK-Nummer passen nicht zusammen.");
  if(u.rolle !== "Kundenberater" && !istAdmin()) return zeig("Nur Kundenberater lassen sich hier löschen.");

  simpleDialog("Wirklich löschen?", "", 
    `<div class="summary">Sind Sie sicher, dass Sie Kundenberater <b>${u.vorname} ${u.nachname}</b> mit der DK-Nummer
       <b>${u.dk}</b> unwiderruflich aus dem System löschen wollen?</div>
     <p class="hinweis">Alle Termine, Kundendaten, Auswertungen und der Zugang werden entfernt.</p>`,
    async ()=>{
      const schritte = [
        ['deleted/'+dk, {am:Date.now(), von:me.dk}],
        ['data/'+dk, null],
        ['recovery/'+dk, null],
        ['secret/'+dk, null],
        ['users/'+dk, null]
      ];
      if(u.uid) schritte.push(['uids/'+u.uid, null]);
      const gescheitert = [];
      try{
        for(const [pfad, wert] of schritte){
          try{ await db.ref(pfad).set(wert); }
          catch(e){ gescheitert.push(pfad.split("/")[0]); }
        }
        if(gescheitert.length) throw new Error("Nicht gelöscht: "+[...new Set(gescheitert)].join(", "));
        if(me.team && me.team.includes(dk)){
          me.team = me.team.filter(x=>x!==dk);
          await userSet(me);
        }
        closeModal();
        await fuelleMemberSelect();
        renderDelete();
      }catch(e2){ closeModal(); zeig("Löschen fehlgeschlagen: "+(e2.message||"")); }
    }, "Endgültig löschen");
}

/* ---------- Sitzungspflege ---------- */
const NEUANMELDUNG_NACH = 60*TAG, PAUSE_MAX = 14*TAG;
function sitzungAbgelaufen(u){
  const jetzt = Date.now();
  const gesehen = store.get('bw-lastseen') || 0;
  if(u.lastLogin && jetzt - u.lastLogin > NEUANMELDUNG_NACH) return "Aus Sicherheitsgründen bitte alle 60 Tage neu anmelden.";
  if(gesehen && jetzt - gesehen > PAUSE_MAX) return "Du warst länger als zwei Wochen nicht da — bitte einmal neu anmelden.";
  return "";
}


/* Wie viele Wochen in Folge wurde das Wochenziel erreicht? */
function zielSerie(){
  if(!(wunsch.einkommen > 0)) return {wochen:0, beste:0};
  let lauf = 0, beste = 0, aktuell = 0, erste = true;
  const m = mondayOf(new Date());
  for(let i=0; i<104; i++){
    const von = new Date(m); von.setDate(von.getDate() - i*7);
    const bis = new Date(von); bis.setDate(bis.getDate()+6);
    const vm = vertriebsmonat(von);
    const ziel = monatsZiel(vm);
    const wochenziel = (ziel.fg + ziel.wg) / vm.weeks;
    if(!wochenziel) break;
    const u = umsatz(dk(von), dk(bis));
    const erreicht = (u.fg + u.wg) >= wochenziel;
    if(erreicht){ lauf++; beste = Math.max(beste, lauf); }
    else { if(erste) aktuell = lauf; lauf = 0; }
    if(erste && !erreicht) erste = false;
  }
  return {wochen: erste ? lauf : aktuell, beste: Math.max(beste, erste ? lauf : aktuell)};
}

