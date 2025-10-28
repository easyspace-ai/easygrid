import React from "react"
import { Keyboard } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { DataGridKeyboardShortcutsProps } from "@/types/data-grid"

export function DataGridKeyboardShortcuts({
  enableSearch = true,
}: DataGridKeyboardShortcutsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Keyboard className="h-4 w-4 mr-2" />
          Shortcuts
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-2">
          <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Navigate cells</span>
              <span className="text-muted-foreground">Arrow keys</span>
            </div>
            <div className="flex justify-between">
              <span>Edit cell</span>
              <span className="text-muted-foreground">Enter</span>
            </div>
            <div className="flex justify-between">
              <span>Save edit</span>
              <span className="text-muted-foreground">Enter</span>
            </div>
            <div className="flex justify-between">
              <span>Cancel edit</span>
              <span className="text-muted-foreground">Escape</span>
            </div>
            <div className="flex justify-between">
              <span>Next cell</span>
              <span className="text-muted-foreground">Tab</span>
            </div>
            {enableSearch && (
              <>
                <div className="flex justify-between">
                  <span>Open search</span>
                  <span className="text-muted-foreground">Ctrl+F</span>
                </div>
                <div className="flex justify-between">
                  <span>Next match</span>
                  <span className="text-muted-foreground">Enter</span>
                </div>
                <div className="flex justify-between">
                  <span>Previous match</span>
                  <span className="text-muted-foreground">Shift+Enter</span>
                </div>
              </>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


