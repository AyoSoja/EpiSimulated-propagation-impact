# Notification — Niveaux d'urgence

## Objectif

Chaque changement appliqué à un atelier doit être classé par niveau d'urgence,
afin que la file de notification (`NotificationQueue`) puisse traiter les
changements critiques en premier.

## Niveaux (`UrgencyLevel`)

| Niveau | Valeur numérique | Signification |
|---|---|---|
| `CRITICAL` | 0 (traité en premier) | Action immédiate requise |
| `HIGH` | 1 | Impact concret sur la présence du participant |
| `MEDIUM` | 2 | Impact mineur, à connaître mais pas bloquant |
| `LOW` | 3 (traité en dernier) | Information, aucune action requise |

La valeur numérique **est** l'ordre de priorité utilisé par la file : plus elle
est basse, plus la notification sort tôt.

## Mapping `ChangeType -> UrgencyLevel`

| Type de changement | Urgence | Justification |
|---|---|---|
| `CANCELLATION` (annulation) | `CRITICAL` | L'atelier n'a plus lieu : le participant doit le savoir avant son créneau pour ne pas se déplacer pour rien. |
| `ROOM_CHANGE` (changement de salle) | `HIGH` | Le participant risque de se présenter au mauvais endroit. |
| `SCHEDULE_CHANGE_MAJOR` (décalage important, > 30 min ou changement de jour) | `HIGH` | Risque réel de conflit d'agenda ou d'absence si l'info arrive trop tard. |
| `SCHEDULE_CHANGE_MINOR` (décalage ≤ 30 min) | `MEDIUM` | Gênant mais rarement bloquant. |
| `GENERAL_INFO` (info générale, ex: rappel, consigne) | `LOW` | Aucun impact sur la tenue de l'atelier. |

Ce mapping est défini dans `src/notification/urgency-level.ts`
(`CHANGE_TYPE_URGENCY_MAP`), et accessible via `getUrgencyForChangeType(changeType)`.

## Pourquoi un enum numérique plutôt que des chaînes

Utiliser des valeurs numériques (`CRITICAL = 0`, ..., `LOW = 3`) permet de
comparer directement deux urgences avec les opérateurs `<` / `>` dans la
priority queue, sans passer par une table de correspondance supplémentaire.
L'ordre croissant des valeurs correspond à l'ordre croissant du délai
acceptable avant notification.

## Faire évoluer le mapping

Si un nouveau `ChangeType` est ajouté, TypeScript refusera de compiler tant que
`CHANGE_TYPE_URGENCY_MAP` n'a pas été mis à jour avec ce nouveau cas — grâce au
typage `Record<ChangeType, UrgencyLevel>`, qui impose une entrée pour chaque
valeur de l'enum.