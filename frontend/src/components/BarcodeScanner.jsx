import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * BarcodeScanner — camera-based Code 128 barcode scanner using quagga2.
 * 
 * @param {function} onDetected - Callback fired with the decoded barcode string
 * @param {boolean} active - Whether the scanner is actively scanning (default: true)
 */
export default function BarcodeScanner({ onDetected, active = true }) {
  const scannerRef = useRef(null);
  const quaggaRef = useRef(null);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const lastDetectedRef = useRef('');
  const lastDetectedTimeRef = useRef(0);

  const handleDetected = useCallback((result) => {
    if (!result?.codeResult?.code) return;

    const code = result.codeResult.code;
    const now = Date.now();

    // Debounce: ignore same code within 2 seconds
    if (code === lastDetectedRef.current && now - lastDetectedTimeRef.current < 2000) {
      return;
    }

    lastDetectedRef.current = code;
    lastDetectedTimeRef.current = now;
    onDetected(code);
  }, [onDetected]);

  useEffect(() => {
    if (!active) return;

    let mounted = true;

    async function initScanner() {
      try {
        const Quagga = (await import('@ericblade/quagga2')).default;
        quaggaRef.current = Quagga;

        await new Promise((resolve, reject) => {
          Quagga.init(
            {
              inputStream: {
                type: 'LiveStream',
                target: scannerRef.current,
                constraints: {
                  facingMode: 'environment', // rear camera
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
              },
              decoder: {
                readers: ['code_128_reader'],
              },
              locate: true,
              frequency: 10,
            },
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        if (!mounted) {
          Quagga.stop();
          return;
        }

        Quagga.start();
        Quagga.onDetected(handleDetected);
        setInitializing(false);
        setError(null);
      } catch (err) {
        console.error('Scanner init error:', err);
        if (mounted) {
          setInitializing(false);
          if (err?.name === 'NotAllowedError') {
            setError('Camera access was denied. Please allow camera permissions to scan barcodes.');
          } else if (err?.name === 'NotFoundError') {
            setError('No camera found on this device.');
          } else {
            setError('Failed to initialize camera. Please try again or use manual entry.');
          }
        }
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (quaggaRef.current) {
        quaggaRef.current.offDetected(handleDetected);
        quaggaRef.current.stop();
      }
    };
  }, [active, handleDetected]);

  if (error) {
    return (
      <div className="barcode-scanner-error">
        <div className="scanner-error-icon">📷</div>
        <p>{error}</p>
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', marginTop: 'var(--space-2)' }}>
          You can use the manual input below to enter the enrollment number directly.
        </p>
      </div>
    );
  }

  return (
    <div className="barcode-scanner-container">
      {initializing && (
        <div className="barcode-scanner-loading">
          <div className="spinner spinner-md" />
          <p>Starting camera...</p>
        </div>
      )}
      <div
        ref={scannerRef}
        className="barcode-scanner-viewfinder"
        style={{ display: initializing ? 'none' : 'block' }}
      />
      <div className="barcode-scanner-overlay">
        <div className="scan-line" />
      </div>
    </div>
  );
}
