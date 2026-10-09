/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** App.tsx
*/

import { useCallback, useMemo, useState } from 'react';
import { createBackend } from './backend';
import WorkshopList from './components/WorkshopList';
import ChangeForm from './components/ChangeForm';
import ImpactDashboard from './components/ImpactDashboard';
import type { Workshop } from '@backend/graph/workshop';

function App() {
  // useMemo : le backend n'est construit qu'une seule fois par session de
  // l'app. Il est partagé entre TOUS les composants ci-dessous : le formulaire
  // y écrit, le dashboard le lit.
  const backend = useMemo(() => createBackend(), []);
  const [workshops] = useState<Workshop[]>(() => backend.workshopRepository.getAll());

  // Le backend est un objet mutable hors de React : ce compteur sert uniquement
  // à forcer un re-rendu quand son état a changé.
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((tick) => tick + 1), []);

  return (
    <main className="page">
      <h1>EpiSimulated — Ateliers</h1>
      <p className="subtitle">
        Connecté directement au backend (<code>WorkshopRepository</code>,{' '}
        <code>DependencyGraph</code>, <code>NotificationPipeline</code>) — aucune API intermédiaire.
      </p>

      <WorkshopList workshops={workshops} />

      <ChangeForm backend={backend} workshops={workshops} onChangeRecorded={refresh} />

      <ImpactDashboard backend={backend} onStateChange={refresh} />
    </main>
  );
}

export default App;
