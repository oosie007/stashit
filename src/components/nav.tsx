import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BookmarkIcon, HighlighterIcon, ImageIcon, HeartIcon, PocketIcon } from 'lucide-react'

type CategoryType = 'all' | 'articles' | 'highlights' | 'loved' | 'images' | 'pocket'

export function Nav({ 
  activeCategory, 
  onCategoryChange 
}: { 
  activeCategory: CategoryType
  onCategoryChange: (category: CategoryType) => void 
}) {
  const categories: Array<{
    id: CategoryType
    label: string
    icon: React.ElementType
  }> = [
    { id: 'all', label: 'All Items', icon: BookmarkIcon },
    { id: 'articles', label: 'Articles', icon: BookmarkIcon },
    { id: 'highlights', label: 'Highlights', icon: HighlighterIcon },
    { id: 'images', label: 'Stashed Images', icon: ImageIcon },
    { id: 'pocket', label: 'Pocket Saves', icon: PocketIcon },
    { id: 'loved', label: 'Loved', icon: HeartIcon },
  ]

  return (
    <nav className="grid items-start gap-2">
      {categories.map((category) => {
        const Icon = category.icon
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              activeCategory === category.id ? "bg-accent" : "transparent"
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            <span>{category.label}</span>
          </button>
        )
      })}
    </nav>
  )
} 