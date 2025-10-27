/**
 * Portal Component
 * 用于将组件渲染到 document.body，避免定位问题
 */

import { FC, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface IPortalProps {
  children: ReactNode;
  container?: HTMLElement;
}

export const Portal: FC<IPortalProps> = ({ children, container }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {return null;}

  return createPortal(
    children,
    container || document.body
  );
};

