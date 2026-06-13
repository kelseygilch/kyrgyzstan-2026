// ============================================================================
//  Firebase configuration for shared live sync
// ============================================================================
//
//  Leave FIREBASE_CONFIG as null  -> the app works LOCAL-ONLY (each browser keeps
//  its own copy, like before).
//
//  Paste your Firebase web config below -> all four of you see the SAME live data,
//  synced automatically across phones/laptops/browsers.
//
//  NOTE: a Firebase *web config* is NOT a secret. Google designs it to ship in
//  client-side code — security is enforced by your Realtime Database rules, not by
//  hiding these values. So it's safe to commit this file to GitHub.
//
//  How to get it:  Firebase console -> Project settings -> "Your apps" -> Web app
//  -> "SDK setup and configuration" -> Config.  Make sure it includes databaseURL.
//
//  Example:
//    const FIREBASE_CONFIG = {
//      apiKey: "AIza............",
//      authDomain: "your-project.firebaseapp.com",
//      databaseURL: "https://your-project-default-rtdb.firebaseio.com",
//      projectId: "your-project",
//      storageBucket: "your-project.appspot.com",
//      messagingSenderId: "0000000000",
//      appId: "1:0000000000:web:abcdef123456"
//    };
// ============================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB3LbpuQIq1EiVfDyhepzg5AD3CLgrc7Gc",
  authDomain: "kyrgyzstan-trip.firebaseapp.com",
  databaseURL: "https://kyrgyzstan-trip-default-rtdb.firebaseio.com",
  projectId: "kyrgyzstan-trip",
  storageBucket: "kyrgyzstan-trip.firebasestorage.app",
  messagingSenderId: "1035607494218",
  appId: "1:1035607494218:web:e468c7794905a8e8c1e0b3",
  measurementId: "G-9MW5HQFWK6"
};

// All four of you must share the same TRIP_ID to see the same data. Leave as-is.
const TRIP_ID = "kyrgyzstan-2026";
