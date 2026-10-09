/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** ImpactDashboard.tsx
*/

import { useState } from 'react';
import { DEBOUNCE_WINDOW_MS, RATE_LIMIT } from '../backend';
import type { Backend } from '../backend';
import type { MergedNotification } from '@backend/batching/notification-merger';
import UrgencyBadge from './UrgencyBadge';

type DeliveryStatus = 'pending' | 'rate-limited' | 'sent';

interface DashboardRow {
  notification: MergedNotification;
  status: DeliveryStatus;
  sentAt?: Date;
}

const STATUS_DISPLAY: Record<DeliveryStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'status--pending' },
  'rate-limited': { label: 'Limitée par le débit', className: 'status--rate-limited' },
  sent: { label: 'Envoyée', className: 'status--sent' },
};

interface ImpactDashboardProps {
  backend: Backend;
  // Appelé après chaque action qui modifie l'état du pipeline, pour que
  // le parent re-rende tous les composants qui lisent le backend.
  onStateChange: () => void;
}

function participantName(backend: Backend, participantId: string): string {
  try {
    const participant = backend.participantRepository.getById(participantId);
    return `${participant.firstName} ${participant.lastName}`;
  } catch {
    return participantId;
  }
}

function ImpactDashboard({ backend, onStateChange }: ImpactDashboardProps) {
  // Ids des notifications qui sont restées en file APRÈS une tentative d'envoi :
  // c'est ce qui les distingue de celles simplement "en attente".
  const [rateLimitedIds, setRateLimitedIds] = useState<ReadonlySet<string>>(new Set());
  const [info, setInfo] = useState<string | null>(null);

  const { pipeline, provider } = backend;
  const pending = pipeline.getPendingNotifications() as MergedNotification[];
  const sentLogs = provider.getLogs();

  const rows: DashboardRow[] = [
    ...pending.map((notification) => ({
      notification,
      status: (rateLimitedIds.has(notification.id) ? 'rate-limited' : 'pending') as DeliveryStatus,
    })),
    ...[...sentLogs].reverse().map((log) => ({
      notification: log.notification as MergedNotification,
      status: 'sent' as DeliveryStatus,
      sentAt: log.sentAt,
    })),
  ];

  // force = true : simule l'écoulement de la fenêtre de regroupement (pratique en démo,
  // sans attendre DEBOUNCE_WINDOW_MS). Sinon, utilise l'heure réelle.
  function handleProcess(force: boolean): void {
    const now = force ? new Date(Date.now() + DEBOUNCE_WINDOW_MS + 1) : new Date();
    const changesBefore = pipeline.pendingChangeCount;
    const queuedBefore = pipeline.pendingQueueSize;

    pipeline.processReadyBatches(now);

    const added = pipeline.pendingQueueSize - queuedBefore;
    if (added > 0) {
      setInfo(`${added} notification(s) prête(s) à l'envoi.`);
    } else if (pipeline.pendingChangeCount > 0) {
      setInfo(
        `Fenêtre de regroupement encore ouverte (${DEBOUNCE_WINDOW_MS / 1000} s sans nouveau changement requises).`,
      );
    } else if (changesBefore > 0) {
      setInfo('Lot traité : aucun participant à notifier (changements sans impact ou qui s\'annulent).');
    } else {
      setInfo('Aucun changement à traiter.');
    }
    onStateChange();
  }

  async function handleDispatch(): Promise<void> {
    if (pipeline.pendingQueueSize === 0) {
      setInfo('Aucune notification en attente.');
      return;
    }

    const sent = await pipeline.dispatchAvailable(new Date());
    const remaining = pipeline.getPendingNotifications();
    setRateLimitedIds(new Set(remaining.map((n) => n.id)));

    setInfo(
      remaining.length > 0
        ? `${sent} envoyée(s). ${remaining.length} bloquée(s) par la limite de débit (${RATE_LIMIT.maxRequests} / ${RATE_LIMIT.windowMs / 1000} s) : réessayez plus tard.`
        : `${sent} notification(s) envoyée(s).`,
    );
    onStateChange();
  }

  return (
    <section className="dashboard">
      <h2>Impact ciblé</h2>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{pipeline.pendingChangeCount}</span>
          <span className="stat-label">changement(s) dans la fenêtre de regroupement</span>
        </div>
        <div className="stat">
          <span className="stat-value">{pending.length}</span>
          <span className="stat-label">notification(s) en file</span>
        </div>
        <div className="stat">
          <span className="stat-value">{sentLogs.length}</span>
          <span className="stat-label">envoyée(s)</span>
        </div>
      </div>

      <div className="actions">
        <button type="button" onClick={() => handleProcess(false)}>
          Traiter les changements
        </button>
        <button type="button" className="secondary" onClick={() => handleProcess(true)}>
          Forcer la clôture de la fenêtre (démo)
        </button>
        <button type="button" onClick={() => void handleDispatch()}>
          Envoyer les notifications
        </button>
      </div>

      {info && (
        <p className="info" role="status">
          {info}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="empty-state">
          Aucune notification. Déclarez un changement, puis cliquez sur « Traiter les changements ».
        </p>
      ) : (
        <table className="impact-table">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Urgence</th>
              <th>Ce qu&apos;il recevra</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ notification, status, sentAt }) => {
              const display = STATUS_DISPLAY[status];
              return (
                <tr key={notification.id}>
                  <td className="cell-name">{participantName(backend, notification.participantId)}</td>
                  <td>
                    <UrgencyBadge urgency={notification.urgency} />
                  </td>
                  <td className="cell-message">{notification.message}</td>
                  <td>
                    <span className={`status ${display.className}`}>{display.label}</span>
                    {sentAt && <span className="sent-at">{sentAt.toLocaleTimeString('fr-FR')}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default ImpactDashboard;
