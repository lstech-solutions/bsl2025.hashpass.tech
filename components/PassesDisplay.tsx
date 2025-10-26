import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, ImageBackground } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { passSystemService, PassInfo, PassRequestLimits, PassType } from '@/lib/pass-system';

interface PassesDisplayProps {
  // Display mode
  mode?: 'dashboard' | 'speaker';
  
  // Speaker-specific props
  speakerId?: string;
  boostAmount?: number;
  showRequestButton?: boolean;
  onRequestPress?: () => void;
  
  // Callbacks
  onPassInfoLoaded?: (passInfo: PassInfo | null) => void;
  onRequestLimitsLoaded?: (limits: PassRequestLimits) => void;
  
  // Dashboard-specific props
  showTitle?: boolean;
  title?: string;
  showPassComparison?: boolean;
}

export default function PassesDisplay({
  mode = 'dashboard',
  speakerId,
  boostAmount = 0,
  showRequestButton = false,
  onRequestPress,
  onPassInfoLoaded,
  onRequestLimitsLoaded,
  showTitle = true,
  title,
  showPassComparison = false
}: PassesDisplayProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [passInfo, setPassInfo] = useState<PassInfo | null>(null);
  const [requestLimits, setRequestLimits] = useState<PassRequestLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showComparison, setShowComparison] = useState(showPassComparison);
  
  // Demo mode check
  const isDemoMode = process.env.NODE_ENV === 'development';

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
      setPassInfo(null);
      setInitialLoad(false);
      return;
    }

    setLoading(true);
    try {
      const info = await passSystemService.getUserPassInfo(user.id);
      setPassInfo(info);
      onPassInfoLoaded?.(info);
    } catch (error) {
      console.error('Error loading pass info:', error);
      setPassInfo(null);
    } finally {
      setLoading(false);
      // Add a small delay to prevent flash of "No Pass Found"
      setTimeout(() => {
        setInitialLoad(false);
      }, 300);
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

  // Dashboard mode - show passes in list format
  if (mode === 'dashboard') {
    if (loading || initialLoad) {
      return (
        <View style={{ 
          padding: 20, 
          alignItems: 'center',
          backgroundColor: colors.background.paper,
          borderRadius: 12,
          margin: 16,
          borderWidth: 1,
          borderColor: colors.divider
        }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ color: colors.text.secondary, marginTop: 8 }}>
            Loading your passes...
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
          {showTitle && (
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.text.primary,
              marginBottom: 16
            }}>
              {title || 'Your Event Passes'}
            </Text>
          )}
          
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <MaterialIcons name="confirmation-number" size={48} color={colors.text.secondary} />
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: colors.text.primary,
              marginTop: 12,
              marginBottom: 8
            }}>
              No passes found
            </Text>
            <Text style={{ 
              color: colors.text.secondary, 
              textAlign: 'center',
              marginBottom: 20
            }}>
              Contact support to get your event passes
            </Text>
          </View>
        </View>
      );
    }

    // Dashboard mode with pass - show as horizontal scrollable cards
    return (
      <View>
        {showTitle && (
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600', 
            color: colors.text.primary,
            marginBottom: 16
          }}>
            {title || 'Your Event Passes'}
          </Text>
        )}
        
        <View style={{ height: 300 }}>
          <FlatList
            data={[passInfo]}
            renderItem={({ item }) => (
              <View style={{ width: 280, marginRight: 16 }}>
                <PassCard pass={item} />
              </View>
            )}
            keyExtractor={item => item.pass_id}
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            scrollEnabled={true}
            contentContainerStyle={{ paddingRight: 16 }}
          />
        </View>
      </View>
    );
  }

  // Speaker mode - show detailed pass info with request functionality
  if (loading || initialLoad) {
    return (
      <View style={{ 
        padding: 20, 
        alignItems: 'center',
        backgroundColor: colors.background.paper,
        borderRadius: 12,
        margin: 16,
        borderWidth: 1,
        borderColor: colors.divider
      }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ color: colors.text.secondary, marginTop: 8 }}>
          Loading your pass information...
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
          {isDemoMode 
            ? "You need a pass to request meetings with speakers. Without a pass, you cannot send meeting requests. Choose your pass type:"
            : "You need a valid event pass to request meetings with speakers. Please purchase a pass to continue."
          }
        </Text>

        {isDemoMode ? (
          <>
            {/* Pass Comparison Toggle - Demo Mode Only */}
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
              onPress={() => setShowComparison(!showComparison)}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.text.primary
              }}>
                All Pass Types & Pricing {showComparison ? '(Open)' : '(Closed)'}
              </Text>
              <MaterialIcons
                name={showComparison ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={24}
                color={colors.text.secondary}
              />
            </TouchableOpacity>

            {/* Pass Comparison Content - Demo Mode Only */}
            {showComparison && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 12,
              color: colors.text.secondary,
              marginBottom: 12,
              textAlign: 'center'
            }}>
              Compare features and choose the right pass for your needs
            </Text>

            <View style={{ gap: 12 }}>
              {/* General Pass */}
              <TouchableOpacity
                style={{
                  padding: 16,
                  backgroundColor: colors.background.default,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.divider
                }}
                onPress={() => createDefaultPass('general')}
              >
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
              </TouchableOpacity>

              {/* Business Pass */}
              <TouchableOpacity
                style={{
                  padding: 16,
                  backgroundColor: colors.background.default,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.divider
                }}
                onPress={() => createDefaultPass('business')}
              >
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
              </TouchableOpacity>

              {/* VIP Pass */}
              <TouchableOpacity
                style={{
                  padding: 16,
                  backgroundColor: colors.background.default,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.divider
                }}
                onPress={() => createDefaultPass('vip')}
              >
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
              </TouchableOpacity>
            </View>
          </View>
        )}
          </>
        ) : (
          /* Production Mode - Show Payment Options */
          <View style={{ marginBottom: 16 }}>
            <View style={{
              padding: 16,
              backgroundColor: colors.background.default,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.divider,
              marginBottom: 12
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text.primary,
                marginBottom: 8
              }}>
                Purchase Event Pass
              </Text>
              <Text style={{
                fontSize: 14,
                color: colors.text.secondary,
                marginBottom: 12
              }}>
                Choose from our available pass types to access speaker meetings and networking opportunities.
              </Text>
              
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    backgroundColor: colors.background.paper,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: colors.divider
                  }}
                  onPress={() => {
                    // TODO: Implement real payment flow
                    Alert.alert('Payment Integration', 'Payment system will be implemented here');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#34A85320',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8
                    }}>
                      <MaterialIcons name="person" size={16} color="#34A853" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                      General Pass
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#34A853' }}>
                    $99
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    backgroundColor: colors.background.paper,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: colors.divider
                  }}
                  onPress={() => {
                    // TODO: Implement real payment flow
                    Alert.alert('Payment Integration', 'Payment system will be implemented here');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#007AFF20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8
                    }}>
                      <MaterialIcons name="business" size={16} color="#007AFF" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                      Business Pass
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#007AFF' }}>
                    $249
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    backgroundColor: colors.background.paper,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: colors.divider
                  }}
                  onPress={() => {
                    // TODO: Implement real payment flow
                    Alert.alert('Payment Integration', 'Payment system will be implemented here');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#FFD70020',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8
                    }}>
                      <MaterialIcons name="star" size={16} color="#FFD700" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                      VIP Pass
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFD700' }}>
                    Premium
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Request Button - Always show but disabled when no pass */}
        {showRequestButton && onRequestPress && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.divider,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              alignItems: 'center',
              opacity: 0.5,
              marginTop: 16
            }}
            disabled={true}
          >
            <Text style={{ 
              color: colors.text.secondary,
              fontSize: 16,
              fontWeight: '600'
            }}>
              Pass Required
            </Text>
          </TouchableOpacity>
        )}
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
            {passInfo.pass_type === 'general' ? '5' : passInfo.pass_type === 'business' ? '20' : '50'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.secondary, textAlign: 'center' }}>
            Meeting Requests
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>
            {passInfo.pass_type === 'general' ? '100' : passInfo.pass_type === 'business' ? '300' : '500'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.secondary, textAlign: 'center' }}>
            VOI Boost
          </Text>
        </View>
      </View>

      {/* Pass Comparison Toggle - Only show if user has a pass AND in demo mode */}
      {passInfo && isDemoMode && (
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
          onPress={() => setShowComparison(!showComparison)}
          activeOpacity={0.7}
        >
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '600', 
            color: colors.text.primary
          }}>
            All Pass Types & Pricing {showComparison ? '(Open)' : '(Closed)'}
          </Text>
          <MaterialIcons 
            name={showComparison ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color={colors.text.secondary} 
          />
        </TouchableOpacity>
      )}

      {/* Pass Comparison Content - Only show if user has a pass AND in demo mode */}
      {passInfo && showComparison && isDemoMode && (
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
                {passInfo.pass_type === 'general' ? '5' : passInfo.pass_type === 'business' ? '20' : '50'} meeting requests • {passInfo.pass_type === 'general' ? '100' : passInfo.pass_type === 'business' ? '300' : '500'} VOI boost
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
          backgroundColor: requestLimits.canSendRequest ? `${colors.primary}10` : `${colors.error}10`,
          borderRadius: 8,
          marginBottom: 16
        }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '600', 
            color: requestLimits.canSendRequest ? colors.primary : colors.error.main,
            marginBottom: 4
          }}>
            {requestLimits.canSendRequest ? '✅ Can Request Meeting' : '❌ Cannot Request Meeting'}
          </Text>
          <Text style={{ 
            fontSize: 12, 
            color: colors.text.secondary
          }}>
            {passSystemService.getPassValidationMessage(requestLimits)}
          </Text>
        </View>
      )}

      {/* Request Button - Always show but disabled when no pass or limit reached */}
      {showRequestButton && onRequestPress && (
        <TouchableOpacity
          style={{
            backgroundColor: (passInfo && requestLimits?.canSendRequest) ? colors.primary : colors.divider,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            opacity: (passInfo && requestLimits?.canSendRequest) ? 1 : 0.5
          }}
          onPress={(passInfo && requestLimits?.canSendRequest) ? onRequestPress : undefined}
          disabled={!passInfo || !requestLimits?.canSendRequest}
        >
          <Text style={{ 
            color: (passInfo && requestLimits?.canSendRequest) ? 'white' : colors.text.secondary,
            fontSize: 16,
            fontWeight: '600'
          }}>
            {!passInfo ? 'Pass Required' : 
             !requestLimits?.canSendRequest ? 'Limit Reached' :
             'Request Meeting'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// PassCard component for dashboard mode - enhanced ticket-style design
const PassCard = ({ pass }: { pass: PassInfo }) => {
  const { colors } = useTheme();
  
  const getPassTypeColor = (type: string) => {
    switch (type) {
      case 'business': return '#007AFF';
      case 'vip': return '#FF9500';
      case 'general': return '#34A853';
      default: return '#8E8E93';
    }
  };

  const getPassTypeLabel = (type: string) => {
    switch (type) {
      case 'business': return 'Business';
      case 'vip': return 'VIP';
      case 'general': return 'General';
      default: return 'Event';
    }
  };

  const getPassImage = (type: string) => {
    switch (type) {
      case 'business': return 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=200&fit=crop';
      case 'vip': return 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=200&fit=crop';
      case 'general': return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop';
      default: return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop';
    }
  };

  const getPassAccess = (type: string) => {
    switch (type) {
      case 'business': return 'B2B + Closing Party';
      case 'vip': return 'All VIP Benefits';
      case 'general': return 'General Access';
      default: return 'Event Access';
    }
  };

  return (
    <View style={{
      backgroundColor: colors.background.paper,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.divider,
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
      overflow: 'hidden',
      marginBottom: 24, // Increased bottom margin for better spacing
      marginHorizontal: 4
    }}>
      {/* Ticket Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider
      }}>
        <View style={{ flex: 1, marginRight: 8, minWidth: 0 }}>
          <Text 
            style={{ 
              fontSize: 12,
              fontWeight: '700',
              color: colors.text.primary,
              maxWidth: '100%',
              flexShrink: 1,
              lineHeight: 16,
              letterSpacing: -0.1,
              marginBottom: 1
            }}
            numberOfLines={1}
            ellipsizeMode="middle"
            minimumFontScale={0.8}
            adjustsFontSizeToFit
          >
            {getPassTypeLabel(pass.pass_type)} Pass
          </Text>
          <Text style={{ 
            fontSize: 9, 
            color: colors.text.secondary,
            opacity: 0.8
          }}>
            Nov 12-14, 2025
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: getPassTypeColor(pass.pass_type),
          borderRadius: 16,
          marginLeft: 8, // Add some spacing between title and badge
          flexShrink: 0 // Prevent badge from shrinking
        }}>
          <Text style={{ 
            fontSize: 12, 
            fontWeight: '700', 
            color: '#FFFFFF'
          }}>
            {pass.pass_type.toUpperCase()}
          </Text>
        </View>
      </View>
      
      {/* Ticket Image Container */}
      <ImageBackground
        source={{ uri: getPassImage(pass.pass_type) }}
        style={{
          height: 120,
          position: 'relative',
        }}
        imageStyle={{
          opacity: 0.3,
        }}
      >
        <View style={{
          height: 120,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: `${getPassTypeColor(pass.pass_type)}20`
        }} />
        <View style={{
          position: 'absolute',
          bottom: 12,
          left: 16,
          right: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end'
        }}>
          <View>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: colors.text.primary,
              marginBottom: 2
            }}>
              {getPassAccess(pass.pass_type)}
            </Text>
            <Text 
              style={{ 
                fontSize: 12, 
                color: colors.text.secondary,
                maxWidth: 120,
                fontFamily: 'monospace' // Use monospace for better character alignment
              }}
              numberOfLines={1}
              ellipsizeMode="head"
            >
              {pass.pass_number.length > 12 
                ? `#${pass.pass_number.slice(0, 6)}...${pass.pass_number.slice(-4)}` 
                : `#${pass.pass_number}}`}
            </Text>
          </View>
          <View style={{
            backgroundColor: colors.background.paper,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.divider
          }}>
            <Text style={{ 
              fontSize: 12, 
              fontWeight: '600', 
              color: getPassTypeColor(pass.pass_type)
            }}>
              {pass.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        {/* BSL2025 Logo Seal */}
        <View style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.background.paper,
          borderWidth: 2,
          borderColor: getPassTypeColor(pass.pass_type),
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Text style={{ 
            fontSize: 8, 
            fontWeight: '700', 
            color: getPassTypeColor(pass.pass_type)
          }}>
            BSL2025
          </Text>
        </View>
      </ImageBackground>
      
      {/* Ticket Stats */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-around',
        padding: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.divider
      }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
            {pass.pass_type === 'general' ? '5' : pass.pass_type === 'business' ? '20' : '50'}
          </Text>
          <Text style={{ fontSize: 10, color: colors.text.secondary, textAlign: 'center' }}>
            Meeting Requests
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
            {pass.pass_type === 'general' ? '100' : pass.pass_type === 'business' ? '300' : '500'}
          </Text>
          <Text style={{ fontSize: 10, color: colors.text.secondary, textAlign: 'center' }}>
            VOI Boost
          </Text>
        </View>
      </View>
      
      {/* Ticket Footer Actions */}
      <View style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.divider
      }}>
        <TouchableOpacity style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
          borderRightWidth: 1,
          borderRightColor: colors.divider
        }}>
          <MaterialIcons name="qr-code" size={16} color="#4A90E2" />
          <Text style={{ 
            fontSize: 12, 
            fontWeight: '600', 
            color: '#4A90E2',
            marginLeft: 4
          }}>
            QR Code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
          borderRightWidth: 1,
          borderRightColor: colors.divider
        }}>
          <MaterialIcons name="info" size={16} color="#4A90E2" />
          <Text style={{ 
            fontSize: 12, 
            fontWeight: '600', 
            color: '#4A90E2',
            marginLeft: 4
          }}>
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12
        }}>
          <MaterialIcons name="share" size={16} color="#4A90E2" />
          <Text style={{ 
            fontSize: 12, 
            fontWeight: '600', 
            color: '#4A90E2',
            marginLeft: 4
          }}>
            Share
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
