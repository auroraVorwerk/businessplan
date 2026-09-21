/* ================= Letzte offene Punkte =================
   1. Einstellungen statt Profil, Hilfe als Unterpunkt, Zugangsdaten sichtbar
   2. Nichtkauf: statt eigenem Potenzial-Formular nur der Grund, direkt
      in der Nachbereitung. Alles gilt automatisch als offenes Potenzial.
      Die Wiedervorlage-Abfrage fällt weg – die Liste gibt es nicht mehr.
   3. Teammitglieder: aus dem Team entfernen, Berater ohne App anlegen und
      deren Wochenmeldung von Hand eintragen                             */

/* ---------- 1 · Einstellungen ---------- */
PAGES.profil = "Einstellungen";
(function(){
  const i = MENUE.findIndex(m => m[0] === "profil");
  if(i >= 0) MENUE[i] = ["profil","Einstellungen"];
  const h = MENUE.findIndex(m => m[0] === "faq");
  if(h >= 0) MENUE.splice(h, 1);                 // Hilfe liegt jetzt in den Einstellungen
})();

const renderProfilAlt = renderProfil;
renderProfil = async function(){
  await renderProfilAlt();
  const box = document.getElementById('profil');
  if(!box || !me || box.querySelector('#rsZugang')) return;
  const h3 = box.querySelector('.asec h3');
  if(h3 && h3.textContent.trim() === "Profil") h3.textContent = "Einstellungen";

  const zugang = document.createElement('div');
  zugang.className = 'asec'; zugang.id = 'rsZugang';
  zugang.innerHTML = `<h3>Zugangsdaten</h3>
    <p class="sub">Nur für dich sichtbar. Angemeldet wird immer mit der DK-Nummer.</p>
    <div class="rsliste">
      <div class="rszeile"><span>DK-Nummer</span><b>${me.dk.replace(/^TL-/,"")}</b></div>
      <div class="rszeile"><span>PIN</span><b id="rsPin">••••</b>
        <button class="mini" id="rsPinZeig">anzeigen</button><button class="mini" id="rsPinNeu">ändern</button></div>
      <div class="rszeile"><span>Passwort</span><b id="rsPw">••••••••</b>
        <button class="mini" id="rsPwZeig">anzeigen</button><button class="mini" id="rsPwNeu">ändern</button></div>
    </div>
    <p class="hinweis" id="rsHinweis" hidden></p>`;
  const hilfe = document.createElement('div');
  hilfe.className = 'asec';
  hilfe.innerHTML = `<h3>Hilfe</h3>
    <p class="sub">Erste Schritte und Antworten auf häufige Fragen.</p>
    <div class="actions"><button class="btn" id="rsHilfe">Hilfe öffnen</button></div>`;
  box.insertBefore(zugang, box.children[1] || null);
  box.appendChild(hilfe);

  const hinweis = t => { const p = document.getElementById('rsHinweis'); p.textContent = t; p.hidden = !t; };
  document.getElementById('rsHilfe').onclick = ()=>{ location.hash = 'faq'; };
  document.getElementById('rsPinZeig').onclick = async ()=>{
    const pin = await pinLesen(me.dk);
    document.getElementById('rsPin').textContent = pin || "nicht hinterlegt";
  };
  document.getElementById('rsPwZeig').onclick = async ()=>{
    hinweis("");
    try{
      const pin = await pinLesen(me.dk);
      if(!pin) return hinweis("Ohne hinterlegten PIN lässt sich das Passwort nicht anzeigen. Lege über „ändern“ beim PIN einen an.");
      document.getElementById('rsPw').textContent = await passwortOeffnen(pin);
    }catch(e){ hinweis("Das Passwort ließ sich nicht öffnen. Setz PIN oder Passwort einmal neu, dann klappt es wieder."); }
  };
  document.getElementById('rsPinNeu').onclick = ()=> pinAendernDialog();
  document.getElementById('rsPwNeu').onclick  = ()=> passwortAendernDialog();
};

/* ---------- 2 · Nichtkauf: nur der Grund ---------- */
/* Deine sechs Gründe bleiben, dazu vier, die sich mit ihnen nicht überschneiden */
[["will es sich überlegen","#8FBF9F"],["hat schon ein vergleichbares Gerät","#6FC3A0"],
 ["sieht keinen Bedarf","#9FB4E8"],["will nichts an der Tür entscheiden","#D8C48A"]].forEach(([g,c])=>{
  if(!NK_GRUENDE.includes(g)) NK_GRUENDE.push(g);
  if(typeof NK_FARBE === "object" && NK_FARBE && !NK_FARBE[g]) NK_FARBE[g] = c;
});

function nkGrundHTML(n){
  const gew = n.nkgruende || [];
  return `<div class="grp nkgrund">
      <div class="sect"><span class="lb">Warum nicht gekauft? (mehrfach möglich)</span>
        <div class="nkchips">${NK_GRUENDE.map(g=>
          `<button type="button" class="nkchip${gew.includes(g)?" an":""}" data-nkg="${g.replace(/"/g,'&quot;')}"
             aria-pressed="${gew.includes(g)}">${g}</button>`).join("")}</div></div>
      ${fld("grund","Eigener Grund (freiwillig)",n.grund||"")}
      <p class="hinweis">Der Kunde kommt mit dem vollen Potenzial in die Potenzialliste.
        Was er schon besitzt, trägst du dort nach.</p>
    </div>`;
}
const nbFormAlt = nbForm;
nbForm = function(){
  let h = nbFormAlt();
  const n = draft.nb || {};
  /* Das Potenzial-Formular weicht dem Grund */
  h = h.replace(/<div class="grp">\s*<div class="actions"><button type="button" class="btn[^"]*" id="potOeffnen">[\s\S]*?<\/button><\/div>\s*<\/div>/g,
                nkGrundHTML(n));
  /* Die Wiedervorlage-Abfrage fällt weg */
  h = h.replace(/<div class="h4">Wiedervorlage<\/div>\s*<div class="grp">\s*<div class="field"><label for="wvMonat">[\s\S]*?<\/div>\s*<\/div>/, "");
  return h;
};
document.addEventListener('click', ev=>{
  const b = ev.target.closest('[data-nkg]');
  if(!b || typeof draft === "undefined" || !draft) return;
  collect();
  const g = b.dataset.nkg;
  const l = draft.nb.nkgruende = draft.nb.nkgruende || [];
  const i = l.indexOf(g);
  if(i >= 0) l.splice(i,1); else l.push(g);
  draft.nb.besitz = draft.nb.besitz || [];      // nichts gilt als vorhanden – volles Potenzial
  repaint();
});

/* ---------- 3 · Team ---------- */
function teamManuell(){ return settings.teamManuell || (settings.teamManuell = []); }
function teamMeldungen(){ return settings.teamMeldungen || (settings.teamMeldungen = {}); }

/* Entfernen und Berater ohne App: Knöpfe unter der Mitgliederauswahl */
function teamLeisteEinbauen(){
  const bar = document.querySelector('#page-team .teambar');
  if(!bar || bar.querySelector('#tmEntfernen')) return;
  bar.insertAdjacentHTML('beforeend',
    `<button class="btn" id="tmEntfernen" hidden>Aus dem Team entfernen</button>
     <button class="btn" id="tmOhneApp">Berater ohne App</button>`);
  const sel = document.getElementById('memberSel');
  const zeigeKnopf = ()=>{ document.getElementById('tmEntfernen').hidden = !sel.value; };
  sel.addEventListener('change', zeigeKnopf); zeigeKnopf();

  document.getElementById('tmEntfernen').onclick = ()=>{
    const dk = sel.value; if(!dk) return;
    const name = sel.options[sel.selectedIndex].textContent;
    simpleDialog("Aus dem Team entfernen", name,
      `<p class="hinweis">${name} verschwindet aus deinem Team, aus der Team-Wochenmeldung und
        aus der Teamprovision. Die Daten des Beraters bleiben unangetastet.</p>`,
      async ()=>{
        me.team = (me.team || []).filter(x => x !== dk);
        await userSet(me);
        try{ const l = (await db.ref('users/'+dk+'/leader').once('value')).val();
             if(l === me.dk) await db.ref('users/'+dk+'/leader').remove(); }catch(e){}
        closeModal();
        if(typeof zurueckZuMir === "function") zurueckZuMir();
        await fuelleMemberSelect(); zeigeKnopf();
        renderTeamManuell();
      }, "Entfernen");
  };
  document.getElementById('tmOhneApp').onclick = ()=> manuellDialog(null);
}

function manuellDialog(id){
  const m = id ? teamManuell().find(x=>x.id===id) : {name:"", einst:""};
  simpleDialog(id ? "Berater bearbeiten" : "Berater ohne App", "Nutzt die App nicht – Meldung kommt von dir",
    `<div class="grp">${fld("tmmName","Name",m.name||"")}
       ${fld("tmmEinst","Einstellungsdatum",m.einst||"","date")}</div>
     <p class="hinweis">Das Einstellungsdatum bestimmt den Satz der Teamprovision.</p>
     ${id ? `<div class="actions"><button type="button" class="btn gefahr" id="tmmWeg">Entfernen</button></div>` : ""}`,
    ()=>{
      const name = document.getElementById('tmmName').value.trim();
      const einst = document.getElementById('tmmEinst').value;
      if(!name) return;
      if(id){ Object.assign(m, {name, einst}); }
      else teamManuell().push({id:"M"+Date.now().toString(36), name, einst});
      saveData(); closeModal(); renderTeamManuell();
      try{ renderProv(); }catch(e){}
    }, "Speichern");
  const weg = document.getElementById('tmmWeg');
  if(weg) weg.onclick = ()=>{
    settings.teamManuell = teamManuell().filter(x=>x.id!==id);
    delete teamMeldungen()[id];
    saveData(); closeModal(); renderTeamManuell();
    try{ renderProv(); }catch(e){}
  };
}

const MANUELL_FELDER = [
  ["termine","Kundentermine"],["einheiten","Einheiten gesamt"],["einheitenFG","davon Festgebiet"],
  ["einheitenMesse","davon Messe"],["umsatzNetto","Umsatz netto €"],["k70ein","K70 Einkauf €"],
  ["pci","Premium CheckIn"],["promos","Promotions"],["kontakte","Kontakte"],["promoTermine","Termine aus Promotion"],
  ["empfehlungen","Empfehlungen"],["jobtickets","Jobtickets"],
  ["nTermine","Kundentermine Folgewoche"],["erwUmsatz","Erwarteter Umsatz netto €"],["erwEinheiten","Erwartete Einheiten"],
  ["nPromos","Promotions Folgewoche"],["nTerminieren","FGB-Blöcke Folgewoche"]];

function meldungManuellDialog(id, wochenKey){
  const m = teamManuell().find(x=>x.id===id); if(!m) return;
  const alt = (teamMeldungen()[id] || {})[wochenKey] || {};
  const {week} = isoWeek(fromDk(wochenKey));
  simpleDialog(`${m.name} · KW ${week}`, "Wochenmeldung von Hand",
    `<div class="grp mmgitter">${MANUELL_FELDER.map(([k,l])=>
      fld("mm_"+k, l, alt[k] ?? "", "text", 'inputmode="decimal"')).join("")}</div>`,
    ()=>{
      const w = {};
      MANUELL_FELDER.forEach(([k])=>{ const v = document.getElementById("mm_"+k).value; if(v !== "") w[k] = num(v); });
      const alle = teamMeldungen(); alle[id] = alle[id] || {}; alle[id][wochenKey] = w;
      saveData(); closeModal(); renderTeamManuell();
      try{ renderProv(); }catch(e){}
    }, "Woche speichern");
}

function renderTeamManuell(){
  const seite = document.getElementById('page-team');
  if(!seite || !istTeamleiter()) return;
  teamLeisteEinbauen();
  let box = document.getElementById('tmManuell');
  if(!box){ box = document.createElement('div'); box.id = 'tmManuell'; box.className = 'asec'; seite.appendChild(box); }
  const liste = teamManuell();
  const woche = dk(tmMontag || monday);
  box.innerHTML = `<h3>Berater ohne App</h3>
    <p class="sub">Zählen voll in Team-Wochenmeldung und Teamprovision mit.</p>
    ${liste.length ? liste.map(m=>{
      const hat = (teamMeldungen()[m.id]||{})[woche];
      return `<div class="rszeile">
        <span>${m.name}<small>${m.einst ? "seit " + fmt(fromDk(m.einst)) : "ohne Einstellungsdatum"}</small></span>
        <button class="mini" data-mmel="${m.id}">${hat ? "Meldung ändern" : "Meldung eintragen"}</button>
        <button class="mini" data-mbear="${m.id}">Bearbeiten</button></div>`;}).join("")
      : `<p class="hinweis">Noch niemand eingetragen. Über „Berater ohne App“ legst du jemanden an.</p>`}`;
  box.querySelectorAll('[data-mmel]').forEach(b=> b.onclick = ()=> meldungManuellDialog(b.dataset.mmel, woche));
  box.querySelectorAll('[data-mbear]').forEach(b=> b.onclick = ()=> manuellDialog(b.dataset.mbear));
}

/* Die Meldung eines Beraters ohne App in dieselbe Form wie meldungDaten bringen */
function meldungAusManuell(w){
  const b = v => (v||0) * MWST;                         // Tabelle rechnet netto aus brutto
  return {termine:w.termine||0, aktiv:(w.termine||w.einheiten||0) > 0, einheiten:w.einheiten||0,
    einheitenFG:w.einheitenFG||0, einheitenMesse:w.einheitenMesse||0,
    umsatzFG:b(w.umsatzNetto), umsatzWG:0, umsatzMesse:0, k70ein:b(w.k70ein), pci:w.pci||0,
    promoFG:w.promos||0, promoWG:0, kontakteFG:w.kontakte||0, kontakteWG:0,
    promoTermineFG:w.promoTermine||0, promoTermineWG:0, empfehlungen:w.empfehlungen||0, jobtickets:w.jobtickets||0,
    nTermine:w.nTermine||0, erwarteterUmsatz:b(w.erwUmsatz), erwarteteEinheiten:w.erwEinheiten||0,
    nPromos:w.nPromos||0, nTerminieren:w.nTerminieren||0};
}

/* Team-Wochenmeldung: Berater ohne App als eigene Tabelle darunter */
const teamMeldungMitManuell = teamMeldung;
teamMeldung = async function(){
  await teamMeldungMitManuell();
  const box = document.getElementById('tmeldung');
  if(!box || !teamManuell().length) return;
  const woche = dk(tmMontag || monday);
  const daten = teamManuell().map(m=>{
    const w = (teamMeldungen()[m.id]||{})[woche];
    return w ? {name:m.name + " *", m: meldungAusManuell(w)} : null;
  }).filter(Boolean);
  const fehlt = teamManuell().filter(m=> !((teamMeldungen()[m.id]||{})[woche])).map(m=>m.name);
  const sec = document.createElement('div');
  sec.className = 'asec';
  sec.innerHTML = (daten.length ? tmTabelle("Berater ohne App · diese Woche", TMSP, daten)
                                 + tmTabelle("Berater ohne App · kommende Woche", TMSP_N, daten) : "")
    + `<p class="hinweis">* von Hand eingetragen${fehlt.length ? ` · noch keine Meldung: ${fehlt.join(", ")}` : ""}</p>`;
  const excel = box.querySelector('#tmExcel');
  box.insertBefore(sec, excel ? excel.closest('.asec') : null);
};

/* Teamprovision: Berater ohne App mit ihren eingetragenen Umsätzen */
const tpLadenOhneManuell = tpLaden;
tpLaden = async function(vm){
  const res = await tpLadenOhneManuell(vm);
  const kopie = {daten:[...res.daten.filter(x=>!x.manuell)], fehler:res.fehler};
  teamManuell().forEach(m=>{
    let nettoUm = 0;
    Object.entries(teamMeldungen()[m.id] || {}).forEach(([wk, w])=>{
      if(wk >= vm.fromK && wk <= vm.toK) nettoUm += +w.umsatzNetto || 0;
    });
    const wochen = m.einst ? Math.max(0, Math.floor((Date.now() - fromDk(m.einst).getTime())/(7*86400000)) + 1) : null;
    const satz = wochen === null ? null : tpSatz(wochen);
    kopie.daten.push({dk:m.id, name:m.name + " *", einst:m.einst, wochen, satz, nettoUm,
                      anteil: satz === null ? 0 : nettoUm * satz, manuell:true});
  });
  return kopie;
};

/* Team-Seite bei jedem Aufruf ergänzen */
const showMitTeam = show;
show = function(k){
  showMitTeam(k);
  if(document.body.dataset.page === "team") try{ renderTeamManuell(); }catch(e){ console.error(e); }
  if(document.body.dataset.page === "provision") try{ renderProv(); }catch(e){ console.error(e); }
};


/* ---------- PIN und Passwort: ansehen und ändern ----------
   Nach dem Umstellen von TL-DK auf DK liegen PIN und verschlüsseltes
   Passwort womöglich noch unter der alten Nummer. Dann wird dort gesucht. */
const pinLesenOhneAlt = pinLesen;
pinLesen = async function(dk){
  let p = await pinLesenOhneAlt(dk);
  if(!p && me && me.umgezogenVon && dk === me.dk) p = await pinLesenOhneAlt(me.umgezogenVon);
  return p;
};
async function passwortOeffnen(pin){
  try{ return await pinOeffnen(pin, me.dk); }
  catch(e){
    if(me.umgezogenVon) return await pinOeffnen(pin, me.umgezogenVon);
    throw e;
  }
}
async function bestaetigePasswort(pw){
  const u = auth && auth.currentUser;
  if(!u) throw new Error("Nicht angemeldet.");
  const cred = firebase.auth.EmailAuthProvider.credential(u.email, pw);
  await u.reauthenticateWithCredential(cred);
  return u;
}
function zugangFehler(e){
  const c = (e && e.code) || "";
  if(/wrong-password|invalid-credential|invalid-login/.test(c)) return "Das aktuelle Passwort stimmt nicht.";
  if(/too-many-requests/.test(c)) return "Zu viele Versuche. Bitte kurz warten.";
  if(/weak-password/.test(c)) return "Das neue Passwort braucht mindestens 6 Zeichen.";
  if(/network/.test(c)) return "Keine Verbindung.";
  return (e && e.message) || "Hat nicht geklappt.";
}
function pinAendernDialog(){
  simpleDialog("PIN festlegen", "Vier Ziffern – dein Notschlüssel, falls du das Passwort vergisst",
    `<div class="grp">${fld("npPin","Neuer PIN","","password",'inputmode="numeric" maxlength="4" autocomplete="off"')}
       ${fld("npPw","Dein aktuelles Passwort","","password",'autocomplete="current-password"')}</div>
     <p class="err" id="npErr" hidden></p>`,
    async ()=>{
      const pin = document.getElementById('npPin').value.trim();
      const pw  = document.getElementById('npPw').value;
      const err = document.getElementById('npErr');
      const zeig = t => { err.textContent = t; err.hidden = false; };
      if(!/^\d{4}$/.test(pin)) return zeig("Der PIN besteht aus genau vier Ziffern.");
      try{
        await bestaetigePasswort(pw);
        await db.ref('secret/'+me.dk).set({pin});
        await pinSpeichern(pin, me.dk, pw);
        closeModal(); renderProfil();
      }catch(e){ zeig(zugangFehler(e)); }
    }, "Speichern");
}
function passwortAendernDialog(){
  simpleDialog("Passwort ändern", "Gilt ab sofort für die Anmeldung",
    `<div class="grp">${fld("ppAlt","Aktuelles Passwort","","password",'autocomplete="current-password"')}
       ${fld("ppNeu","Neues Passwort","","password",'autocomplete="new-password"')}
       ${fld("ppNeu2","Neues Passwort wiederholen","","password",'autocomplete="new-password"')}</div>
     <p class="err" id="ppErr" hidden></p>`,
    async ()=>{
      const alt = document.getElementById('ppAlt').value;
      const neu = document.getElementById('ppNeu').value;
      const neu2 = document.getElementById('ppNeu2').value;
      const err = document.getElementById('ppErr');
      const zeig = t => { err.textContent = t; err.hidden = false; };
      if(neu.length < 6) return zeig("Das neue Passwort braucht mindestens 6 Zeichen.");
      if(neu !== neu2) return zeig("Die beiden neuen Passwörter stimmen nicht überein.");
      try{
        const u = await bestaetigePasswort(alt);
        await u.updatePassword(neu);
        const pin = await pinLesen(me.dk);
        if(pin) await pinSpeichern(pin, me.dk, neu);    // damit „anzeigen“ das neue zeigt
        closeModal(); renderProfil();
      }catch(e){ zeig(zugangFehler(e)); }
    }, "Ändern");
}

/* ---------- Beträge: Nachkommastellen werden gerundet ----------
   Gilt für alle Betragsfelder (Eingabe mit Dezimaltastatur). 150,90 wird 151,
   150,40 wird 150. Punkt und Komma werden beide verstanden. */
document.addEventListener('change', ev=>{
  const f = ev.target;
  if(!f || f.tagName !== "INPUT" || f.getAttribute('inputmode') !== "decimal") return;
  if(!f.value.trim()) return;
  const gerundet = Math.round(num(f.value));
  if(String(gerundet) !== f.value) f.value = String(gerundet);
}, true);
