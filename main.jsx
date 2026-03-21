import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App.jsx';
import BookingApp from './src/BookingApp.jsx';
import './src/styles.css';

const root = createRoot(document.getElementById('root'));
const searchParams = new URLSearchParams(window.location.search);
const bookCode = searchParams.get('book');

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
