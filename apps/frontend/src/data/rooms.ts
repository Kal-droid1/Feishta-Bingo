import type { Room } from '../types';

export const ROOMS: Room[] = [
  {
    id: 'room-5',
    tier: 'low',
    name: 'Starter Table',
    description: 'Low stakes · Casual play',
    fee: 5,
    icon: '🎯',
    activePlayers: 0,
  },
  {
    id: 'room-10',
    tier: 'mid',
    name: 'Classic Arena',
    description: 'Mid stakes · Popular room',
    fee: 10,
    icon: '⚡',
    activePlayers: 0,
  },
  {
    id: 'room-50',
    tier: 'high',
    name: 'VIP Lounge',
    description: 'High stakes · Big rewards',
    fee: 50,
    icon: '👑',
    activePlayers: 0,
  },
];
