// ============================================================
//  PureForm — Firebase Configuration (CDN mode)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDLbt5pDMkKC3u6ZQGc0-L8Lot6-j7aBIA",
  authDomain:        "formulario-f5430.firebaseapp.com",
  projectId:         "formulario-f5430",
  storageBucket:     "formulario-f5430.firebasestorage.app",
  messagingSenderId: "533941801057",
  appId:             "1:533941801057:web:1ea43f675bf96e690a1a20",
  measurementId:     "G-D3YLZLYTHT"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);