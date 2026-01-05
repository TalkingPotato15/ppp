import { SupabaseClient } from '@supabase/supabase-js';
import type { QuotaResponse } from '@/types/stage-c';

export interface QuotaResult {
  success: boolean;
  remainingCount: number;
  usedCount: number;
  maxCount: number;
  error?: string;
}

/**
 * Get the current regeneration quota for a user-idea pair
 */
export async function getRegenerationQuota(
  supabase: SupabaseClient,
  userId: string,
  ideaId: string
): Promise<QuotaResponse> {
  const { data: quota, error } = await supabase
    .from('regeneration_quotas')
    .select('used_count, max_count')
    .eq('user_id', userId)
    .eq('idea_id', ideaId)
    .single();

  if (error || !quota) {
    // No quota record means user hasn't generated yet - all 3 regenerations available
    return {
      usedCount: 0,
      maxCount: 3,
      remainingCount: 3,
    };
  }

  return {
    usedCount: quota.used_count,
    maxCount: quota.max_count,
    remainingCount: quota.max_count - quota.used_count,
  };
}

/**
 * Initialize regeneration quota for a new user-idea pair
 * Called when first specification is generated
 */
export async function initializeQuota(
  supabase: SupabaseClient,
  userId: string,
  ideaId: string
): Promise<QuotaResult> {
  const { data, error } = await supabase
    .from('regeneration_quotas')
    .insert({
      user_id: userId,
      idea_id: ideaId,
      used_count: 0,
      max_count: 3,
      version: 1,
    })
    .select()
    .single();

  if (error) {
    // If already exists (race condition), just return current quota
    if (error.code === '23505') {
      // unique violation
      return await consumeRegenerationQuota(supabase, userId, ideaId);
    }
    return {
      success: false,
      remainingCount: 0,
      usedCount: 0,
      maxCount: 3,
      error: `Quota initialization failed: ${error.message}`,
    };
  }

  return {
    success: true,
    remainingCount: 3,
    usedCount: 0,
    maxCount: 3,
  };
}

/**
 * Consume one regeneration from the quota using optimistic locking
 * Returns success: false if quota is exhausted or concurrent modification detected
 */
export async function consumeRegenerationQuota(
  supabase: SupabaseClient,
  userId: string,
  ideaId: string
): Promise<QuotaResult> {
  // Get current quota with version for optimistic locking
  const { data: quota, error: fetchError } = await supabase
    .from('regeneration_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('idea_id', ideaId)
    .single();

  if (fetchError || !quota) {
    // First regeneration - initialize quota
    return await initializeQuota(supabase, userId, ideaId);
  }

  // Check if quota is exhausted
  if (quota.used_count >= quota.max_count) {
    return {
      success: false,
      remainingCount: 0,
      usedCount: quota.used_count,
      maxCount: quota.max_count,
      error: `All regenerations used (${quota.used_count}/${quota.max_count})`,
    };
  }

  // Optimistic update with version check
  const { data: updated, error: updateError } = await supabase
    .from('regeneration_quotas')
    .update({
      used_count: quota.used_count + 1,
      version: quota.version + 1,
    })
    .eq('id', quota.id)
    .eq('version', quota.version) // Optimistic locking condition
    .select()
    .single();

  if (updateError || !updated) {
    // Concurrent modification detected
    return {
      success: false,
      remainingCount: quota.max_count - quota.used_count,
      usedCount: quota.used_count,
      maxCount: quota.max_count,
      error: 'Concurrent request detected. Please try again.',
    };
  }

  return {
    success: true,
    remainingCount: quota.max_count - updated.used_count,
    usedCount: updated.used_count,
    maxCount: quota.max_count,
  };
}

/**
 * Consume quota with retry logic for optimistic locking conflicts
 */
export async function consumeQuotaWithRetry(
  supabase: SupabaseClient,
  userId: string,
  ideaId: string,
  maxRetries = 3
): Promise<QuotaResult> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await consumeRegenerationQuota(supabase, userId, ideaId);

    // Success or permanent failure (quota exhausted)
    if (result.success || !result.error?.includes('Concurrent request detected')) {
      return result;
    }

    lastError = result.error;
    // Exponential backoff before retry
    await new Promise((resolve) =>
      setTimeout(resolve, 100 * Math.pow(2, attempt))
    );
  }

  return {
    success: false,
    remainingCount: 0,
    usedCount: 0,
    maxCount: 3,
    error: lastError || 'Max retry attempts exceeded.',
  };
}

/**
 * Check if user can regenerate (has remaining quota)
 */
export async function canRegenerate(
  supabase: SupabaseClient,
  userId: string,
  ideaId: string
): Promise<boolean> {
  const quota = await getRegenerationQuota(supabase, userId, ideaId);
  return quota.remainingCount > 0;
}
