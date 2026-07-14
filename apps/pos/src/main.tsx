import React from 'react';
import ReactDOM from 'react-dom/client';

// Initialize Firebase + Firestore with multi-tab offline persistence.
// This must execute before any component that accesses Firestore.
import './lib/firebase.ts';

import App from './App.tsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
