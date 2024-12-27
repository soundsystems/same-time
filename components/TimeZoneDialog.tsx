'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function TimeZoneDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [permission, setPermission] = useState<PermissionState | null>(null)

  useEffect(() => {
    const checkPermission = async () => {
      if ('permissions' in navigator) {
        const status = await navigator.permissions.query({ name: 'geolocation' })
        setPermission(status.state)
        if (status.state === 'prompt') {
          setIsOpen(true)
        }
      }
    }
    checkPermission()
  }, [])

  const handleAllow = () => {
    navigator.geolocation.getCurrentPosition(
      () => {
        setPermission('granted')
        setIsOpen(false)
      },
      () => {
        setPermission('denied')
        setIsOpen(false)
      }
    )
  }

  const handleDeny = () => {
    setPermission('denied')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allow Location Access</DialogTitle>
          <DialogDescription>
            SameTime needs access to your location to determine your time zone. Do you want to allow this?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleDeny}>Deny</Button>
          <Button onClick={handleAllow}>Allow</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

