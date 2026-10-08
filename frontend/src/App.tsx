/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** App.tsx
*/

import { useMemo, useState } from 'react';
import { createBackend } from './backend';
import WorkshopList from './components/WorkshopList';
import ChangeForm from './components/ChangeForm';
import type { Workshop } from '@backend/graph/workshop';

function App() {
  // useMemo : le backend n'est construit qu'une seule fois par session de
  // l'app, pas à chaque re-render. Partagé entre tous les composants ci-dessous.
  const backend = useMemo(() => createBackend(), []);
  const [workshops] = useState<Workshop[]>(() => backend.workshopRepository.getAll());

  return (
    <main className="page">
      <h1>EpiSimulated — Ateliers</h1>
      <p className="subtitle">
        Connecté directement au backend (<code>WorkshopRepository</code>,{' '}
        <code>DependencyGraph</code>, <code>NotificationPipeline</code>) — aucune API intermédiaire.
      </p>

      <WorkshopList workshops={workshops} />

      <ChangeForm backend={backend} workshops={workshops} />
    </main>
  );
}

export default App;
