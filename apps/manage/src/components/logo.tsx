import * as React from "react"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* 数据库圆柱体 */}
      <rect
        x="6"
        y="8"
        width="20"
        height="16"
        rx="2"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* 数据库顶部椭圆 */}
      <ellipse
        cx="16"
        cy="8"
        rx="10"
        ry="3"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* 数据库底部椭圆 */}
      <ellipse
        cx="16"
        cy="24"
        rx="10"
        ry="3"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* 数据行 */}
      <rect x="8" y="12" width="16" height="1" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      <rect x="8" y="14" width="12" height="1" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      <rect x="8" y="16" width="14" height="1" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      <rect x="8" y="18" width="10" height="1" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      <rect x="8" y="20" width="13" height="1" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      
      {/* 幸运符号 - 四叶草 */}
      <g transform="translate(22, 4)">
        <path
          d="M2 2C2 1 3 0 4 2C5 0 6 1 6 2C6 3 5 4 4 2C3 4 2 3 2 2Z"
          fill="currentColor"
          fillOpacity="0.8"
        />
      </g>
    </svg>
  )
}
