"use client"

import * as React from "react"
import {
  LayoutDashboard,
} from "lucide-react"
import { Link } from "react-router-dom"
import { SidebarNotification } from "@/components/sidebar-notification"
import { SpaceSwitcher } from "@/components/space-switcher"
import { useSpaceStore } from "@/stores/space-store"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface Space {
  id: string
  name: string
  description?: string
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  spaces?: Space[]
  selectedSpace?: Space
  onSpaceSelect?: (space: Space) => void
  onCreateSpace?: () => void
}

const navGroups = [
  {
    label: "主菜单",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
];

export function AppSidebar({ 
  spaces = [], 
  selectedSpace, 
  onSpaceSelect, 
  onCreateSpace, 
  ...props 
}: AppSidebarProps) {
  const { selectedSpace: storeSelectedSpace, setSelectedSpace } = useSpaceStore()
  
  // 使用 store 中的选中空间，如果没有则使用 props 中的
  const currentSelectedSpace = storeSelectedSpace || selectedSpace
  
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="px-2">
          <SpaceSwitcher
            spaces={spaces}
            selectedSpace={currentSelectedSpace}
            onSpaceSelect={(space) => {
              setSelectedSpace(space)
              if (onSpaceSelect) onSpaceSelect(space)
            }}
            onCreateSpace={() => {
              if (onCreateSpace) onCreateSpace()
            }}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarNotification />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
