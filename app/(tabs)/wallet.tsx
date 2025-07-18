import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import DigitalTicketWallet from '../components/DigitalTicketWallet';
import LoyaltyDashboard from '../components/LoyaltyDashboard';
import ExchangeView from '../components/ExchangeView';
import { useTranslation } from '../../i18n/i18n';

const WalletScreen = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'loyalty' | 'exchange'>('tickets');
  const { colors } = useTheme();
  const { t } = useTranslation('wallet');

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background.default }}>
      <View className="p-6 pb-0">
        <Text className="text-4xl font-extrabold mb-2" style={{ color: colors.text.primary }}>
          {t("digitalWalletTitle")}
        </Text>
        <Text className="text-lg mb-4" style={{ color: colors.text.secondary }}>
          {t("walletDesc")}
        </Text>
      </View>

      <View 
        className="flex-row px-4 pt-2 pb-4 justify-between"
        style={{ borderBottomWidth: 0 }}
      >
        {Object.entries(t("tabs")).map(([key, value]) => ({
          key,
          value
        })).map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as 'tickets' | 'loyalty' | 'exchange')}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent',
            }}
          >
            <Text 
              className="text-base font-semibold"
              style={{
                color: activeTab === tab.key ? colors.text.primary : colors.text.secondary,
                opacity: activeTab === tab.key ? 1 : 0.7
              }}
            >
              {tab.value}
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
              <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>
                {t("tickets.title")}
              </Text>
              <Text className="mt-1" style={{ color: colors.text.secondary }}>
                {t("tickets.description")}
              </Text>
            </View>
            <DigitalTicketWallet />
          </View>
        )}
        {activeTab === 'loyalty' && (
          <View className="mb-8">
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>
                {t("loyalty.title")}
              </Text>
              <Text className="mt-1" style={{ color: colors.text.secondary }}>
                {t("loyalty.description")}
              </Text>
            </View>
            <LoyaltyDashboard />
          </View>
        )}
        {activeTab === 'exchange' && (
          <View className="mb-8">
            <View className="px-6 mb-4">
              <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>
                {t("exchange.title")}
              </Text>
              <Text className="mt-1" style={{ color: colors.text.secondary }}>
                {t("exchange.description")}
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
