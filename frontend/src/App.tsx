/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** App.tsx
*/

import { useMemo, useState } from 'react';
import { createBackend } from './backend';
import type { Workshop } from '@backend/graph/workshop';

function App() {
  const backend = useMemo(() => createBackend(), []);
  const [workshops] = useState<Workshop[]>(() => backend.workshopRepository.getAll());

  return (
    <main className="page">
      <h1>EpiSimulated — Ateliers</h1>
      <p className="subtitle">
        Connecté directement au backend (<code>WorkshopRepository</code>,{' '}
        <code>DependencyGraph</code>, <code>NotificationPipeline</code>) — aucune API intermédiaire.
      </p>

      {workshops.length === 0 ? (
        <p>Aucun atelier pour le moment.</p>
      ) : (
        <ul className="workshop-list">
          {workshops.map((workshop) => (
            <li key={workshop.id} className="workshop-item">
              <strong>{workshop.name}</strong>
              <span className="workshop-meta">
                {workshop.participantIds.length} participant(s) inscrit(s)
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default App;