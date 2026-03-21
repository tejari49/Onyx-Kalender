import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App.jsx';
import BookingApp from './src/BookingApp.jsx';
import './src/styles.css';

const root = createRoot(document.getElementById('root'));
const searchParams = new URLSearchParams(window.location.search);
const hashQuery = (window.location.hash && window.location.hash.includes('?')) ? window.location.hash.split('?')[1] : '';
const hashParams = new URLSearchParams(hashQuery);
const bookCode = searchParams.get('book') || hashParams.get('book');

if (bookCode) {
  root.render(
    <React.StrictMode>
      <BookingApp code={bookCode} />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
