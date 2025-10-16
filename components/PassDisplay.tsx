import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { passSystemService, PassInfo, PassRequestLimits, PassType } from '@/lib/pass-system';

interface PassDisplayProps {
  onPassInfoLoaded?: (passInfo: PassInfo | null) => void;
  onRequestLimitsLoaded?: (limits: PassRequestLimits) => void;
  speakerId?: string;
  boostAmount?: number;
  showRequestButton?: boolean;
  onRequestPress?: () => void;
}

export default function PassDisplay({
  onPassInfoLoaded,
  onRequestLimitsLoaded,
  speakerId,
  boostAmount = 0,
  showRequestButton = false,
  onRequestPress
}: PassDisplayProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [passInfo, setPassInfo] = useState<PassInfo | null>(null);
  const [requestLimits, setRequestLimits] = useState<PassRequestLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassComparison, setShowPassComparison] = useState(false);

  // Debug log for state changes
  useEffect(() => {
    console.log('PassDisplay: showPassComparison state changed to:', showPassComparison);
  }, [showPassComparison]);

  useEffect(() => {
    loadPassInfo();
  }, [user]);

  useEffect(() => {
    if (speakerId && user) {
      loadRequestLimits();
    }
  }, [speakerId, user, boostAmount]);

  const loadPassInfo = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const info = await passSystemService.getUserPassInfo(user.id);
      setPassInfo(info);
      onPassInfoLoaded?.(info);
    } catch (error) {
      console.error('Error loading pass info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequestLimits = async () => {
    if (!user || !speakerId) return;

    try {
      const limits = await passSystemService.canMakeMeetingRequest(
        user.id,
        speakerId,
        boostAmount
      );
      setRequestLimits(limits);
      onRequestLimitsLoaded?.(limits);
    } catch (error) {
      console.error('Error loading request limits:', error);
    }
  };

  const createDefaultPass = async (passType: 'general' | 'business' | 'vip' = 'general') => {
    if (!user) return;

    try {
      const passId = await passSystemService.createDefaultPass(user.id, passType);
      if (passId) {
        Alert.alert(
          'Pass Created! 🎉',
          `Your ${passSystemService.getPassTypeDisplayName(passType)} has been created successfully.`,
          [{ text: 'OK', onPress: loadPassInfo }]
        );
      }
    } catch (error) {
      console.error('Error creating pass:', error);
      Alert.alert('Error', 'Failed to create pass. Please try again.');
    }
  };

  const getPassTypeColor = (passType: string) => {
    return passSystemService.getPassTypeColor(passType as any);
  };

  const getPassTypeDisplayName = (passType: string) => {
    return passSystemService.getPassTypeDisplayName(passType as any);
  };

  if (loading) {
    return (
      <View style={{ 
        padding: 20, 
        alignItems: 'center',
        backgroundColor: colors.background.paper,
        borderRadius: 12,
        margin: 16
      }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ color: colors.text.secondary, marginTop: 8 }}>
          Loading pass information...
        </Text>
      </View>
    );
  }

  if (!passInfo) {
    return (
      <View style={{ 
        padding: 20, 
        backgroundColor: colors.background.paper,
        borderRadius: 12,
        margin: 16,
        borderWidth: 1,
        borderColor: colors.divider
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <MaterialIcons name="confirmation-number" size={24} color={colors.text.secondary} />
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600', 
            color: colors.text.primary,
            marginLeft: 8
          }}>
            No Pass Found
          </Text>
        </View>
        
        <Text style={{ 
          color: colors.text.secondary, 
          marginBottom: 16,
          lineHeight: 20
        }}>
          You need a pass to request meetings with speakers. Without a pass, you cannot send meeting requests. Choose your pass type:
        </Text>

        <View style={{ gap: 12 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: colors.background.default,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.divider
            }}
            onPress={() => createDefaultPass('general')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#34A85320',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <MaterialIcons name="person" size={20} color="#34A853" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                General Pass
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                5 meeting requests • $100 VOI boost
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: colors.background.default,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.divider
            }}
            onPress={() => createDefaultPass('business')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#007AFF20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <MaterialIcons name="business" size={20} color="#007AFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                Business Pass
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                20 meeting requests • $500 VOI boost
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: colors.background.default,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.divider
            }}
            onPress={() => createDefaultPass('vip')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#FFD70020',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <MaterialIcons name="star" size={20} color="#FFD700" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                VIP Pass
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                50 meeting requests • $1000 VOI boost
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ 
      padding: 20, 
      backgroundColor: colors.background.paper,
      borderRadius: 12,
      margin: 16,
      borderWidth: 1,
      borderColor: colors.divider
    }}>
      {/* Pass Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: `${getPassTypeColor(passInfo.pass_type)}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          <MaterialIcons 
            name={passInfo.pass_type === 'vip' ? 'star' : passInfo.pass_type === 'business' ? 'business' : 'person'} 
            size={24} 
            color={getPassTypeColor(passInfo.pass_type)} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: '700', 
            color: colors.text.primary
          }}>
            {getPassTypeDisplayName(passInfo.pass_type)}
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: colors.text.secondary
          }}>
            Pass #{passInfo.pass_number}
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: `${getPassTypeColor(passInfo.pass_type)}20`,
          borderRadius: 16
        }}>
          <Text style={{ 
            fontSize: 12, 
            fontWeight: '600', 
            color: getPassTypeColor(passInfo.pass_type)
          }}>
            {passInfo.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Pass Stats */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>
            {passInfo.remaining_requests}
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.secondary, textAlign: 'center' }}>
            Requests Left
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>
            {passInfo.remaining_boost.toFixed(0)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.secondary, textAlign: 'center' }}>
            VOI Boost Left
          </Text>
        </View>
      </View>

      {/* Pass Comparison Toggle - Only show if user has a pass */}
      {passInfo && (
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: colors.background.default,
            borderRadius: 8,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.divider
          }}
          onPress={() => {
            console.log('Toggle pressed, current state:', showPassComparison);
            setShowPassComparison(!showPassComparison);
          }}
          activeOpacity={0.7}
        >
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '600', 
            color: colors.text.primary
          }}>
            All Pass Types & Pricing {showPassComparison ? '(Open)' : '(Closed)'}
          </Text>
          <MaterialIcons 
            name={showPassComparison ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color={colors.text.secondary} 
          />
        </TouchableOpacity>
      )}

      {/* Pass Comparison Content - Only show if user has a pass */}
      {passInfo && showPassComparison && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ 
            fontSize: 12, 
            color: colors.text.secondary,
            marginBottom: 12,
            textAlign: 'center'
          }}>
            Compare features and choose the right pass for your needs
          </Text>
          
          {/* Current Pass Info */}
          {passInfo && (
            <View style={{
              padding: 12,
              backgroundColor: `${getPassTypeColor(passInfo.pass_type)}20`,
              borderRadius: 8,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: getPassTypeColor(passInfo.pass_type)
            }}>
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                color: colors.text.primary,
                marginBottom: 4
              }}>
                Your Current Pass: {getPassTypeDisplayName(passInfo.pass_type)}
              </Text>
              <Text style={{ 
                fontSize: 12, 
                color: colors.text.secondary
              }}>
                {passInfo.remaining_requests} requests left • {passInfo.remaining_boost.toFixed(0)} VOI boost left
              </Text>
            </View>
          )}
          
          <View style={{ gap: 12 }}>
            {/* General Pass */}
            <View style={{
              padding: 16,
              backgroundColor: colors.background.default,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: passInfo?.pass_type === 'general' ? '#34A853' : colors.divider
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                  General Pass
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#34A853' }}>
                  $99
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 12 }}>
                Conferences only
              </Text>
              <View style={{ gap: 6 }}>
                {passSystemService.getPassPerks('general').features.map((feature, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 8 }}>
                      {feature}
                    </Text>
                  </View>
                ))}
                {passSystemService.getPassPerks('general').perks.map((perk, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 8 }}>
                      {perk}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Business Pass */}
            <View style={{
              padding: 16,
              backgroundColor: colors.background.default,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: passInfo?.pass_type === 'business' ? '#007AFF' : colors.divider
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                  Business Pass
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#007AFF' }}>
                  $249
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 12 }}>
                + Networking & B2B sessions
              </Text>
              <View style={{ gap: 6 }}>
                {passSystemService.getPassPerks('business').features.map((feature, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 8 }}>
                      {feature}
                    </Text>
                  </View>
                ))}
                {passSystemService.getPassPerks('business').perks.map((perk, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 8 }}>
                      {perk}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* VIP Pass */}
            <View style={{
              padding: 16,
              backgroundColor: colors.background.default,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: passInfo?.pass_type === 'vip' ? '#FFD700' : colors.divider
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                  VIP Pass
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFD700' }}>
                  Premium
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 12 }}>
                + VIP networking with speakers
              </Text>
              <View style={{ gap: 6 }}>
                {passSystemService.getPassPerks('vip').features.map((feature, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 8 }}>
                      {feature}
                    </Text>
                  </View>
                ))}
                {passSystemService.getPassPerks('vip').perks.map((perk, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 8 }}>
                      {perk}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Request Limits - Only show if user has a pass */}
      {passInfo && requestLimits && (
        <View style={{ 
          padding: 12,
          backgroundColor: requestLimits.can_request ? `${colors.primary}10` : `${colors.error}10`,
          borderRadius: 8,
          marginBottom: 16
        }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '600', 
            color: requestLimits.can_request ? colors.primary : colors.error,
            marginBottom: 4
          }}>
            {requestLimits.can_request ? '✅ Can Request Meeting' : '❌ Cannot Request Meeting'}
          </Text>
          <Text style={{ 
            fontSize: 12, 
            color: colors.text.secondary
          }}>
            {passSystemService.getPassValidationMessage(requestLimits)}
          </Text>
        </View>
      )}

      {/* Request Button - Only show if user has a pass */}
      {showRequestButton && onRequestPress && passInfo && (
        <TouchableOpacity
          style={{
            backgroundColor: requestLimits?.can_request ? colors.primary : colors.divider,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            opacity: requestLimits?.can_request ? 1 : 0.5
          }}
          onPress={requestLimits?.can_request ? onRequestPress : undefined}
          disabled={!requestLimits?.can_request}
        >
          <Text style={{ 
            color: requestLimits?.can_request ? 'white' : colors.text.secondary,
            fontSize: 16,
            fontWeight: '600'
          }}>
            Request Meeting
          </Text>
        </TouchableOpacity>
      )}

      {/* No Pass Message - Show when no pass and request button would be shown */}
      {showRequestButton && !passInfo && (
        <View style={{
          padding: 16,
          backgroundColor: `${colors.error}10`,
          borderRadius: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.error
        }}>
          <MaterialIcons name="block" size={24} color={colors.error} />
          <Text style={{ 
            color: colors.error,
            fontSize: 16,
            fontWeight: '600',
            marginTop: 8,
            textAlign: 'center'
          }}>
            Pass Required
          </Text>
          <Text style={{ 
            color: colors.text.secondary,
            fontSize: 14,
            marginTop: 4,
            textAlign: 'center'
          }}>
            You need a pass to request meetings with speakers
          </Text>
        </View>
      )}
    </View>
  );
}
