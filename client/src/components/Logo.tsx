import { Link } from 'react-router-dom'
import logoFullSvg from '../assets/logo.svg'
import logoIconSvg from '../assets/icon.svg'

interface LogoProps {
  variant?: 'full' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  linkTo?: string
}

const sizes = {
  sm: { full: 'h-10', icon: 'h-10 w-10' },
  md: { full: 'h-12', icon: 'h-12 w-12' },
  lg: { full: 'h-16', icon: 'h-16 w-16' },
}

export function Logo({
  variant = 'full',
  size = 'md',
  className = '',
  linkTo = '/'
}: LogoProps) {
  const sizeClass = sizes[size][variant]

  const logoContent = (
    <>
      {variant === 'full' ? (
        <img
          src={logoFullSvg}
          alt="Portfolio Tracker"
          className={`${sizeClass} ${className}`}
        />
      ) : (
        <img
          src={logoIconSvg}
          alt="PT"
          className={`${sizeClass} ${className}`}
        />
      )}
    </>
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex items-center">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}
