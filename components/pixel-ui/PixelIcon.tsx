/**
 * ByteBook — 8-Bit / 16-Bit Pixel Art SVG Icon Engine
 * Renders crisp pixel-grid icons across iOS and Web/PWA with zero blur.
 */

import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export type PixelIconName =
  | 'book'
  | 'upload'
  | 'settings'
  | 'vocab'
  | 'speaker'
  | 'sparkle'
  | 'image'
  | 'bookmark'
  | 'close'
  | 'back'
  | 'forward'
  | 'sun'
  | 'moon'
  | 'scroll'
  | 'zoom-in'
  | 'zoom-out'
  | 'check'
  | 'key'
  | 'trash'
  | 'return'
  | 'translate';

export interface PixelIconProps {
  name: PixelIconName;
  size?: number;
  color?: string;
}

export const PixelIcon: React.FC<PixelIconProps> = ({
  name,
  size = 16,
  color = '#2B1E16',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {name === 'book' && (
        <>
          <Path
            d="M2 2H7V3H8V14H7V13H2V2ZM9 3H14V13H9V14H8V3H9Z"
            fill={color}
          />
          <Rect x="3" y="4" width="3" height="1" fill="#FFFDF7" />
          <Rect x="3" y="6" width="3" height="1" fill="#FFFDF7" />
          <Rect x="10" y="4" width="3" height="1" fill="#FFFDF7" />
          <Rect x="10" y="6" width="3" height="1" fill="#FFFDF7" />
        </>
      )}

      {name === 'upload' && (
        <>
          <Path d="M7 2H9V4H11V6H9V11H7V6H5V4H7V2Z" fill={color} />
          <Path d="M2 12H4V14H12V12H14V15H2V12Z" fill={color} />
        </>
      )}

      {name === 'settings' && (
        <>
          <Path
            d="M6 1H10V3H12V4H13V6H15V10H13V12H12V13H10V15H6V13H4V12H3V10H1V6H3V4H4V3H6V1ZM6 6V10H10V6H6Z"
            fill={color}
          />
        </>
      )}

      {name === 'vocab' && (
        <>
          <Path d="M3 1H13V15H11V13H9V12H7V13H5V15H3V1Z" fill={color} />
          <Rect x="5" y="4" width="6" height="2" fill="#FFFDF7" />
          <Rect x="5" y="8" width="4" height="1" fill="#FFFDF7" />
        </>
      )}

      {name === 'speaker' && (
        <>
          <Path d="M2 6H5V4H7V2H9V14H7V12H5V10H2V6Z" fill={color} />
          <Rect x="11" y="5" width="1" height="2" fill={color} />
          <Rect x="11" y="9" width="1" height="2" fill={color} />
          <Rect x="13" y="3" width="1" height="10" fill={color} />
        </>
      )}

      {name === 'sparkle' && (
        <>
          <Rect x="7" y="1" width="2" height="4" fill={color} />
          <Rect x="7" y="11" width="2" height="4" fill={color} />
          <Rect x="1" y="7" width="4" height="2" fill={color} />
          <Rect x="11" y="7" width="4" height="2" fill={color} />
          <Rect x="5" y="5" width="6" height="6" fill={color} />
        </>
      )}

      {name === 'image' && (
        <>
          <Path d="M1 2H15V14H1V2ZM3 4V12H13V4H3Z" fill={color} />
          <Rect x="4" y="5" width="2" height="2" fill={color} />
          <Path d="M4 11L7 8L9 10L11 7L12 11H4Z" fill={color} />
        </>
      )}

      {name === 'bookmark' && (
        <Path d="M4 1H12V15L8 11L4 15V1Z" fill={color} />
      )}

      {name === 'close' && (
        <Path
          d="M3 3H5V5H7V7H9V5H11V3H13V5H11V7H9V9H11V11H13V13H11V11H9V9H7V11H5V13H3V11H5V9H7V7H5V5H3V3Z"
          fill={color}
        />
      )}

      {name === 'back' && (
        <Path d="M9 3H11V5H9V7H14V9H9V11H11V13H9V11H7V9H5V7H7V5H9V3Z" fill={color} />
      )}

      {name === 'forward' && (
        <Path d="M7 3H5V5H7V7H2V9H7V11H5V13H7V11H9V9H11V7H9V5H7V3Z" fill={color} />
      )}

      {name === 'sun' && (
        <>
          <Rect x="5" y="5" width="6" height="6" fill={color} />
          <Rect x="7" y="1" width="2" height="2" fill={color} />
          <Rect x="7" y="13" width="2" height="2" fill={color} />
          <Rect x="1" y="7" width="2" height="2" fill={color} />
          <Rect x="13" y="7" width="2" height="2" fill={color} />
        </>
      )}

      {name === 'moon' && (
        <Path d="M6 2H10V4H8V6H7V10H8V12H12V14H6V12H4V10H3V6H4V4H6V2Z" fill={color} />
      )}

      {name === 'scroll' && (
        <Path
          d="M3 2H13V5H12V12H13V14H3V12H4V4H3V2ZM6 5V7H10V5H6ZM6 9V11H10V9H6Z"
          fill={color}
        />
      )}

      {name === 'zoom-in' && (
        <>
          <Path d="M6 2H10V6H14V10H10V14H6V10H2V6H6V2Z" fill={color} />
        </>
      )}

      {name === 'zoom-out' && (
        <Rect x="2" y="7" width="12" height="2" fill={color} />
      )}

      {name === 'check' && (
        <Path d="M12 4H14V6H12V8H10V10H8V12H6V10H4V8H2V6H4V8H6V10H8V8H10V6H12V4Z" fill={color} />
      )}

      {name === 'key' && (
        <Path d="M2 5H7V7H14V9H12V11H10V9H7V11H2V5ZM4 7V9H5V7H4Z" fill={color} />
      )}

      {name === 'trash' && (
        <Path d="M5 2H11V4H14V6H12V14H4V6H2V4H5V2ZM6 7V12H7V7H6ZM9 7V12H10V7H9Z" fill={color} />
      )}

      {name === 'return' && (
        <Path d="M6 3H8V5H13V11H11V7H8V9H6V7H4V5H6V3Z" fill={color} />
      )}

      {name === 'translate' && (
        <>
          <Path d="M1 2H9V4H6V8H8V10H4V8H5V4H1V2Z" fill={color} />
          <Path d="M9 7H13V9H15V14H13V12H9V14H7V9H9V7ZM9 9V11H13V9H9Z" fill={color} />
        </>
      )}
    </Svg>
  );
};
