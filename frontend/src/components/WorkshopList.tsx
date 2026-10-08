/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** WorkshopList.tsx
*/

import type { Workshop } from '@backend/graph/workshop';

interface WorkshopListProps {
  workshops: Workshop[];
}

function WorkshopList({ workshops }: WorkshopListProps) {
  if (workshops.length === 0) {
    return <p>Aucun atelier pour le moment.</p>;
  }

  return (
    <ul className="workshop-list">
      {workshops.map((workshop) => (
        <li key={workshop.id} className="workshop-item">
          <strong>{workshop.name}</strong>
          <span className="workshop-meta">{workshop.participantIds.length} participant(s) inscrit(s)</span>
        </li>
      ))}
    </ul>
  );
}

export default WorkshopList;
