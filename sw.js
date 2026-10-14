/* Digitaler Businessplan – Offlinebetrieb
   VERSION bei jedem Hochladen um eins erhöhen. Der Rest läuft von allein:
   das Gerüst kommt sofort aus dem Zwischenspeicher und wird im Hintergrund
   erneuert, die Daten holt immer Firebase. */
const VERSION = "dbp-v29";
const DATEIEN = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/app.css?v=29",
  "./css/ui.css?v=29",
  "./css/theme.css?v=29",
  "./css/planer.css?v=29",
  "./css/extras.css?v=29",
  "./css/design.css?v=29",
  "./css/feinschliff.css?v=29",
  "./css/planer-a.css?v=29",
  "./css/feinschliff2.css?v=29",
  "./css/verkaeufe.css?v=29",
  "./css/update18.css?v=29",
  "./css/feinschliff3.css?v=29",
  "./css/animationen.css?v=29",
  "./css/update24.css?v=29",
  "./css/motion.css?v=29",
  "./css/fenster.css?v=29",
  "./css/glas.css?v=29",
  "./css/flott.css?v=29",
  "./js/01-konstanten.js?v=29",
  "./js/02-datum.js?v=29",
  "./js/03-daten.js?v=29",
  "./js/04-raster.js?v=29",
  "./js/05-dialog.js?v=29",
  "./js/06-nachbereitung.js?v=29",
  "./js/07-potenzial.js?v=29",
  "./js/08-wiedervorlage.js?v=29",
  "./js/09-dialogschritte.js?v=29",
  "./js/10-statistik.js?v=29",
  "./js/11-druck.js?v=29",
  "./js/12-vertriebsmonat-provision.js?v=29",
  "./js/13-provisionsrechner.js?v=29",
  "./js/14-provisionswunsch.js?v=29",
  "./js/15-auswertungen.js?v=29",
  "./js/16-cloud-konto.js?v=29",
  "./js/17-anmeldung.js?v=29",
  "./js/18-teamansicht.js?v=29",
  "./js/19-profil.js?v=29",
  "./js/20-wochenmeldung.js?v=29",
  "./js/21-adresse.js?v=29",
  "./js/22-inventur.js?v=29",
  "./js/23-ziele-jobtickets.js?v=29",
  "./js/24-team-wochenmeldung.js?v=29",
  "./js/25-fahrtenbuch.js?v=29",
  "./js/26-kundenliste.js?v=29",
  "./js/27-abgleich-menue.js?v=29",
  "./js/28-heute.js?v=29",
  "./js/29-jahresrueckblick.js?v=29",
  "./js/30-zaehlen.js?v=29",
  "./js/31-hilfe.js?v=29",
  "./js/32-start.js?v=29",
  "./js/33-planer.js?v=29",
  "./js/34-messe.js?v=29",
  "./js/35-wochenmeldung.js?v=29",
  "./js/36-heute.js?v=29",
  "./js/37-inventur.js?v=29",
  "./js/38-team.js?v=29",
  "./js/39-rest.js?v=29",
  "./js/41-ergaenzungen.js?v=29",
  "./js/42-verkaeufe.js?v=29",
  "./js/43-anmeldungen-vian.js?v=29",
  "./js/44-katalog.js?v=29",
  "./js/45-animationen.js?v=29",
  "./js/46-datenschutz.js?v=29",
  "./js/47-sicherheit.js?v=29",
  "./js/48-motion.js?v=29",
  "./js/49-zaehlwerk.js?v=29",
  "./js/50-fenster-motion.js?v=29",
  "./js/51-interessenten.js?v=29",
  "./js/52-design.js?v=29"
];

self.addEventListener("install", ev=>{
  self.skipWaiting();
  ev.waitUntil(caches.open(VERSION).then(c=>
    /* einzeln statt addAll: fehlt eine Datei, bricht nicht die ganze Installation ab */
    Promise.all(DATEIEN.map(d=> c.add(d).catch(()=>{})))).catch(()=>{}));
});
self.addEventListener("activate", ev=>{
  ev.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("message", ev=>{ if(ev.data === "uebernehmen") self.skipWaiting(); });

self.addEventListener("fetch", ev=>{
  const url = new URL(ev.request.url);
  if(ev.request.method !== "GET") return;
  /* Firebase, Schriften und Adresssuche nie aus dem Zwischenspeicher bedienen */
  if(url.hostname.includes("firebase") || url.hostname.includes("google") ||
     url.hostname.includes("gstatic") || url.hostname.includes("komoot") ||
     url.hostname.includes("workers.dev")) return;

  const eigen = url.origin === location.origin;
  if(eigen){
    /* Gerüst: erst aus dem Speicher ausliefern, dann im Hintergrund erneuern */
    ev.respondWith(caches.match(ev.request).then(treffer=>{
      const frisch = fetch(ev.request).then(r=>{
        const kopie = r.clone();
        caches.open(VERSION).then(c=>c.put(ev.request, kopie)).catch(()=>{});
        return r;
      }).catch(()=> treffer || caches.match("./index.html"));
      return treffer || frisch;
    }));
    return;
  }
  ev.respondWith(fetch(ev.request).catch(()=> caches.match(ev.request)));
});
