import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // global styles first so component CSS can override them
import App from './App.jsx';
import { captureSource } from './lib/enquiries';

captureSource(); // remember a link such as ?utm_source=instagram

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
