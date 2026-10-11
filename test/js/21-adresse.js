/* ================= Adressvervollständigung ================= */
/* Nutzt Photon (OpenStreetMap) – kein Schlüssel, keine Anmeldung nötig */
let adrTimer = null, adrLetzte = "", adrZiel = "f";
var adrZielFeld = null;                 // fängt Koordinaten außerhalb der Terminmaske auf
const adrBox = () => document.getElementById(adrZiel + '_vorschlaege');
function adrSchliessen(){
  document.querySelectorAll('.vorschlaege').forEach(b=>{ b.hidden = true; b.innerHTML = ""; });
}
async function adrSuchen(text){
  const box = adrBox();
  if(!box) return;
  if(text.length < 4){ adrSchliessen(); return; }
  try{
    const r = await fetch("https://photon.komoot.io/api/?limit=6&lang=de&q="+encodeURIComponent(text));
    const j = await r.json();
    const treffer = (j.features||[])
      .filter(f => f.properties && f.properties.country === "Deutschland"
                && (f.properties.street || f.properties.name))
      .map(f => { const p = f.properties, c = (f.geometry||{}).coordinates || [];
        return {
          str: p.street || p.name || "",
          hnr: p.housenumber || "",
          strasse: [p.street || p.name, p.housenumber].filter(Boolean).join(" "),
          plz: p.postcode || "",
          ort: p.city || p.town || p.village || p.district || "",
          lon: c[0] !== undefined ? Math.round(c[0]*100000)/100000 : "",
          lat: c[1] !== undefined ? Math.round(c[1]*100000)/100000 : ""
        };
      })
      .filter(a => a.strasse);
    /* Doppelte Vorschläge zusammenfassen */
    const gesehen = new Set(), liste = [];
    treffer.forEach(a=>{
      const id = a.strasse+"|"+a.plz+"|"+a.ort;
      if(!gesehen.has(id)){ gesehen.add(id); liste.push(a); }
    });
    if(!liste.length){ adrSchliessen(); return; }
    box.innerHTML = liste.map(a=>
      `<button type="button" class="vorschlag" data-str="${a.str}" data-hnr="${a.hnr}" data-plz="${a.plz}" data-ort="${a.ort}" data-lat="${a.lat}" data-lon="${a.lon}">
         <b>${[a.str,a.hnr].filter(Boolean).join(" ")}</b><span>${[a.plz,a.ort].filter(Boolean).join(" ")}</span></button>`).join("");
    box.hidden = false;
  }catch(err){ adrSchliessen(); }
}
document.addEventListener('input', ev=>{
  if(ev.target.id !== 'f_str' && !ev.target.dataset.adr) return;
  adrZiel = ev.target.dataset.adr || "f";
  const text = ev.target.value.trim();
  if(text === adrLetzte) return;
  adrLetzte = text;
  clearTimeout(adrTimer);
  adrTimer = setTimeout(()=> adrSuchen(text), 350);
});
document.addEventListener('click', ev=>{
  const v = ev.target.closest('.vorschlag');
  if(v){
    const z = v.closest('.vorschlaege').id.replace('_vorschlaege','').replace('strVorschlaege','f');
    const setz = (feld,wert) => { const el = document.getElementById(z+"_"+feld); if(el && wert) el.value = wert; };
    setz('str', v.dataset.str); setz('hnr', v.dataset.hnr);
    setz('plz', v.dataset.plz); setz('ort', v.dataset.ort);
    if(draft && z === "f"){ draft.nb.f_str = v.dataset.str; draft.nb.f_hnr = v.dataset.hnr;
               draft.nb.f_plz = v.dataset.plz; draft.nb.f_ort = v.dataset.ort;
               draft.nb.f_lat = v.dataset.lat; draft.nb.f_lon = v.dataset.lon; }
    adrZielFeld = {feld: z, lat: v.dataset.lat, lon: v.dataset.lon};
    if(["pfWohn","fbVon","fbBis"].includes(z)){
      const el = document.getElementById(z+'_str');
      if(el) el.value = [v.dataset.str, v.dataset.hnr].filter(Boolean).join(" ")
                      + (v.dataset.plz || v.dataset.ort ? ", " + [v.dataset.plz, v.dataset.ort].filter(Boolean).join(" ") : "");
    }
    adrSchliessen();
    return;
  }
  if(!ev.target.closest('.vorschlagfeld')) adrSchliessen();
});


