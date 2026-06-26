'use client'

import * as React from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/shadcn/ui/dropdown-menu'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@/shared/components/shadcn/ui/item'
import { Label } from '@/shared/components/shadcn/ui/label'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/shared/components/shadcn/ui/sidebar'
import { ChevronsUpDownIcon, CheckIcon, SearchIcon } from 'lucide-react'
import { NavUser } from '@/app/(default-layout)/(public)/_components/nav-user'
import type { Session } from 'next-auth'

export default function SideBar({ user }: { user?: Session['user'] }) {
  const data = {
    versions: ['1.0.1', '1.1.0-alpha', '2.0.0-beta1'],
    navMain: [
      {
        title: 'Getting Started',
        url: '#',
        items: [
          {
            title: 'Installation',
            url: '#'
          },
          {
            title: 'Project Structure',
            url: '#'
          }
        ]
      },
      {
        title: 'Building Your Application',
        url: '#',
        items: [
          {
            title: 'Routing',
            url: '#'
          },
          {
            title: 'Data Fetching',
            url: '#',
            isActive: true
          },
          {
            title: 'Rendering',
            url: '#'
          }
        ]
      }
    ],
    user: {
      name: 'shadcn',
      email: 'm@example.com',
      image: '/avatars/shadcn.jpg'
    }
  }

  const [selectedVersion, setSelectedVersion] = React.useState(data.versions[0])

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground">
                  <Item
                    className="p-0"
                    size="xs">
                    <ItemContent>
                      <ItemTitle className="text-sm">Documentation</ItemTitle>
                      <ItemDescription>v{selectedVersion}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronsUpDownIcon />
                    </ItemActions>
                  </Item>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  {data.versions.map(version => (
                    <DropdownMenuItem
                      key={version}
                      onSelect={() => setSelectedVersion(version)}>
                      v{version}{' '}
                      {version === selectedVersion && (
                        <CheckIcon className="ml-auto" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        <form>
          <SidebarGroup className="py-0">
            <SidebarGroupContent className="relative">
              <Label
                htmlFor="search"
                className="sr-only">
                Search
              </Label>
              <SidebarInput
                id="search"
                placeholder="Search the docs..."
                className="pl-8"
              />
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
            </SidebarGroupContent>
          </SidebarGroup>
        </form>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map(item => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map(subItem => (
                  <SidebarMenuItem key={subItem.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={subItem.isActive}>
                      <a href={subItem.url}>{subItem.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
