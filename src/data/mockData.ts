import { Client, Custom } from '../types';

export const mockClients: Client[] = [
  {
    id: '1',
    username: 'sarah_star',
    displayName: 'Sarah Star',
    customCount: 12,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    username: 'luna_love',
    displayName: 'Luna Love',
    customCount: 8,
    createdAt: '2024-01-20'
  },
  {
    id: '3',
    username: 'amber_rose',
    displayName: 'Amber Rose',
    customCount: 15,
    createdAt: '2024-01-10'
  }
];

export const mockCustoms: Custom[] = [
  {
    id: '1',
    clientId: '1',
    clientUsername: 'sarah_star',
    clientDisplayName: 'Sarah Star',
    fanName: 'John D.',
    description: 'Custom video wearing red dress, 10 minutes',
    dateSubmitted: '2024-01-25',
    proposedAmount: 150,
    amountPaid: 150,
    length: '10 min',
    status: 'completed',
    notes: 'High priority request',
    chatLink: '/chat/custom1'
  },
  {
    id: '2',
    clientId: '1',
    clientUsername: 'sarah_star',
    clientDisplayName: 'Sarah Star',
    fanName: 'Mike R.',
    description: 'Photo set in lingerie, 20 photos',
    dateSubmitted: '2024-01-26',
    proposedAmount: 80,
    length: '20 photos',
    status: 'in-progress',
    chatLink: '/chat/custom2'
  },
  {
    id: '3',
    clientId: '2',
    clientUsername: 'luna_love',
    clientDisplayName: 'Luna Love',
    fanName: 'David L.',
    description: 'Voice message custom audio, 5 minutes',
    dateSubmitted: '2024-01-27',
    proposedAmount: 50,
    length: '5 min',
    status: 'pending',
    notes: 'Rush request'
  },
  {
    id: '4',
    clientId: '3',
    clientUsername: 'amber_rose',
    clientDisplayName: 'Amber Rose',
    fanName: 'Alex M.',
    description: 'Custom workout video in yoga outfit',
    dateSubmitted: '2024-01-28',
    proposedAmount: 120,
    length: '15 min',
    status: 'pending'
  }
];