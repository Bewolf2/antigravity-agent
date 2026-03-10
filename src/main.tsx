import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@fontsource/inter';
import '@fontsource/noto-sans-sc';
import './i18n'; // Initialize i18n

const rootElement = document.getElementById('app');
if (!rootElement) {
  throw new Error('Failed to find root element');
}
ReactDOM.createRoot(rootElement).render(
    <App />
);
