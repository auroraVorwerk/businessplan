/* ---------- Wiedervorlage ---------- */
/* Alles, was noch einmal angesprochen werden soll — das Naheliegendste steht oben. */
function renderWiedervorlage(){
  const el = document.getElementById('wvliste');
  if(!el) return;
  const jetzt = monatJetzt();
  const liste = wiedervorlagen.slice().sort((a,b)=>
    (a.monat||"").localeCompare(b.monat||"") || (a.nachname||"").localeCompare(b.nachname||""));
  if(!liste.length){
    el.innerHTML = leerbox("uhr", "Noch nichts vorgemerkt",
      "Du setzt eine Wiedervorlage im Kein-Kauf-Fenster, unten in der Nachbereitung oder direkt aus der Kundenliste.",
      "Kundenliste öffnen", "kunden");
    return;
  }
  const gruppen = [
    ["Überfällig",   liste.filter(w => w.monat <  jetzt)],
    ["Diesen Monat", liste.filter(w => w.monat === jetzt)],
    ["Später",       liste.filter(w => w.monat >  jetzt)]
  ].filter(g => g[1].length);

  const karte = w => {
    const adr = [w.strasse,[w.plz,w.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const pot = potenzial.find(x => wvId(x) === w.id);
    const gr = (pot && pot.gruende) || [];
    const farbe = gr.length ? grundFarbe(gr[0]) : "";
    return `<div class="pcard${farbe?" gstreif":""}${w.monat <= jetzt ? " faellig" : ""}"
        ${farbe?`style="--gf:${farbe}"`:""}>
      <div class="nm">${w.vorname} ${w.nachname}
        <span class="wieder">${monatText(w.monat)}</span></div>
      <div class="meta">${adr || "keine Adresse hinterlegt"}</div>
      ${w.telefon?`<div class="meta">${w.telefon}</div>`:""}
      ${gr.length?`<div class="gchips">${gr.map(g=>
        `<span style="--gc:${grundFarbe(g)}">${g}</span>`).join("")}</div>`:""}
      ${w.notiz?`<div class="why">${w.notiz}</div>`:""}
      <div class="pact">
        ${w.telefon?`<a class="btn" href="${telLink(w.telefon)}">Anrufen</a>`:""}
        ${adr?`<a class="btn" href="${mapsLink(adr)}" target="_blank" rel="noopener">Route</a>`:""}
        <button class="btn" data-wvtermin="${w.id}">Termin anlegen</button>
        <button class="btn" data-wvedit="${w.id}">Verschieben</button>
        <button class="btn danger" data-wvweg="${w.id}">Erledigt</button>
      </div>
    </div>`;
  };

  el.innerHTML = `<div class="asec">
      <h3>Wiedervorlage</h3>
      <p class="sub">${liste.length} offen · das nächstliegende Datum steht oben.</p>
    </div>` +
    gruppen.map(([titel, ws]) => `<div class="wvgruppe"><h4>${titel} · ${ws.length}</h4>
      <div class="plist">${ws.map(karte).join("")}</div></div>`).join("");

  el.querySelectorAll('[data-wvweg]').forEach(b=> b.onclick = ()=>{
    wvLoeschen(b.dataset.wvweg); renderAll();
  });
  el.querySelectorAll('[data-wvedit]').forEach(b=> b.onclick = ()=>{
    const w = wiedervorlagen.find(x=>x.id===b.dataset.wvedit);
    if(w) wvDialog(w, `${w.vorname} ${w.nachname}`.trim());
  });
  el.querySelectorAll('[data-wvtermin]').forEach(b=> b.onclick = ()=>{
    const w = wiedervorlagen.find(x=>x.id===b.dataset.wvtermin);
    if(w) terminAusPotenzial(w, "Vertriebsadresse");
  });
}
/* Kleines Fenster zum Setzen oder Ändern einer Wiedervorlage */
function wvDialog(person, titel){
  const vorhanden = wvHolen(person) || {};
  simpleDialog("Wiedervorlage", titel || `${person.vorname||""} ${person.nachname||""}`.trim(),
    `<div class="grp">
       <div class="field"><label for="wvdMonat">Wieder ansprechen im Monat</label>
         <input id="wvdMonat" type="month" value="${vorhanden.monat||monatJetzt()}"></div>
       <div class="field"><label for="wvdNotiz">Notiz</label>
         <textarea id="wvdNotiz" style="min-height:70px">${vorhanden.notiz||""}</textarea></div>
     </div>`,
    ()=>{
      const m = (document.getElementById('wvdMonat')||{value:""}).value;
      const nz = (document.getElementById('wvdNotiz')||{value:""}).value;
      wvSetzen(person, m, nz);
      closeModal(); renderAll();
    }, "Speichern");
}
let potTimer = null;
function potListeNeu(){
  clearTimeout(potTimer);
  potTimer = setTimeout(()=>{
    const alt = document.getElementById('potSuche');
    const pos = alt ? alt.selectionStart : 0;
    renderPotenzial();
    const neu = document.getElementById('potSuche');
    if(neu){ neu.focus(); try{ neu.setSelectionRange(pos,pos); }catch(e){} }
  }, 220);
}

