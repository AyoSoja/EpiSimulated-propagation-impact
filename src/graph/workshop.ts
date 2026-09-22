/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** workshop.ts
*/

export interface Workshop {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    participantIds: string[];
    createdAt: Date;
    updatedAt: Date;
  }

  export type CreateWorkshopInput = {
    name: string;
    startTime: Date;
    endTime: Date;
  };

  export type UpdateWorkshopInput = Partial<CreateWorkshopInput>;