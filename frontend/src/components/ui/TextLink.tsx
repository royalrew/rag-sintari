import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

interface TextLinkProps {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'subtle' | 'accent';
  icon?: 'arrow' | 'chevron' | 'none';
  className?: string;
  external?: boolean;
}

export const TextLink = ({
  to,
  onClick,
  children,
  variant = 'primary',
  icon = 'arrow',
  className,
  external = false,
}: TextLinkProps) => {
  const baseStyles = 'inline-flex items-center gap-1.5 transition-all duration-200';
  
  const variantStyles = {
    primary: 'text-foreground hover:text-accent font-medium hover:underline underline-offset-4',
    subtle: 'text-muted-foreground hover:text-foreground hover:underline underline-offset-4',
    accent: 'text-accent hover:text-accent/80 font-medium hover:underline underline-offset-4',
  };

  const IconComponent = icon === 'arrow' ? ArrowRight : icon === 'chevron' ? ChevronRight : null;

  const content = (
    <>
      {children}
      {IconComponent && <IconComponent className="h-4 w-4" />}
    </>
  );

  const classes = cn(baseStyles, variantStyles[variant], className);

  if (external && to) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    );
  }

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {content}
    </button>
  );
};
