/* ---------- Teamansicht ---------- */
async function fuelleMemberSelect(){
  const sel = document.getElementById('memberSel');
  if(!me || !sel) return;
  let namen = [];
  if(istAdmin()){
    try{
      namen = (await alleNutzer()).filter(u=>u.dk!==me.dk)
        .map(u=>({dk:u.dk, name:`${u.vorname} ${u.nachname} · ${u.rolle}`}))
        .sort((a,b)=>a.name.localeCompare(b.name));
    }catch(e){}
  }else{
    for(const dk of (me.team || [])){
      const u = await userGet(dk);
      if(u) namen.push({dk, name:`${u.vorname} ${u.nachname}`});
    }
  }
  sel.innerHTML = `<option value="">— Mitglied auswählen —</option>` +
    namen.map(n=>`<option value="${n.dk}" ${viewUser&&viewUser.dk===n.dk?"selected":""}>${n.name}</option>`).join("");
  document.getElementById('teamHint').textContent = namen.length
    ? `${namen.length} Mitglied${namen.length>1?"er":""} im Team.`
    : "Noch keine Mitglieder. Der Kundenberater muss sich zuerst selbst angemeldet haben.";
}
let teamBlob = null, teamMonday = null, teamLadeFehler = "";
async function zeigeMember(dk){
  if(!dk){ zurueckZuMir(); return; }
  const u = await userGet(dk);
  if(!u) return;
  viewUser = {dk, name:`${u.vorname} ${u.nachname}`};
  teamLadeFehler = "";
  /* Das Leserecht haengt am Vermerk "leader" beim Mitglied. Fehlt er, traegt
     ihn der Teamleiter hier selbst nach - die Regeln erlauben genau das. */
  if(db && !istAdmin() && u.leader !== me.dk){
    try{ await db.ref('users/'+dk+'/leader').set(me.dk); u.leader = me.dk; }
    catch(e){ teamLadeFehler = "Der Teamleiter-Vermerk liess sich nicht setzen: " + (e.message || e); }
  }
  teamBlob = await loadData(dk, true);
  if(!teamBlob && !teamLadeFehler) teamLadeFehler = letzterFehler || "Die Daten kamen leer zurueck.";
  teamMonday = new Date(monday);
  renderTeam();
}
function zurueckZuMir(){
  viewUser = null; teamBlob = null;
  renderTeam();
}
/* Baut Planer und Statistik des Mitglieds, ohne die eigenen Daten anzutasten */
/* Merkt den eigenen Stand und schaltet das Speichern ab */
function fremdStart(){
  clearTimeout(saveTimer);
  const sicherung = {daten: clean(dataBlob()), montag: new Date(monday)};
  fremdAktiv = true;
  return sicherung;
}
/* Stellt den eigenen Stand wieder her - darf beliebig oft aufgerufen werden */
function fremdEnde(sicherung){
  if(!fremdAktiv) return;
  applyData(sicherung.daten);
  monday = new Date(sicherung.montag);
  fremdAktiv = false;
  try{ render(); renderStat(); renderPotenzial(); }catch(e){ console.error(e); }
}
function fremdAnsicht(){
  const sicherung = fremdStart();
  let ergebnis = {gridHtml:"", statHtml:"", meld:"", potHtml:"", potListe:[], tagVoll:[]};
  try{
    applyData(teamBlob);
    monday = new Date(teamMonday);
    render(); renderStat();
    ergebnis.gridHtml = document.getElementById('grid').innerHTML;
    ergebnis.tagVoll = Array.from({length:7},(_,i)=>{
      const d = new Date(teamMonday); d.setDate(d.getDate()+i);
      return START_HOURS.some(hr => entries[key(dk(d),hr)]);
    });
    ergebnis.statHtml = document.getElementById('statTable').innerHTML;
    renderPotenzial();
    ergebnis.potHtml = document.getElementById('plist').innerHTML;
    ergebnis.potListe = potenzial.map(x=>({...x}));
    ergebnis.meld = meldungHTML(new Date(teamMonday), viewUser.name);
  }catch(e){
    /* Bricht hier etwas ab, bleiben Raster, Potenzialliste UND Wochenmeldung
       leer - das sieht dann so aus, als sei der Zugriff gesperrt. Deshalb
       steht der Grund jetzt in der Meldung und nicht nur in der Konsole. */
    console.error("Fremdansicht fehlgeschlagen:", e);
    ergebnis.fehler = String((e && e.message) || e);
    ergebnis.meld = `<div class="asec"><p class="aempty">Die Daten dieses Mitglieds lassen sich
      gerade nicht anzeigen.<br><small class="tspanne">${ergebnis.fehler}</small></p></div>`;
  }finally{
    fremdEnde(sicherung);                 // laeuft immer, auch wenn oben etwas schiefgeht
  }
  return ergebnis;
}
/* Kennzahlen aller Mitglieder für die laufende Woche */
async function teamVergleich(){
  const box = document.getElementById('tmVergleich');
  if(!box || !istTeamleiter()) return;
  const dks = istAdmin()
    ? (await alleNutzer()).filter(u=>u.dk!==me.dk).map(u=>u.dk)
    : (me.team || []);
  if(!dks.length){ box.innerHTML = ""; return; }
  const tage = Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return dk(d);});
  const von = tage[0], bis = tage[6];
  const zeilen = [];
  for(const d of dks){
    const u = await userGet(d).catch(()=>null);
    const blob = await loadData(d, true).catch(()=>null);
    if(!u) continue;
    const e = (blob && blob.entries) || {};
    let termine=0, gemacht=0, verkauft=0, umsatzB=0, einheiten=0;
    Object.keys(e).forEach(k=>{
      const tag = k.split("|")[0], x = e[k];
      if(tag < von || tag > bis) return;
      if(x.kind !== "kunde") return;
      termine++;
      if(x.status === "stattgefunden") gemacht++;
      const n = x.nb || {};
      if(n.verkauft === "Ja"){ verkauft++; umsatzB += num(n.umsatz); einheiten += +n.einheiten||0; }
    });
    zeilen.push({name:`${u.vorname} ${u.nachname}`, termine, gemacht, verkauft, umsatzB, einheiten});
  }
  zeilen.sort((a,b)=> b.umsatzB - a.umsatzB);
  box.innerHTML = `<div class="asec">
    <h3>Team im Vergleich</h3>
    <p class="sub">Kalenderwoche ${isoWeek(monday).week} · nach Umsatz sortiert</p>
    <div class="ascroll"><table class="atable">
      <thead><tr><th>Name</th><th>Termine</th><th>Gehalten</th><th>Abschlüsse</th><th>Quote</th><th>Einheiten</th><th>Umsatz</th></tr></thead>
      <tbody>${zeilen.map(z=>`<tr>
        <td>${z.name}</td><td>${z.termine}</td><td>${z.gemacht}</td><td>${z.verkauft}</td>
        <td>${pct(z.verkauft, z.gemacht)}</td><td>${z.einheiten||"–"}</td><td>${eur(z.umsatzB)}</td>
      </tr>`).join("")}</tbody></table></div>
  </div>`;
}
/* Teamleiter sehen Planer und Statistik nur in der Einarbeitungszeit.
   Ab der 26. Woche nach dem Einstellungsdatum des Mitglieds bleiben nur
   Potenzialliste (Download) und Wochenmeldung. Der Admin ist ausgenommen,
   und ohne hinterlegtes Einstellungsdatum bleibt es beim vollen Zugriff. */
const TM_WOCHEN = 26;
/* Das Einstellungsdatum steht im Profil des Kundenberaters. Ist dort
   keines hinterlegt, kann der Teamleiter es hier selbst eintragen -
   sonst hängt die Sperre daran, ob jemand sein Profil ausgefüllt hat.
   Stehen beide Daten da, zählt das frühere. */
function tmEinstellung(dk){
  return tmEinstQuelle(dk).datum;
}
/* Liefert zusaetzlich, woher das Datum stammt - damit in der Ansicht
   nachvollziehbar steht, warum Planer und Statistik sichtbar sind. */
function tmEinstQuelle(dk){
  const imProfil = teamBlob && teamBlob.settings && teamBlob.settings.einstellung;
  const notiert  = (settings.tmEinst || {})[dk || (viewUser && viewUser.dk) || ""];
  const gueltig = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
  const p = gueltig(imProfil) ? imProfil : null;
  const n = gueltig(notiert)  ? notiert  : null;
  if(p && n) return p < n ? {datum:p, quelle:"aus dem Profil des Mitglieds"}
                          : {datum:n, quelle:"von dir nachgetragen"};
  if(p) return {datum:p, quelle:"aus dem Profil des Mitglieds"};
  if(n) return {datum:n, quelle:"von dir nachgetragen"};
  return {datum:null, quelle:(imProfil || notiert) ? "hinterlegt, aber unlesbar" : ""};
}
function tmZugriff(){
  const datum = tmEinstellung(viewUser && viewUser.dk);
  const wochen = datum ? Math.floor((Date.now() - fromDk(datum).getTime()) / (7*86400000)) : null;
  /* Was ein Teamleiter sieht, haengt nur an Planer und Statistik.
     Der Download der Potenzialliste und die Wochenmeldung stehen
     immer zur Verfuegung - unabhaengig vom Einstellungsdatum. */
  if(istAdmin()) return {voll:true, datum, wochen, rest:null, admin:true};
  if(!datum)     return {voll:true, datum:null, wochen:null, rest:null};
  return {voll: wochen < TM_WOCHEN, datum, wochen, rest: TM_WOCHEN - wochen};
}
/* Der Teamleiter trägt das Einstellungsdatum eines Mitglieds nach.
   Es liegt in den eigenen Daten - fremde Profile werden nicht verändert. */
function tmEinstDialog(){
  if(!viewUser) return;
  const dk = viewUser.dk;
  const imProfil = teamBlob && teamBlob.settings && teamBlob.settings.einstellung;
  simpleDialog("Einstellungsdatum", viewUser.name,
    `<div class="grp">${fld("tmEinstDat","Einstellungsdatum", (settings.tmEinst||{})[dk] || imProfil || "", "date")}</div>
     <p class="hinweis">${imProfil
       ? `Im Profil von ${viewUser.name} steht der ${fmt(fromDk(imProfil))}. Trägst du ein früheres Datum ein, zählt das frühere.`
       : `${viewUser.name} hat im eigenen Profil noch kein Einstellungsdatum hinterlegt.
          Ohne Datum läuft die 26-Wochen-Frist nicht.`}
       Planer und Statistik-PDF sind ${TM_WOCHEN} Wochen ab diesem Datum verfügbar.
       Der Download der Potenzialliste und die Wochenmeldung bleiben dauerhaft.</p>`,
    ()=>{
      const v = document.getElementById('tmEinstDat').value;
      settings.tmEinst = settings.tmEinst || {};
      if(v) settings.tmEinst[dk] = v; else delete settings.tmEinst[dk];
      closeModal(); saveData(); renderTeam();
    }, "Speichern");
}
function renderTeam(){
  const box = document.getElementById('tmViews');
  const bar = document.getElementById('tmWeekbar');
  if(!box) return;
  if(!viewUser){
    box.innerHTML = "";
    if(bar) bar.hidden = true;
    return;
  }
  /* Kommen keine Daten, stand hier frueher einfach nichts - das sah aus wie
     eine Sperre. Jetzt steht der Grund da, samt Knopf zum erneuten Versuch. */
  if(!teamBlob){
    if(bar) bar.hidden = true;
    box.innerHTML = `<div class="tmblock"><h4>${viewUser.name}</h4>
      <p class="aempty">Die Daten dieses Mitglieds lassen sich nicht laden.
      <br><small class="tspanne">${teamLadeFehler || "Grund unbekannt."}</small></p>
      <div class="actions einzeln"><button class="btn" id="tmNochmal">Nochmal versuchen</button></div></div>`;
    const nm = document.getElementById('tmNochmal');
    if(nm) nm.onclick = ()=> zeigeMember(viewUser.dk);
    return;
  }
  const tage = Array.from({length:7},(_,i)=>{const d=new Date(teamMonday);d.setDate(d.getDate()+i);return d;});
  const {week} = isoWeek(teamMonday);
  if(bar){
    bar.hidden = false;
    document.getElementById('tmKw').textContent = `KW ${week}`;
    document.getElementById('tmRange').textContent = `${fmt(tage[0])} – ${fmt(tage[6])}`;
  }
  const v = fremdAnsicht();
  const z = tmZugriff();
  const q = tmEinstQuelle(viewUser.dk);
  const stand = z.datum
    ? `Eingestellt am ${fmt(fromDk(z.datum))} · Woche ${(z.wochen || 0) + 1} · ${q.quelle}`
    : (q.quelle
        ? `Einstellungsdatum ${q.quelle} — Planer und Statistik bleiben sichtbar`
        : "Kein Einstellungsdatum — Planer und Statistik bleiben sichtbar");
  const einstZeile = `<p class="hinweis tmeinst">${stand}
    <button type="button" class="mini" id="tmEinstBtn">${z.datum ? "ändern" : "eintragen"}</button></p>`;
  /* Immer verfügbar: der Download der Potenzialliste.
     Nur wenn das Zeitfenster offen ist: Planer und Statistik-PDF. */
  const knoepfe = z.voll
    ? `<div class="actions">
         <button class="btn primary" id="tmPdf">Statistik als PDF</button>
         <button class="btn" id="tmPotDruck">Potenzialliste als PDF</button></div>`
    : `<div class="actions einzeln">
         <button class="btn primary" id="tmPotDruck">Potenzialliste als PDF</button></div>`;
  const standText = z.voll
    ? (z.rest !== null && z.rest > 0
        ? `Planer und Statistik sind noch ${z.rest} Woche${z.rest === 1 ? "" : "n"} einsehbar.`
        : (z.admin ? "" : "Ohne Einstellungsdatum läuft die 26-Wochen-Frist nicht."))
    : `${viewUser.name} ist länger als ${TM_WOCHEN} Wochen dabei — Planer und Statistik-PDF
       fallen damit weg. Der Download der Potenzialliste und die Wochenmeldung bleiben.`;
  const kopf = `<div class="tmblock">${knoepfe}
      ${standText ? `<p class="hinweis">${standText}</p>` : ""}
      ${einstZeile}</div>`;
  const planer = z.voll
    ? `<div class="tmblock"><h4>Planer · ${viewUser.name}</h4>
        <div class="tagbar" id="tmTagbar"></div>
        <div class="board"><div class="scroller"><div class="grid">${v.gridHtml}</div></div></div></div>`
    : "";
  box.innerHTML = kopf + planer + v.meld;
  const pd = document.getElementById('tmPotDruck');
  if(pd) pd.onclick = ()=> potDrucken(v.potListe, viewUser.name);
  const pdf = document.getElementById('tmPdf');
  if(pdf) pdf.onclick = ()=> fremdPdf();
  const eb = document.getElementById('tmEinstBtn');
  if(eb) eb.onclick = tmEinstDialog;
  tmTagbar(tage, v.tagVoll);
}
/* Auf dem Handy zeigt der Planer nur einen Tag - dieselbe Tagesauswahl
   wie im eigenen Planer, damit man auch hier blättern kann. */
function tmTagbar(tage, voll){
  const bar = document.getElementById('tmTagbar');
  if(!bar) return;
  const heute = dk(new Date());
  bar.innerHTML = tage.map((d,i)=>
    `<button type="button" data-tmtag="${i}" aria-pressed="${i===tagWahl}" class="${dk(d)===heute?"ist-heute":""}">
      ${DAYS_S[i]}<small>${pad(d.getDate())}.</small>${(voll||[])[i]?`<i></i>`:""}</button>`).join("");
  bar.querySelectorAll('[data-tmtag]').forEach(b=> b.onclick = ()=>{
    tagWahl = +b.dataset.tmtag;
    setzeTagWahl();
    bar.querySelectorAll('[data-tmtag]').forEach(x=> x.setAttribute('aria-pressed', +x.dataset.tmtag === tagWahl));
  });
}
/* Statistik eines Mitglieds: Woche wählen, Blatt bauen, drucken.
   Die Seite selbst wird dabei nicht mehr umgeschaltet – deshalb kann sich
   im Druckfenster auch nichts mehr zurücksetzen. */
function fremdPdf(){
  if(!teamBlob || !viewUser) return;
  if(!tmZugriff().voll) return;                      /* nach 26 Wochen gibt es kein PDF mehr */
  kwDialog("Statistik als PDF · " + viewUser.name, teamMonday || monday, mo=>{
    const tabelle = statTabelleFremd(teamBlob, mo);
    if(!tabelle){
      simpleDialog("Statistik als PDF", viewUser.name,
        `<p class="hinweis">Die Statistik dieses Mitglieds lässt sich gerade nicht aufbauen.
         Bitte die Seite einmal neu laden und es noch einmal versuchen.</p>`,
        ()=> closeModal(), "Verstanden");
      return;
    }
    druckBlattBauen(tabelle, mo, viewUser.name);
    druckSkalieren();
    druckStarten('drucke-stat');
  });
}
document.getElementById('memberSel').addEventListener('change', e=> zeigeMember(e.target.value));
addEventListener('hashchange', ()=>{
  if(location.hash === "#team") teamVergleich();
  if(location.hash === "#teammeldung") teamMeldung();
});
document.getElementById('tmPrev').onclick = ()=>{ if(teamMonday){ teamMonday.setDate(teamMonday.getDate()-7); renderTeam(); } };
document.getElementById('tmNext').onclick = ()=>{ if(teamMonday){ teamMonday.setDate(teamMonday.getDate()+7); renderTeam(); } };
document.getElementById('addMember').onclick = ()=>{
  simpleDialog("Mitglied hinzufügen","Der Kundenberater muss sich vorher selbst angemeldet haben",
    `<div class="grp">${fld("tmDk","DK-Nummer des Kundenberaters","","text",'autocomplete="off" spellcheck="false"')}</div>
     <p class="err" id="tmErr" hidden></p>`,
    async ()=>{
      const dk = document.getElementById('tmDk').value.trim().toUpperCase();
      const err = document.getElementById('tmErr');
      const zeig = m => { err.textContent = m; err.hidden = false; };
      if(!DK_RE.test(dk)) return zeig("Die DK-Nummer muss DK und acht Ziffern haben.");
      if(dk === me.dk)   return zeig("Das ist deine eigene DK-Nummer.");
      const u = await userGet(dk);
      if(!u)             return zeig("Zu dieser DK-Nummer ist noch niemand angemeldet.");
      me.team = me.team || [];
      if(me.team.includes(dk)) return zeig(`${u.vorname} ${u.nachname} ist schon im Team.`);
      me.team.push(dk);
      await userSet(me);
      /* Ohne diesen Vermerk gibt es kein Leserecht - ein Fehlschlag darf
         deshalb nicht mehr stillschweigend untergehen. */
      try{ await db.ref('users/'+dk+'/leader').set(me.dk); }
      catch(e){ return zeig("Aufgenommen, aber das Leserecht liess sich nicht setzen: " + (e.message || e)); }
      closeModal(); await fuelleMemberSelect();
    }, "Hinzufügen");
};

/* Bestehende Sitzung fortsetzen.
   Solange Firebase prueft, laeuft der Ladebildschirm - das Anmeldefenster
   erscheint erst, wenn feststeht, dass wirklich niemand angemeldet ist. */
const bootEl = document.getElementById('boot');
let bootFertig = false;
function bootWeg(){
  bootFertig = true;
  if(bootEl){ bootEl.classList.add('weg'); setTimeout(()=>{ bootEl.hidden = true; }, 260); }
}
function zeigeAnmeldung(){
  bootWeg();
  loginEl.hidden = false;
}
/* Sicherheitsnetz: antwortet Firebase nicht, kommt trotzdem das Anmeldefenster */
setTimeout(()=>{
  const ab = document.getElementById('bootAbbruch');
  if(!bootFertig && ab){ ab.hidden = false; ab.onclick = zeigeAnmeldung; }
}, 4000);
setTimeout(()=>{ if(!bootFertig) zeigeAnmeldung(); }, 12000);

renderLogin();
if(auth){
  auth.onAuthStateChanged(async user=>{
    if(!user){
      zeigeAnmeldung();
      try{ await auth.signInAnonymously(); }catch(err){}   // erlaubt die Prüfungen im Anmeldefenster
      return;
    }
    if(user.isAnonymous){ zeigeAnmeldung(); return; }
    try{
      const dk = (await db.ref('uids/'+user.uid).once('value')).val();
      const u  = dk ? await userGet(dk) : null;
      if(u && await istGeloescht(dk)){ await auth.signOut(); zeigeAnmeldung(); lgFehler("Dieser Zugang wurde entfernt."); return; }
      if(u){
        const grund = sitzungAbgelaufen(u);
        if(grund){ await auth.signOut(); zeigeAnmeldung(); lgStep = "login"; lg = {dk}; lgFehler(grund); return; }
        await starteSitzung(u);
        bootWeg();
        return;
      }
    }catch(err){ /* offline */ }
    zeigeAnmeldung();
  });
}else{
  (async ()=>{
    const s = store.get('bw-session');
    if(s && s.dk){
      const u = localUsers()[s.dk];
      if(u){ await starteSitzung(u); bootWeg(); return; }
    }
    zeigeAnmeldung();
  })();
}


