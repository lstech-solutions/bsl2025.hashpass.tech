/**
 * LUKAS Reward Service
 * Handles fetching and managing LUKAS token balances and transactions
 */

import { supabase } from './supabase';

export interface UserBalance {
  id: string;
  user_id: string;
  token_symbol: string;
  balance: number;
  updated_at: string;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  token_symbol: string;
  transaction_type: 'reward' | 'transfer' | 'swap' | 'redemption';
  amount: number;
  balance_before: number;
  balance_after: number;
  source: 'meeting_accepted' | 'event_attendance' | 'referral' | 'admin_grant' | 'other';
  reference_id?: string;
  reference_type?: string;
  description?: string;
  created_at: string;
}

class LukasRewardService {
  /**
   * Get user's LUKAS balance
   */
  async getUserBalance(userId: string, tokenSymbol: string = 'LUKAS'): Promise<number> {
    try {
      // Use RPC function to get or create balance
      const { data, error } = await supabase.rpc('get_user_balance', {
        p_user_id: userId,
        p_token_symbol: tokenSymbol,
      });

      if (error) {
        console.error('Error fetching user balance:', error);
        return 0;
      }

      return parseFloat(data || '0');
    } catch (error) {
      console.error('Error in getUserBalance:', error);
      return 0;
    }
  }

  /**
   * Get user's balance from user_balances table (direct query)
   */
  async getUserBalanceDirect(userId: string, tokenSymbol: string = 'LUKAS'): Promise<UserBalance | null> {
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('token_symbol', tokenSymbol)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No balance found, return null (will be created on first reward)
          return null;
        }
        console.error('Error fetching user balance:', error);
        return null;
      }

      return data as UserBalance;
    } catch (error) {
      console.error('Error in getUserBalanceDirect:', error);
      return null;
    }
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(
    userId: string,
    tokenSymbol: string | null = null,
    limit: number = 50,
    offset: number = 0
  ): Promise<RewardTransaction[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_transactions', {
        p_user_id: userId,
        p_token_symbol: tokenSymbol,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        console.error('Error fetching user transactions:', error);
        return [];
      }

      return (data || []) as RewardTransaction[];
    } catch (error) {
      console.error('Error in getUserTransactions:', error);
      return [];
    }
  }

  /**
   * Subscribe to balance changes for a user
   */
  subscribeToBalance(
    userId: string,
    tokenSymbol: string,
    callback: (balance: UserBalance | null) => void
  ) {
    const channel = supabase
      .channel(`user_balance_${userId}_${tokenSymbol}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          // Refetch balance when it changes
          const balance = await this.getUserBalanceDirect(userId, tokenSymbol);
          callback(balance);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const lukasRewardService = new LukasRewardService();

