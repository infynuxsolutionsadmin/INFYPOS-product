import { useEffect, useRef } from 'react';

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const buffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Barcode scanners act like a keyboard but type extremely fast.
      const currentTime = Date.now();
      const elapsed = currentTime - lastKeyTime.current;
      
      // If more than 50ms between keystrokes, it's likely a human typing, reset buffer
      if (elapsed > 50) {
        buffer.current = '';
      }

      // Check if it's the end of a scan (Enter key) and we have a valid length
      if (e.key === 'Enter' && buffer.current.length >= 3) {
        onScan(buffer.current);
        buffer.current = '';
        
        // Only prevent default if we actually handled a scan, to avoid breaking normal enter key usage
        e.preventDefault(); 
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) { 
        // Only capture printable characters
        buffer.current += e.key;
      }
      
      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
}
