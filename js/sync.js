/* ============================================================================
 *  TripSync — optional shared live sync via Firebase Realtime Database.
 *
 *  The whole app state is stored as ONE JSON string at  trips/<TRIP_ID>.
 *  Storing a string (rather than a nested tree) deliberately sidesteps the
 *  Realtime Database's handling of empty arrays and null array elements
 *  (e.g. shared-gear `carriers: [null, "Todd"]`), which would otherwise be
 *  silently reshaped on a round-trip.
 *
 *  If FIREBASE_CONFIG is null / missing, or the SDK fails to load, this stays
 *  disabled and the app runs local-only (localStorage) exactly as before.
 * ========================================================================== */
(function () {
  "use strict";

  const cfg = (typeof FIREBASE_CONFIG !== "undefined") ? FIREBASE_CONFIG : null;
  const tripId = (typeof TRIP_ID !== "undefined" && TRIP_ID) ? TRIP_ID : "default";
  const PATH = "trips/" + tripId;
  const configured = !!(cfg && cfg.apiKey && cfg.databaseURL);

  let ref = null;
  let lastJSON = null;      // last payload we wrote or received, to suppress echoes
  let writeTimer = null;
  let handlers = null;

  function setStatus(text, cls) { if (handlers && handlers.onStatus) handlers.onStatus(text, cls); }

  // h = { getState(), applyRemote(stateObj) , onStatus(text,cls) }
  function start(h) {
    handlers = h;
    if (!configured) { setStatus("This device only", ""); return false; }
    if (typeof firebase === "undefined" || !firebase.initializeApp) {
      setStatus("Offline — local only", "error");
      return false;
    }
    try {
      firebase.initializeApp(cfg);
      const db = firebase.database();
      ref = db.ref(PATH);

      // Connection state badge
      db.ref(".info/connected").on("value", snap => {
        if (snap.val() === true) setStatus("Live sync on", "live");
        else setStatus("Reconnecting…", "");
      });

      ref.on("value", snap => {
        const val = snap.val();
        if (val == null) {
          // Empty DB: seed it from whatever this device currently has.
          const s = handlers.getState();
          lastJSON = JSON.stringify(s);
          ref.set(lastJSON).catch(reportErr);
          return;
        }
        const incoming = (typeof val === "string") ? val : JSON.stringify(val);
        if (incoming === lastJSON) return;   // our own write echoed back
        lastJSON = incoming;
        try { handlers.applyRemote(JSON.parse(incoming)); }
        catch (e) { console.warn("TripSync: bad remote payload", e); }
      }, reportErr);

      return true;
    } catch (e) {
      console.warn("TripSync: init failed", e);
      setStatus("Sync error", "error");
      return false;
    }
  }

  function reportErr(e) {
    console.warn("TripSync error", e);
    setStatus("Sync error", "error");
  }

  // Debounced whole-state push.
  function save(state) {
    if (!configured || !ref) return;
    clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      const payload = JSON.stringify(state);
      lastJSON = payload;                    // mark so the echo is ignored
      ref.set(payload).catch(reportErr);
    }, 500);
  }

  window.TripSync = {
    get configured() { return configured; },
    start: start,
    save: save,
  };
})();
