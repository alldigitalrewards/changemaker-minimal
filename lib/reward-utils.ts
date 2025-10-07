/**
 * Reward utility functions for displaying reward information based on type
 */

export type RewardType = 'points' | 'sku' | 'monetary';

/**
 * Get the appropriate label for a reward type
 */
export function getRewardLabel(rewardType: RewardType | null | undefined): string {
  if (!rewardType) return 'Points';

  switch (rewardType) {
    case 'points':
      return 'Points Earned';
    case 'sku':
      return 'Rewards Issued';
    case 'monetary':
      return 'Rewards Earned';
    default:
      return 'Points';
  }
}

/**
 * Get a short label for badges and compact displays
 */
export function getRewardLabelShort(rewardType: RewardType | null | undefined): string {
  if (!rewardType) return 'Points';

  switch (rewardType) {
    case 'points':
      return 'Points';
    case 'sku':
      return 'Rewards';
    case 'monetary':
      return 'Earnings';
    default:
      return 'Points';
  }
}

/**
 * Format the reward value based on type
 */
export function formatRewardValue(
  rewardType: RewardType | null | undefined,
  value: number
): string {
  if (!rewardType || rewardType === 'points') {
    return value.toString();
  }

  switch (rewardType) {
    case 'monetary':
      return `$${value.toFixed(2)}`;
    case 'sku':
      return value.toString();
    default:
      return value.toString();
  }
}

/**
 * Get the unit label for a reward type (e.g., "points", "items", "$")
 */
export function getRewardUnit(rewardType: RewardType | null | undefined): string {
  if (!rewardType) return 'pts';

  switch (rewardType) {
    case 'points':
      return 'pts';
    case 'sku':
      return 'items';
    case 'monetary':
      return '';
    default:
      return 'pts';
  }
}

/**
 * Get descriptive text for the reward type
 */
export function getRewardDescription(rewardType: RewardType | null | undefined): string {
  if (!rewardType) return 'Earn points by completing activities';

  switch (rewardType) {
    case 'points':
      return 'Earn points by completing activities';
    case 'sku':
      return 'Earn reward items by completing activities';
    case 'monetary':
      return 'Earn monetary rewards by completing activities';
    default:
      return 'Earn points by completing activities';
  }
}
