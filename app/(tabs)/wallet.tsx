import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import DigitalTicketWallet from '../components/DigitalTicketWallet';
import LoyaltyDashboard from '../components/LoyaltyDashboard';
import ExchangeView from '../components/ExchangeView';

const WalletScreen = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'loyalty' | 'exchange'>('tickets');

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-6 pb-0">
        <Text className="text-4xl font-extrabold mb-2 text-gray-900">Your Digital Hub</Text>
        <Text className="text-lg text-gray-600 mb-8">All your passes, rewards, and tokens in one place.</Text>
      </View>

      {/* Tab Bar */}
      <View className="flex-row px-4 pt-2 pb-4 justify-between">
        {[
          { key: 'tickets', label: 'My Tickets' },
          { key: 'loyalty', label: 'Loyalty Rewards' },
          { key: 'exchange', label: 'Token Exchange' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: activeTab === tab.key ? '#2563eb' : 'transparent' }}
          >
            <Text className={`text-base font-semibold ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-500'}`}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View className="flex-1">
        {activeTab === 'tickets' && (
          <View className="mb-8">
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold text-gray-800">My Tickets</Text>
              <Text className="text-gray-600 mt-1">Access your event passes and earned rewards.</Text>
            </View>
            <DigitalTicketWallet />
          </View>
        )}
        {activeTab === 'loyalty' && (
          <View className="mb-8">
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold text-gray-800">Loyalty Rewards</Text>
              <Text className="text-gray-600 mt-1">Track your progress and unlock exclusive benefits.</Text>
            </View>
            <LoyaltyDashboard />
          </View>
        )}
        {activeTab === 'exchange' && (
          <View className="mb-8">
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold text-gray-800">Token Exchange</Text>
              <Text className="text-gray-600 mt-1">Manage your tokens and explore exchange options.</Text>
            </View>
            <ExchangeView />
          </View>
        )}
      </View>
    </View>
  );
};

export default WalletScreen;
