import { Home, Bookmark, Heart, Highlighter, Image, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  active: string;
  onCategoryChange: (category: string) => void;
}

export function Sidebar({ active, onCategoryChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { icon: <Home />, label: "All Items", id: "all" },
    { icon: <Bookmark />, label: "Articles", id: "articles" },
    { icon: <Highlighter />, label: "Highlights", id: "highlights" },
    { icon: <Image />, label: "Stashed Images", id: "images" },
    { icon: <Heart />, label: "Loved", id: "loved" },
    // Add more as needed
  ];

  return (
    <div className={`transition-all ${collapsed ? "w-16" : "w-56"} bg-background border-r h-full flex flex-col`}>
      <div className="flex items-center gap-3 m-2 h-14">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
          <Menu />
        </Button>
        <img
          src="/images/logo.png"
          alt="StashIt Logo"
          className={`transition-all ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'} h-10`}
          style={{ maxWidth: collapsed ? 0 : 120 }}
        />
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
    </div>
  );
} 