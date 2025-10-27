/**
 * Grid 渲染器管理 Hook
 * 提取Grid.tsx中的渲染器相关逻辑
 */
import { useMemo } from 'react';
import { SpriteManager, ImageManager } from '../../managers';
import type { ISpriteMap } from '../../managers';
import type { IGridTheme } from '../../configs';

interface UseGridRenderersProps {
  theme: IGridTheme;
  customIcons?: ISpriteMap;
}

export function useGridRenderers(props: UseGridRenderersProps) {
  const { theme, customIcons } = props;

  // Sprite 管理器
  const spriteManager = useMemo(
    () => new SpriteManager(customIcons),
    [customIcons]
  );

  // Image 管理器
  const imageManager = useMemo<ImageManager>(() => {
    return new ImageManager();
  }, []);

  return {
    spriteManager,
    imageManager,
  };
}

