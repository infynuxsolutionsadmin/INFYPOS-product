import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force browser tab favicon update immediately
const updateTabFavicon = () => {
  const existingLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel='shortcut icon']");
  existingLinks.forEach(l => l.remove());

  const svgLink = document.createElement('link');
  svgLink.rel = 'icon';
  svgLink.type = 'image/svg+xml';
  svgLink.href = `/favicon.svg?v=${Date.now()}`;
  document.head.appendChild(svgLink);

  const pngLink = document.createElement('link');
  pngLink.rel = 'alternate icon';
  pngLink.type = 'image/png';
  pngLink.href = `/favicon-32x32.png?v=${Date.now()}`;
  document.head.appendChild(pngLink);
};
updateTabFavicon();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

