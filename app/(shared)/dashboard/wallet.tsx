import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import DigitalTicketWallet from '../../../components/DigitalTicketWallet';
import LoyaltyDashboard from '../../../components/LoyaltyDashboard';
import ExchangeView from '../../../components/ExchangeView';
import { useTranslation } from '../../../i18n/i18n';
import { useScroll } from '../../../contexts/ScrollContext';

const WalletScreen = () => {
  const { colors } = useTheme();
  const { headerHeight } = useScroll();
  const { t } = useTranslation('wallet');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default, paddingTop: headerHeight || 0 }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={{ padding: 24, paddingBottom: 16 }}>
          <Text style={{ fontSize: 32, fontWeight: '800', marginBottom: 8, color: colors.text.primary }}>
            {t("digitalWalletTitle")}
          </Text>
          <Text style={{ fontSize: 16, color: colors.text.secondary }}>
            {t("walletDesc")}
          </Text>
        </View>

        {/* Tickets Section */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>
              {t("tickets.title")}
            </Text>
            <Text style={{ marginTop: 4, color: colors.text.secondary }}>
              {t("tickets.description")}
            </Text>
          </View>
          <DigitalTicketWallet />
        </View>

        {/* Loyalty Section */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>
              {t("loyalty.title")}
            </Text>
            <Text style={{ marginTop: 4, color: colors.text.secondary }}>
              {t("loyalty.description")}
            </Text>
          </View>
          <LoyaltyDashboard />
        </View>

        {/* Exchange Section */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>
              {t("exchange.title")}
            </Text>
            <Text style={{ marginTop: 4, color: colors.text.secondary }}>
              {t("exchange.description")}
            </Text>
          </View>
          <ExchangeView />
        </View>
      </ScrollView>
    </View>
  );
};

export default WalletScreen;
