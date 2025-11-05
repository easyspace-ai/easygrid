"use client"

import * as React from "react"
import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import luckdb from "@/lib/luckdb"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CreateSpaceDialogProps {
  onSpaceCreated?: (space: any) => void
}

export function CreateSpaceDialog({ onSpaceCreated }: CreateSpaceDialogProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("请输入空间名称")
      return
    }

    try {
      setCreating(true)
      const newSpace = await luckdb.spaces.create({
        name: name.trim(),
        description: description.trim() || undefined,
      } as any)

      toast.success("创建空间成功")
      setOpen(false)
      setName("")
      setDescription("")
      
      if (onSpaceCreated) {
        onSpaceCreated(newSpace)
      }
    } catch (error: any) {
      console.error("Failed to create space:", error)
      toast.error(error?.message || "创建空间失败")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          创建新空间
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">创建新空间</DialogTitle>
          <DialogDescription className="text-sm">
            创建一个新的工作空间来组织您的数据
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">空间名称 *</Label>
            <Input
              id="name"
              placeholder="例如：项目管理"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">描述（可选）</Label>
            <Textarea
              id="description"
              placeholder="简要描述这个空间的用途"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={creating}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={creating}
          >
            取消
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "创建中..." : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
