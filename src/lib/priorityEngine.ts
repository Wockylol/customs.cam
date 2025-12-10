// Priority Engine - Calculates urgency scores and sorts work items

import { PriorityFeedItem, UrgencyLevel, PriorityEngineConfig } from '../types/priorityFeed';
import { Database } from './database.types';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

const DEFAULT_CONFIG: PriorityEngineConfig = {
  baseScores: {
    urgentApproval: 1000,  // 24+ hours old
    highApproval: 800,     // < 24 hours
    readyUpload: 600,      // Approved, needs content
    newScene: 400,         // New scene assignment
    oldScene: 200,         // Older scene assignment
  },
  multipliers: {
    hourlyWaitingBonus: 5,
    maxWaitingBonus: 200,
    vipBonus: 100,
    vipThreshold: 500,
    amountBonus: 10,      // Per $50
    maxAmountBonus: 100,
  },
  urgencyThresholds: {
    urgent: 900,   // Red alert
    high: 700,     // Orange alert
    medium: 400,   // Blue/Normal
    // low: < 400   // Purple/Low priority
  },
};

export class PriorityEngine {
  private config: PriorityEngineConfig;

  constructor(config?: Partial<PriorityEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate time waiting in milliseconds
   */
  private getWaitingTime(dateString: string): number {
    try {
      const date = new Date(dateString);
      const now = new Date();
      return now.getTime() - date.getTime();
    } catch {
      return 0;
    }
  }

  /**
   * Format waiting time to human-readable string
   */
  private formatWaitingTime(ms: number): string {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (minutes < 5) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  /**
   * Calculate priority score for a custom request
   */
  private calculateCustomPriority(custom: CustomRequest): number {
    const waitingMs = this.getWaitingTime(custom.date_submitted);
    const waitingHours = waitingMs / (1000 * 60 * 60);
    
    let score = 0;

    // Base score
    if (custom.status === 'pending_client_approval') {
      score = waitingHours >= 24 
        ? this.config.baseScores.urgentApproval 
        : this.config.baseScores.highApproval;
    } else if (custom.status === 'in_progress') {
      score = this.config.baseScores.readyUpload;
    }

    // Time multiplier
    const timeBonus = Math.min(
      waitingHours * this.config.multipliers.hourlyWaitingBonus,
      this.config.multipliers.maxWaitingBonus
    );
    score += timeBonus;

    // VIP multiplier
    const fanSpend = (custom as any).fan_lifetime_spend || 0;
    if (fanSpend >= this.config.multipliers.vipThreshold) {
      score += this.config.multipliers.vipBonus;
    }

    // Amount multiplier
    const amount = custom.proposed_amount || 0;
    const amountBonus = Math.min(
      Math.floor(amount / 50) * this.config.multipliers.amountBonus,
      this.config.multipliers.maxAmountBonus
    );
    score += amountBonus;

    return score;
  }

  /**
   * Calculate priority score for a scene assignment
   */
  private calculateScenePriority(assignment: any): number {
    const waitingMs = this.getWaitingTime(assignment.assigned_at);
    const waitingDays = waitingMs / (1000 * 60 * 60 * 24);
    
    let score = waitingDays > 3 
      ? this.config.baseScores.oldScene 
      : this.config.baseScores.newScene;

    return score;
  }

  /**
   * Determine urgency level based on score
   */
  private getUrgencyLevel(score: number): UrgencyLevel {
    if (score >= this.config.urgencyThresholds.urgent) return 'urgent';
    if (score >= this.config.urgencyThresholds.high) return 'high';
    if (score >= this.config.urgencyThresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Get urgency badge emoji
   */
  private getUrgencyBadge(level: UrgencyLevel): string {
    switch (level) {
      case 'urgent': return '🔥 URGENT';
      case 'high': return '⚡ ACTION NEEDED';
      case 'medium': return '📋 READY';
      case 'low': return '✨ NEW';
      default: return '';
    }
  }

  /**
   * Convert custom request to priority feed item
   */
  convertCustomToFeedItem(
    custom: CustomRequest, 
    onAction: () => void
  ): PriorityFeedItem {
    const priorityScore = this.calculateCustomPriority(custom);
    const urgencyLevel = this.getUrgencyLevel(priorityScore);
    const waitingMs = this.getWaitingTime(custom.date_submitted);
    const fanSpend = (custom as any).fan_lifetime_spend || 0;

    let title = '';
    let actionLabel = '';
    
    if (custom.status === 'pending_client_approval') {
      title = `${custom.fan_name} needs approval`;
      actionLabel = 'Approve Now';
    } else if (custom.status === 'in_progress') {
      title = `Upload content for ${custom.fan_name}`;
      actionLabel = 'Upload';
    }

    return {
      id: custom.id,
      type: 'custom_approval',
      priorityScore,
      urgencyLevel,
      title,
      subtitle: custom.description.substring(0, 60) + (custom.description.length > 60 ? '...' : ''),
      amount: custom.proposed_amount || 0,
      timeWaiting: this.formatWaitingTime(waitingMs),
      timeWaitingMs: waitingMs,
      actionLabel,
      onAction,
      data: custom,
      badge: this.getUrgencyBadge(urgencyLevel),
      isVIP: fanSpend >= this.config.multipliers.vipThreshold,
    };
  }

  /**
   * Convert scene assignment to priority feed item
   */
  convertSceneToFeedItem(
    assignment: any,
    scene: any,
    onAction: () => void
  ): PriorityFeedItem {
    const priorityScore = this.calculateScenePriority(assignment);
    const urgencyLevel = this.getUrgencyLevel(priorityScore);
    const waitingMs = this.getWaitingTime(assignment.assigned_at);

    return {
      id: assignment.id,
      type: 'scene',
      priorityScore,
      urgencyLevel,
      title: scene?.title || 'Untitled Scene',
      subtitle: scene?.location || 'New content assignment',
      timeWaiting: this.formatWaitingTime(waitingMs),
      timeWaitingMs: waitingMs,
      actionLabel: 'View Scene',
      onAction,
      data: { assignment, scene },
      badge: this.getUrgencyBadge(urgencyLevel),
    };
  }

  /**
   * Group similar items (e.g., multiple scenes)
   */
  groupItems(items: PriorityFeedItem[]): (PriorityFeedItem | { type: 'group'; items: PriorityFeedItem[] })[] {
    const scenes = items.filter(item => item.type === 'scene');
    const others = items.filter(item => item.type !== 'scene');

    // If 3+ scenes, group them
    if (scenes.length >= 3) {
      return [
        ...others,
        {
          type: 'group' as const,
          items: scenes,
        }
      ];
    }

    return items;
  }

  /**
   * Sort items by priority score (highest first)
   */
  sortByPriority(items: PriorityFeedItem[]): PriorityFeedItem[] {
    return [...items].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Main method: Process all items and return sorted priority feed
   */
  processFeed(
    customRequests: CustomRequest[],
    sceneAssignments: any[],
    handlers: {
      onCustomAction: (custom: CustomRequest) => void;
      onSceneAction: (assignment: any, scene: any) => void;
    }
  ): PriorityFeedItem[] {
    const feedItems: PriorityFeedItem[] = [];

    // Add pending approvals
    const pendingApprovals = customRequests.filter(
      c => c.status === 'pending_client_approval'
    );
    pendingApprovals.forEach(custom => {
      feedItems.push(
        this.convertCustomToFeedItem(custom, () => handlers.onCustomAction(custom))
      );
    });

    // Add ready for upload
    const readyForUpload = customRequests.filter(
      c => c.status === 'in_progress'
    );
    readyForUpload.forEach(custom => {
      feedItems.push(
        this.convertCustomToFeedItem(custom, () => handlers.onCustomAction(custom))
      );
    });

    // Add pending scenes
    const pendingScenes = sceneAssignments.filter(
      a => a.status === 'pending'
    );
    pendingScenes.forEach(assignment => {
      feedItems.push(
        this.convertSceneToFeedItem(
          assignment,
          assignment.content_scenes,
          () => handlers.onSceneAction(assignment, assignment.content_scenes)
        )
      );
    });

    // Sort by priority
    return this.sortByPriority(feedItems);
  }
}

// Export singleton instance
export const priorityEngine = new PriorityEngine();

