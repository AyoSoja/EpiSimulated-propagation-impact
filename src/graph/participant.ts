/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** participant.ts
*/

export interface Participant {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export type CreateParticipantInput = {
    firstName: string;
    lastName: string;
    email: string;
  };

  export type UpdateParticipantInput = Partial<CreateParticipantInput>;