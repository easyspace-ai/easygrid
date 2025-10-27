import { useEffect, useState } from 'react';

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const hasTouch =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (navigator && (navigator.maxTouchPoints || (navigator as any).msMaxTouchPoints) > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
    setIsTouch(Boolean(hasTouch));
  }, []);

  return isTouch;
}


