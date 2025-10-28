import React from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { DataGridSearchProps } from "@/types/data-grid"

export function DataGridSearch({
  searchQuery,
  onSearchQueryChange,
  searchMatches,
  matchIndex,
  searchOpen,
  onSearchOpenChange,
  onNavigateToNextMatch,
  onNavigateToPrevMatch,
  onSearch,
}: DataGridSearchProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (e.shiftKey) {
        onNavigateToPrevMatch()
      } else {
        onNavigateToNextMatch()
      }
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onSearchOpenChange(false)
    }
  }

  const handleSearchChange = (value: string) => {
    onSearchQueryChange(value)
    onSearch(value)
  }

  if (!searchOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSearchOpenChange(true)}
        className="h-8"
      >
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="pl-8 pr-8 h-8"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSearchOpenChange(false)}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      {searchMatches.length > 0 && (
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToPrevMatch}
            className="h-6 w-6 p-0"
          >
            ↑
          </Button>
          <span>
            {matchIndex + 1} / {searchMatches.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToNextMatch}
            className="h-6 w-6 p-0"
          >
            ↓
          </Button>
        </div>
      )}
    </div>
  )
}


