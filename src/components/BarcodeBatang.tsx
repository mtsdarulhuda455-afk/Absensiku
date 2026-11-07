import React from 'react';

export interface BarcodeBatangProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
  maxWidth?: string | number;
}

// Standard Code 39 character pattern table
// 9 elements: 5 bars, 4 spaces. 3 of 9 elements are wide (1), 6 are narrow (0).
const CODE39_MAP: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100' // Asterisk is Start/Stop delimiter
};

export interface BarcodeSvgOptions {
  width?: number; // bar narrow width multiplier
  height?: number; // bar height
  showText?: boolean;
  textColor?: string;
  fontSize?: number;
  bgColor?: string;
  barColor?: string;
}

/**
 * Generate a standalone, scan-ready vector SVG string for printing ID cards & barcode sheets
 */
export function generateBarcodeSvg(value: string, options: BarcodeSvgOptions = {}): string {
  const {
    width = 1.4,
    height = 42,
    showText = true,
    textColor = '#0f172a',
    fontSize = 11,
    bgColor = '#FFFFFF',
    barColor = '#000000',
  } = options;

  const cleanValue = (value || '000000')
    .toUpperCase()
    .replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '-');
  const fullSequence = '*' + cleanValue + '*';

  const narrow = width;
  const wide = Math.round(width * 2.5);
  const gap = narrow;
  const quietZone = narrow * 10; // Essential quiet zone so laser/camera scanners detect delimiter

  const bars: { isBlack: boolean; w: number }[] = [];

  // Left quiet zone
  bars.push({ isBlack: false, w: quietZone });

  for (let i = 0; i < fullSequence.length; i++) {
    const char = fullSequence[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP['-'];

    for (let j = 0; j < 9; j++) {
      const isBlack = j % 2 === 0;
      const isWide = pattern[j] === '1';
      bars.push({
        isBlack,
        w: isWide ? wide : narrow,
      });
    }

    // Inter-character space
    if (i < fullSequence.length - 1) {
      bars.push({ isBlack: false, w: gap });
    }
  }

  // Right quiet zone
  bars.push({ isBlack: false, w: quietZone });

  const totalWidth = bars.reduce((sum, b) => sum + b.w, 0);
  const textHeight = showText ? fontSize + 8 : 0;
  const totalHeight = height + textHeight + 4;

  let rects = '';
  let currentX = 0;
  for (const bar of bars) {
    if (bar.isBlack) {
      rects += `<rect x="${currentX}" y="2" width="${bar.w}" height="${height}" fill="${barColor}"/>`;
    }
    currentX += bar.w;
  }

  const textElement = showText
    ? `<text x="${totalWidth / 2}" y="${height + textHeight - 1}" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="${fontSize}" font-weight="bold" fill="${textColor}" letter-spacing="2.5">*${cleanValue}*</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="${totalHeight}" style="max-width: ${totalWidth}px; display: block; margin: 0 auto; shape-rendering: crispEdges;">
    <rect width="${totalWidth}" height="${totalHeight}" fill="${bgColor}"/>
    ${rects}
    ${textElement}
  </svg>`;
}

export const BarcodeBatang: React.FC<BarcodeBatangProps> = ({
  value,
  width = 1.4,
  height = 40,
  showText = true,
  className = '',
  maxWidth,
}) => {
  const cleanValue = (value || '000000')
    .toUpperCase()
    .replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '-');
  const fullSequence = '*' + cleanValue + '*';

  const narrow = width;
  const wide = Math.round(width * 2.5);
  const gap = narrow;
  const quietZone = narrow * 8;

  const bars: { isBlack: boolean; w: number }[] = [];

  // Left quiet zone
  bars.push({ isBlack: false, w: quietZone });

  for (let i = 0; i < fullSequence.length; i++) {
    const char = fullSequence[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP['-'];

    for (let j = 0; j < 9; j++) {
      const isBlack = j % 2 === 0;
      const isWide = pattern[j] === '1';
      bars.push({
        isBlack,
        w: isWide ? wide : narrow,
      });
    }

    if (i < fullSequence.length - 1) {
      bars.push({ isBlack: false, w: gap });
    }
  }

  // Right quiet zone
  bars.push({ isBlack: false, w: quietZone });

  const totalWidth = bars.reduce((sum, b) => sum + b.w, 0);
  const totalHeight = showText ? height + 18 : height;

  return (
    <div
      className={`inline-flex flex-col items-center bg-white p-2 rounded shadow-xs overflow-hidden ${className}`}
      style={{ maxWidth: maxWidth || '100%' }}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{
          maxWidth: '100%',
          width: totalWidth,
          height: 'auto',
          display: 'block',
          shapeRendering: 'crispEdges',
        }}
        className="block"
      >
        <rect width={totalWidth} height={totalHeight} fill="#FFFFFF" />
        {(() => {
          let currentX = 0;
          return bars.map((bar, idx) => {
            const x = currentX;
            currentX += bar.w;
            if (bar.isBlack) {
              return (
                <rect
                  key={idx}
                  x={x}
                  y={2}
                  width={bar.w}
                  height={height}
                  fill="#000000"
                />
              );
            }
            return null;
          });
        })()}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height + 15}
            textAnchor="middle"
            fontFamily="'Courier New', Courier, monospace"
            fontSize="11"
            fontWeight="bold"
            fill="#0f172a"
            letterSpacing="2.5"
          >
            *{cleanValue}*
          </text>
        )}
      </svg>
    </div>
  );
};
