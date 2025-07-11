import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import DigitalTicketWallet from '../components/DigitalTicketWallet';
import LoyaltyDashboard from '../components/LoyaltyDashboard';
import ExchangeView from '../components/ExchangeView';

const WalletScreen = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'loyalty' | 'exchange'>('tickets');
  const { colors } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="p-6 pb-0">
        <Text className="text-4xl font-extrabold mb-2" style={{ color: colors.text }}>
          Your Digital Hub
        </Text>
        <Text className="text-lg mb-4" style={{ color: colors.textSecondary }}>
          All your passes, rewards, and tokens in one place.
        </Text>
      </View>

      <View 
        className="flex-row px-4 pt-2 pb-4 justify-between"
        style={{ borderBottomWidth: 0 }}
      >
        {[
          { key: 'tickets', label: 'My Tickets' },
          { key: 'loyalty', label: 'Loyalty Rewards' },
          { key: 'exchange', label: 'Token Exchange' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent'
            }}
          >
            <Text 
              className="text-base font-semibold"
              style={{
                color: activeTab === tab.key ? colors.primary : colors.textSecondary,
                opacity: activeTab === tab.key ? 1 : 0.7
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={true}
      >
        {activeTab === 'tickets' && (
          <View className="mb-8" >
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                My Tickets
              </Text>
              <Text className="mt-1" style={{ color: colors.textSecondary }}>
                Access your event passes and earned rewards.
              </Text>
            </View>
            <DigitalTicketWallet />
          </View>
        )}
        {activeTab === 'loyalty' && (
          <View className="mb-8">
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                Loyalty Rewards
              </Text>
              <Text className="mt-1" style={{ color: colors.textSecondary }}>
                Track your progress and unlock exclusive benefits.
              </Text>
            </View>
            <LoyaltyDashboard />
          </View>
        )}
        {activeTab === 'exchange' && (
          <View className="mb-8">
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                Token Exchange
              </Text>
              <Text className="mt-1" style={{ color: colors.textSecondary }}>
                Manage your tokens and explore exchange options.
              </Text>
            </View>
            <ExchangeView />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default WalletScreen;
