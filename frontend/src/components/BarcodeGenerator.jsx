import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * BarcodeGenerator — renders a Code 128 barcode as SVG.
 * 
 * @param {string} value - The data to encode (e.g., enrollment number)
 * @param {number} width - Width of each bar (default: 2)
 * @param {number} height - Height of the barcode in px (default: 60)
 * @param {boolean} displayValue - Show text below barcode (default: true)
 * @param {number} fontSize - Font size for the text (default: 14)
 * @param {string} textMargin - Margin between barcode and text (default: 5)
 */
export default function BarcodeGenerator({
  value,
  width = 2,
  height = 60,
  displayValue = true,
  fontSize = 14,
  textMargin = 5,
  lineColor = '#000000',
  background = '#ffffff',
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          textMargin,
          lineColor,
          background,
          margin: 20,
          font: 'monospace',
          fontOptions: 'bold',
          textAlign: 'center',
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [value, width, height, displayValue, fontSize, textMargin, lineColor, background]);

  if (!value) {
    return (
      <div style={{ padding: 'var(--space-4)', color: 'var(--color-gray-400)', fontSize: 'var(--font-sm)' }}>
        No enrollment number to generate barcode.
      </div>
    );
  }

  return <svg ref={svgRef} className="barcode-svg" />;
}
