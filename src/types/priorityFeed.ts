// Priority Feed System Types

export type UrgencyLevel = 'urgent' | 'high' | 'medium' | 'low';

export type FeedItemType = 
  | 'custom_approval' 
  | 'custom_upload' 
  | 'scene' 
  | 'scene_group';

export interface PriorityFeedItem {
  id: string;
  type: FeedItemType;
  priorityScore: number;
  urgencyLevel: UrgencyLevel;
  title: string;
  subtitle: string;
  amount?: number;
  timeWaiting?: string;
  timeWaitingMs?: number;
  actionLabel: string;
  onAction: () => void;
  data: any; // Original data object (custom request, scene assignment, etc.)
  badge?: string;
  isVIP?: boolean;
  count?: number; // For grouped items
}

export interface PriorityFeedGroup {
  type: 'group';
  items: PriorityFeedItem[];
  title: string;
  count: number;
  onExpand: () => void;
}

export interface PriorityEngineConfig {
  baseScores: {
    urgentApproval: number;
    highApproval: number;
    readyUpload: number;
    newScene: number;
    oldScene: number;
  };
  multipliers: {
    hourlyWaitingBonus: number;
    maxWaitingBonus: number;
    vipBonus: number;
    vipThreshold: number;
    amountBonus: number;
    maxAmountBonus: number;
  };
  urgencyThresholds: {
    urgent: number;
    high: number;
    medium: number;
  };
}

