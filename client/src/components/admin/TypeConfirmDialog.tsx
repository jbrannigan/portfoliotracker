import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { AlertTriangle } from 'lucide-react'

interface TypeConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  destructiveAction: string
  onConfirm: () => void
  isLoading?: boolean
}

export function TypeConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'DELETE',
  destructiveAction,
  onConfirm,
  isLoading = false,
}: TypeConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('')

  const isConfirmed = inputValue === confirmText

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm()
      setInputValue('')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Type <span className="font-mono font-bold text-foreground">{confirmText}</span> to confirm:
          </p>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmText}
            className="font-mono"
            disabled={isLoading}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
          >
            {isLoading ? 'Processing...' : destructiveAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
