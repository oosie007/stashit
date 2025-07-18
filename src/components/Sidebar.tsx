import { Home, Bookmark, Heart, Highlighter, Image, Menu, Plus, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";

interface SidebarProps {
  active: string;
  onCategoryChange: (category: string) => void;
  onAddClick?: () => void;
  email?: string;
  avatarUrl?: string;
  name?: string;
}

export function Sidebar({ active, onCategoryChange, onAddClick, email, avatarUrl, name }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { icon: <Home />, label: "All Items", id: "all" },
    { icon: <Bookmark />, label: "Articles", id: "articles" },
    { icon: <Highlighter />, label: "Highlights", id: "highlights" },
    { icon: <Image />, label: "Stashed Images", id: "images" },
    { icon: <Heart />, label: "Loved", id: "loved" },
    { icon: <FileText />, label: "Notes", id: "notes" },
    // Add more as needed
  ];

  return (
    <div className={`transition-all ${collapsed ? "w-16" : "w-56"} bg-background border-r h-full flex flex-col`}>
      <div className="flex flex-col gap-2 m-2">
        <div className="flex items-center gap-3 h-14">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
            <Menu />
          </Button>
          {/* Logo only on desktop sidebar */}
          <img
            src="/images/logo.png"
            alt="StashIt Logo"
            className={`transition-all ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'} h-10 hidden md:block`}
            style={{ maxWidth: collapsed ? 0 : 120 }}
          />
        </div>
        {!collapsed && (
          <Button
            variant="default"
            className="bg-black text-white hover:bg-zinc-900 w-full font-semibold"
            onClick={onAddClick}
          >
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        )}
      </div>
      <nav className="flex-1 flex flex-col gap-2 mt-4">
        {items.map(item => (
          <Button
            key={item.id}
            variant={active === item.id ? "secondary" : "ghost"}
            className="flex items-center gap-2 justify-start"
            onClick={() => onCategoryChange(item.id)}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Button>
        ))}
      </nav>
      {/* Sticky footer for user profile */}
      {!collapsed && (
        <div className="sticky bottom-0 w-full bg-background border-t px-4 py-3 z-10">
          <UserMenu email={email || ''} avatarUrl={avatarUrl} name={name} />
        </div>
      )}
    </div>
  );
} 