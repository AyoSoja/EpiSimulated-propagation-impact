/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** UrgencyBadge.tsx
*/

import { UrgencyLevel } from '@backend/notification/urgency-level';

// Record<UrgencyLevel, ...> : TypeScript refuse de compiler si un niveau est oublié.
const URGENCY_DISPLAY: Record<UrgencyLevel, { label: string; className: string }> = {
  [UrgencyLevel.CRITICAL]: { label: 'Critique', className: 'badge--critical' }, // rouge
  [UrgencyLevel.HIGH]: { label: 'Élevée', className: 'badge--high' }, // orange
  [UrgencyLevel.MEDIUM]: { label: 'Moyenne', className: 'badge--medium' }, // jaune
  [UrgencyLevel.LOW]: { label: 'Faible', className: 'badge--low' }, // gris
};

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
}

function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const { label, className } = URGENCY_DISPLAY[urgency];
  return <span className={`badge ${className}`}>{label}</span>;
}

export default UrgencyBadge;
