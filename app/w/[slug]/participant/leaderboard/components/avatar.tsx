import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AvatarProps {
  name: string
  email?: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-2xl'
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function Avatar({ name, email, avatarUrl, size = 'md' }: AvatarProps) {
  const initials = getInitials(name)

  return (
    <UIAvatar className={sizeClasses[size]}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="bg-coral-100 text-coral-700 font-semibold">
        {initials}
      </AvatarFallback>
    </UIAvatar>
  )
}
