import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import BookingApp from './BookingApp.jsx';
import './styles.css';

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
