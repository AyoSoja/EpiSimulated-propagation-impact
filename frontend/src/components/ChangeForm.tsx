/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** ChangeForm.tsx
*/

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Backend } from '../backend';
import { ChangeType } from '@backend/notification/change-type';
import { CHANGE_TYPE_LABELS } from '@backend/notification/change-type-labels';
import type { Workshop } from '@backend/graph/workshop';

interface ChangeFormProps {
  backend: Backend;
  workshops: Workshop[];
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const CHANGE_TYPE_OPTIONS = Object.values(ChangeType);

function ChangeForm({ backend, workshops }: ChangeFormProps) {
  const [workshopId, setWorkshopId] = useState(workshops[0]?.id ?? '');
  const [changeType, setChangeType] = useState<ChangeType>(ChangeType.GENERAL_INFO);
  const [description, setDescription] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });

  if (workshops.length === 0) {
    return <p className="empty-state">Aucun atelier disponible : impossible de déclarer un changement.</p>;
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();

    if (!workshopId) {
      setSubmitState({ status: 'error', message: 'Sélectionnez un atelier avant de soumettre.' });
      return;
    }

    try {
      const now = new Date();

      // Appel direct au pipeline backend : AUCUNE logique métier ici,
      // juste la construction du Change à partir du formulaire.
      backend.pipeline.recordChange(
        {
          id: crypto.randomUUID(),
          workshopId,
          type: changeType,
          occurredAt: now,
          description: description.trim() || undefined,
        },
        now,
      );

      const workshopName = workshops.find((w) => w.id === workshopId)?.name ?? workshopId;
      setSubmitState({
        status: 'success',
        message: `Changement "${CHANGE_TYPE_LABELS[changeType]}" enregistré pour "${workshopName}".`,
      });
      setDescription('');
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Une erreur est survenue.',
      });
    }
  }

  return (
    <form className="change-form" onSubmit={handleSubmit}>
      <h2>Déclarer un changement</h2>

      <label className="field">
        <span>Atelier</span>
        <select value={workshopId} onChange={(e) => setWorkshopId(e.target.value)}>
          {workshops.map((workshop) => (
            <option key={workshop.id} value={workshop.id}>
              {workshop.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Type de changement</span>
        <select value={changeType} onChange={(e) => setChangeType(e.target.value as ChangeType)}>
          {CHANGE_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {CHANGE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Description (optionnelle)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : Salle B204 au lieu de B201"
          rows={2}
        />
      </label>

      <button type="submit">Déclarer le changement</button>

      {submitState.status === 'success' && (
        <p className="feedback feedback--success" role="status">
          ✓ {submitState.message}
        </p>
      )}
      {submitState.status === 'error' && (
        <p className="feedback feedback--error" role="alert">
          ✗ {submitState.message}
        </p>
      )}
    </form>
  );
}

export default ChangeForm;
