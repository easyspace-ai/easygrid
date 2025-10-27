// 为了避免在浏览器端引入 react-dom/server（在 React 19 下会造成运行时错误），
// 这里直接返回内联 SVG 字符串，替代 renderToString(ReactElement)。

export interface ISpriteProps {
  fgColor: string;
  bgColor: string;
}

const svg = (d: string, props: ISpriteProps, size = 16, strokeWidth = 2) =>
  `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${props.fgColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><g stroke="${props.fgColor}">${d}</g></svg>`;

// SVG with fill support for filled shapes like stars
const svgFilled = (d: string, props: ISpriteProps, size = 16, strokeWidth = 1) =>
  `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${props.fgColor}" stroke="${props.fgColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const drag = (props: ISpriteProps) => svg(
  '<circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />',
  props
);

const detail = (props: ISpriteProps) => svg(
  '<polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />',
  props
);

const add = (props: ISpriteProps) => svg('<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />', props);

const description = (props: ISpriteProps) => svg('<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />', props);

const close = (props: ISpriteProps) => svg('<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />', props);

const expand = (props: ISpriteProps) => svg('<polyline points="6 9 12 15 18 9" />', props);

const collapse = (props: ISpriteProps) => svg('<polyline points="9 18 15 12 9 6" />', props);

const lock = (props: ISpriteProps) => svg('<rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />', props);

export const eyeOff = (props: ISpriteProps) => svg('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />', props);

const star = (props: ISpriteProps) => svgFilled('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />', props);

export const sprites = {
  add,
  drag,
  detail,
  description,
  close,
  expand,
  collapse,
  lock,
  eyeOff,
  star,
};

export enum GridInnerIcon {
  Add = 'add',
  Drag = 'drag',
  Detail = 'detail',
  Description = 'description',
  Close = 'close',
  Expand = 'expand',
  Collapse = 'collapse',
  Lock = 'lock',
  EyeOff = 'eyeOff',
  Star = 'star',
}
