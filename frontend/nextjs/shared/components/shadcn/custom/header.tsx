import { SidebarTrigger } from '@/shared/components/shadcn/ui/sidebar'
import MenuBar from '@/shared/components/shadcn/custom/menu-bar'
import MenuNav from '@/shared/components/shadcn/custom/menu-nav'

export default function Header() {
  return (
    <header className="bg-background sticky top-0 z-50 flex h-16 flex-row items-center gap-2 border-b px-4 py-2">
      <SidebarTrigger className="border-border -ml-1 rounded-full border" />
      <div className="flex w-full flex-col justify-center">
        <MenuNav />
        <MenuBar />
      </div>
    </header>
  )
}

/* 'use client'

import { SidebarTrigger } from '@/shared/components/ui/sidebar'

export function SidebarTriggerButton() {
  return <SidebarTrigger className="border-border -ml-1 rounded-full border" />
} */
