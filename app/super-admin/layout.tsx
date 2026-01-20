"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Users, UserCog, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const menuItems = [
  {
    title: "Users",
    icon: Users,
    href: "/super-admin/users",
  },
  {
    title: "Trainers",
    icon: UserCog,
    href: "/super-admin/trainers",
  },
  {
    title: "Coupons",
    icon: Ticket,
    href: "/super-admin/coupons",
  },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            {/* Logo */}
            <div className="flex items-center justify-center py-6 px-4">
              <Image
                src="/Main-logo-New.png"
                alt="Breezeway Fitness"
                width={150}
                height={60}
                className="object-contain"
              />
            </div>
            <SidebarGroupLabel className="text-center text-lg" style={{ color: "#F2D578" }}>
              Super Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="transition-all"
                      >
                        <Link
                          href={item.href}
                          className={
                            isActive
                              ? "font-bold"
                              : ""
                          }
                          style={{
                            backgroundColor: isActive ? "#F2D578" : "transparent",
                            color: isActive ? "#000000" : undefined,
                            transform: isActive ? "translateX(4px)" : "translateX(0)",
                          }}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold" style={{ color: "#F2D578" }}>
            Super Admin Dashboard
          </h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
