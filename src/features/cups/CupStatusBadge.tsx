import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';
import type { CupStatus } from '@/features/cups/cupTypes';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

const STATUS_VARIANT: Record<CupStatus, BadgeVariant> = {
  draft: 'secondary',
  open: 'default',
  full: 'destructive',
  scheduled: 'outline',
  finished: 'secondary',
};

export function CupStatusBadge({
  status,
  label,
}: {
  status: CupStatus;
  label: string;
}): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status]}>{label}</Badge>;
}
