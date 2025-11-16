import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const SectionCard = ({ title, description, icon, children, className }: SectionCardProps) => {
  return (
    <Card className={cn(
      'transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(96,165,250,0.3)]',
      className
    )}>
      <CardHeader>
        {icon && <div className="mb-2 text-accent">{icon}</div>}
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
};
