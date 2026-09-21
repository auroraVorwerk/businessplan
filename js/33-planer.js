/* ================= Planer · Fassung G =================
   Diese Datei wird NACH 04-raster.js geladen und ersetzt dort die
   Funktion render(). Alles andere aus 04-raster.js bleibt gültig:
   Antippen, Halten und Schieben, die Tagesleiste, die Dialoge für
   Bestellrahmen und Einkauf. Möchtest du zurück zur alten Ansicht,
   nimmst du die eine Zeile mit 33-planer.js aus der index.html.

   Aufbau wie im Tabellenblatt:
     · Zeit läuft von spät nach früh, jede Stunde eine Zeile
     · je Tag zwei Spuren
     · ein Termin, der mit niemandem kollidiert, nimmt die volle Breite
     · überschneiden sich zwei, teilen sie sich den Platz
     · feste Termine (Meeting, Privat, Individuell) stehen auf ihrer
       echten Zeit und gehen immer über die volle Breite
     · Text unten links, bei Terminierung und Promotion unten rechts   */

let gpZeichnet = false;                // verhindert, dass sich render und tagesleiste gegenseitig aufrufen
let gpKlassen = null;                  // die Klassen, die #grid von Anfang an hatte
const GP_OBEN = 23;                    // oberer Rand der Zeitachse
const GP_UNTEN = Math.min(...HOURS_ASC);
const gpBreit = () => matchMedia("(min-width: 760px)").matches;
/* Richtung der Zeitachse: Standard spät oben, umschaltbar auf früh oben */
const gpFrueh = () => settings.planerRichtung === "frueh";
const gpStunden = () => gpFrueh() ? HOURS_ASC : START_HOURS;

/* Alle Termine eines Tages als Blöcke mit echter Zeit */
function gpBloecke(day){
  const liste = [];
  HOURS_ASC.forEach(h=>{
    const e = entries[key(day,h)];
    if(!e) return;
    const fest = ["meeting","privat","individuell"].includes(e.kind);
    let von = h, bis = h + 2;
    if(fest){
      if(e.von) von = toDec(e.von);
      if(e.bis){ const b = toDec(e.bis); bis = (b === 0 ? 24 : b); }
      if(e.bisTag && e.bisTag > day) bis = 24;          // mehrtägig: bis zum Rand
    }
    von = Math.max(GP_UNTEN, von);
    bis = Math.min(GP_OBEN, Math.max(bis, von + 0.5));
    liste.push({e, h, von, bis, fest});
  });
  /* Folgetage einer mehrtägigen Privatzeit ohne eigenen Eintrag */
  Object.keys(entries).forEach(k=>{
    const [d] = k.split("|"), e = entries[k];
    if(!e || !["privat","individuell"].includes(e.kind) || !e.bisTag) return;
    if(day <= d || day > e.bisTag) return;
    liste.push({e, h:null, von:GP_UNTEN, bis:GP_OBEN, fest:true, fremdTag:true});
  });
  return liste.sort((a,b)=> a.von - b.von || b.bis - a.bis);
}

/* Spuren vergeben: nur wer sich wirklich überschneidet, teilt sich die Breite */
function gpSpuren(liste){
  const enden = [];
  liste.forEach(b=>{
    let i = 0;
    while(enden[i] !== undefined && enden[i] > b.von + 0.001) i++;
    b.spur = i; enden[i] = b.bis;
  });
  /* zusammenhängende Gruppen bilden */
  const offen = liste.slice(), gruppen = [];
  while(offen.length){
    const g = [offen.shift()];
    let gewachsen = true;
    while(gewachsen){
      gewachsen = false;
      for(let i = 0; i < offen.length; i++){
        const x = offen[i];
        if(g.some(y => x.von < y.bis - 0.001 && x.bis > y.von + 0.001)){
          g.push(x); offen.splice(i,1); i--; gewachsen = true;
        }
      }
    }
    gruppen.push(g);
  }
  gruppen.forEach(g=>{
    const n = g.length === 1 ? 1 : Math.max(...g.map(b => b.spur)) + 1;
    g.forEach(b=>{ b.spuren = n; if(n === 1) b.spur = 0; });
  });
  return liste;
}

function gpZeit(x){
  const h = Math.floor(x), m = Math.round((x - h) * 60);
  return pad(h) + (m ? ":" + pad(m) : "");
}

/* Eine Tagesspalte */
function gpSpalte(d, iTag, heute){
  const day = dk(d);
  const bloecke = gpSpuren(gpBloecke(day));
  const belegt = new Map();                       // Stunde -> Block, der sie deckt
  bloecke.forEach(b=>{
    HOURS_ASC.forEach(h=>{ if(h >= Math.floor(b.von) && h < b.bis) belegt.set(h, b); });
  });

  let rows = "";
  gpStunden().forEach((hr,idx)=>{
    const alt = idx % 2 ? " row-alt" : "";
    const b = belegt.get(hr);
    const weich = b && (b.e.kind === "privat" || b.e.kind === "individuell");
    if(!b || weich){
      rows += `<button class="slot gprow${alt}${weich?" soft":""}${archivMark(day,hr)?" hatarchiv":""}"
         data-day="${day}" data-hour="${hr}"
         aria-label="${DAYS_L[iTag]} ${pad(hr)}–${pad(hr+2)} Uhr, frei">${archivMark(day,hr)}</button>`;
    }else{
      rows += `<div class="gprow gpvoll${alt}"></div>`;
    }
  });

  let bl = "";
  bloecke.forEach(b=>{
    const e = b.e;
    const oben = (gpFrueh() ? (b.von - GP_UNTEN) : (GP_OBEN - b.bis)) * 100 / (GP_OBEN - GP_UNTEN);
    const hoch = (b.bis - b.von) * 100 / (GP_OBEN - GP_UNTEN);
    const breite = 100 / (b.spuren || 1);
    const links = (b.spur || 0) * breite;
    const c = colorOf(e) || "var(--surface-2)";
    const qc = quelleFarbe(e, true);
    const l = label(e);
    const status = e.status ? " done" : (e.nb && Object.keys(e.nb).length ? " halb" : "");
    const rechts = e.kind === "terminieren" ? " rechts" : "";
    const zeit = b.fest ? `${gpZeit(b.von)}–${gpZeit(b.bis)}` : `${pad(b.h)}–${pad(b.h+2)}`;
    const tipp = `${l.t1}${e.quelle ? " · " + e.quelle : ""} · ${zeit}`;
    if(b.fremdTag){
      bl += `<div class="gpblock fest fremdtag" style="top:${oben}%;height:${hoch}%;left:0;width:100%;
             background:${c};color:${textOn(c)}"><span class="gptxt"><b>${l.t1}</b></span></div>`;
      return;
    }
    bl += `<button class="slot filled gpblock${b.fest?" fest":""}${b.spuren>1?" geteilt":""}${status}"
       style="top:${oben}%;height:${hoch}%;left:${links}%;width:${breite}%;
              background:${c};color:${textOn(c)}${qc?`;--qc:${qc}`:""}"
       data-day="${day}" data-hour="${b.h}" title="${tipp}">
       ${qc ? `<span class="gpq"></span>` : ""}
       <span class="gptxt${rechts}"><b>${l.t1}</b><em>${zeit}${(!b.fest && l.t2) ? " · " + l.t2 : ""}</em></span>
     </button>`;
  });

  return `<div class="gpday${+d === +heute ? " ist-heute" : ""}">
      <div class="gprows">${rows}</div><div class="gpblocks">${bl}</div></div>`;
}

/* Ersetzt die Rasteransicht aus 04-raster.js */
function render(){
  if(gpZeichnet) return;
  gpZeichnet = true;
  try{ gpRender(); } finally { gpZeichnet = false; }
}
function gpRender(){
  weekDays = Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d;});
  const {week,year} = isoWeek(monday);
  const vw = vertriebswoche(week,year);
  const heute = new Date(); heute.setHours(0,0,0,0);

  document.getElementById('kwText').textContent = `KW ${week}`;
  document.getElementById('rangeText').textContent = `${fmt(weekDays[0])} – ${fmt(weekDays[6])}`;
  document.getElementById('todayBtn').hidden = (+monday === +mondayOf(new Date()));

  const breit = gpBreit();
  const tage = breit ? weekDays.map((d,i)=>({d,i})) : [{d: weekDays[tagWahl] || weekDays[0], i: tagWahl || 0}];

  /* Kopfzeile */
  let kopf = `<div class="gpkopf"><span class="gprail gpvw"><b>VW</b><i>${vw.n}/${vw.of}</i></span>`;
  tage.forEach(({d,i})=>{
    kopf += `<span class="gptag${+d === +heute ? " ist-heute" : ""}">${DAYS_S[i]}<small>${fmtShort(d)}</small></span>`;
  });
  kopf += `</div>`;

  /* Zeitleiste */
  let rail = `<div class="gprail">`;
  gpStunden().forEach(hr=>{
    rail += `<div class="gprz"><b>${pad(hr)}</b><i>–${pad(hr+2)}</i></div>`;
  });
  rail += `</div>`;

  const spalten = tage.map(({d,i})=> gpSpalte(d,i,heute)).join("");

  /* Soll und Ist */
  const totals = weekDays.map(d=>dayTotals(dk(d)));
  const soll = sollWerte();
  const vmA = vertriebsmonat(monday);
  const istM = umsatz(vmA.fromK, vmA.toK);
  const zielM = monatsZiel(vmA);
  let mrows = "";
  METRICS.forEach(m=>{
    const txt = `<span class="klang">${m.n}</span><span class="kkurz">${m.kurz||m.n}</span>`;
    const lbl = txt;
    const ampel = (m.k==="fg" || m.k==="wg") ? ampelPunkt(istM[m.k], zielM[m.k], vmA) : "";
    mrows += `<div class="gpmrow"><div class="gpmlbl">${lbl}${ampel}<small>${m.noSoll?"ist":"ist / soll"}</small></div>`;
    tage.forEach(({i})=>{
      const inhalt = m.noSoll
        ? `<span class="ist">${eur(totals[i][m.k])}</span>`
        : `<span class="ist">${eur(totals[i][m.k])}</span><span class="sep">/</span><span class="soll">${eur(soll[m.k])}</span>`;
      mrows += m.click
        ? `<button type="button" class="gpm klick${m.noSoll?" one":""}" data-mclick="${m.click}" aria-label="${m.n} eintragen">${inhalt}<i class="gpstift">✎</i></button>`
        : `<div class="gpm${m.noSoll?" one":""}">${inhalt}</div>`;
    });
    mrows += `</div>`;
  });

  /* Farblegende */
  const leg = [["Kundentermin",COLORS.kunde],["Premium CheckIn",COLORS.premium],
               ["Terminieren",COLORS.terminieren],["Promotion",COLORS.promotion],
               ["Meeting",COLORS.meeting],["Privat",COLORS.privat],["Eigenkauf",COLORS.eigenkauf]]
    .map(([n,c])=>`<span class="gplc"><i style="background:${c}"></i>${n}</span>`).join("");

  if(gpKlassen === null) gpKlassen = grid.className;
  grid.className = (gpKlassen ? gpKlassen + " " : "") + "gp " + (breit ? "breit" : "schmal");
  grid.style.setProperty("--gp-tage", tage.length);
  const richtung = `<div class="gpleiste"><button type="button" class="mini gprichtung" data-gprichtung>
      ${gpFrueh() ? "früh → spät" : "spät → früh"} <span aria-hidden="true">⇅</span></button></div>`;
  grid.innerHTML = richtung + kopf +
    `<div class="gpplan">${rail}<div class="gpspalten">${spalten}</div></div>` +
    `<div class="gpmetrics">${mrows}</div>` +
    `<div class="gplegende">${leg}</div>`;
  tagesleiste();
}

/* Wechselt das Gerät die Lage, muss die Spaltenzahl neu bestimmt werden */
let gpBreitVorher = gpBreit();
addEventListener('resize', ()=>{
  const jetztBreit = gpBreit();
  if(jetztBreit !== gpBreitVorher){ gpBreitVorher = jetztBreit; try{ render(); }catch(e){} }
});
/* Die Tagesleiste wählt am Handy den sichtbaren Tag – jetzt neu zeichnen */
const gpSetzeTagWahl = setzeTagWahl;
setzeTagWahl = function(){
  gpSetzeTagWahl();
  /* Nur wenn wir nicht gerade mitten im Zeichnen sind – tagesleiste()
     ruft diese Funktion am Ende selbst auf. */
  if(!gpBreit() && !gpZeichnet) render();
};


/* Schalter für die Richtung – einmal am Raster angemeldet */
grid.addEventListener('click', ev=>{
  const b = ev.target.closest('[data-gprichtung]');
  if(!b) return;
  settings.planerRichtung = gpFrueh() ? "spaet" : "frueh";
  saveData(); render();
});

/* ---------- Plus-Knopf unten rechts ---------- */
(function(){
  const fab = document.createElement('button');
  fab.type = 'button'; fab.id = 'gpFab'; fab.className = 'gpfab';
  fab.setAttribute('aria-label', 'Termin anlegen');
  fab.innerHTML = '<span aria-hidden="true">+</span>';
  document.body.appendChild(fab);
  fab.onclick = ()=>{
    const d = gpBreit() ? new Date() : (weekDays[tagWahl] || new Date());
    const vorschlag = (()=>{ const h = new Date().getHours() + 1; return Math.min(22, Math.max(7, h)); })();
    const tag = dk(d);
    simpleDialog("Termin anlegen", "Tag und Startzeit wählen",
      `<div class="grp">
         ${fld("gpfTag","Tag",tag,"date")}
         <div class="field"><label for="gpfH">Startzeit</label>${hourSelect("gpfH", vorschlag)}</div>
       </div>
       <p class="err" id="gpfErr" hidden></p>`,
      ()=>{
        const t = document.getElementById('gpfTag').value;
        const h = +document.getElementById('gpfH').value;
        const err = document.getElementById('gpfErr');
        if(!t){ err.textContent = "Bitte einen Tag wählen."; err.hidden = false; return; }
        if(entries[key(t,h)]){ err.textContent = "Um diese Zeit steht schon ein Termin."; err.hidden = false; return; }
        closeModal();
        monday = mondayOf(fromDk(t));
        tagWahl = (fromDk(t).getDay() + 6) % 7;
        render();
        openSlot(t, h);
      }, "Weiter");
  };
})();
