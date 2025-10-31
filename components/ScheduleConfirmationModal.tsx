import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { format } from 'date-fns';

interface ScheduleConfirmationModalProps {
  visible: boolean;
  title: string;
  location?: string;
  startTime: Date;
  isConfirmed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isFreeSlot?: boolean;
  freeSlotStatus?: 'available' | 'interested' | 'blocked' | 'tentative';
  isAgendaEvent?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onToggleBlocked?: () => void;
}

export default function ScheduleConfirmationModal({
  visible,
  title,
  location,
  startTime,
  isConfirmed,
  onConfirm,
  onCancel,
  isLoading = false,
  isFreeSlot = false,
  freeSlotStatus = 'available',
  isAgendaEvent = false,
  isFavorite = false,
  onToggleFavorite,
  onToggleBlocked,
}: ScheduleConfirmationModalProps) {
  const { colors, isDark } = useTheme();
  
  // Handle free slot display differently
  if (isFreeSlot) {
    const isInterested = freeSlotStatus === 'interested';
    const isBlocked = freeSlotStatus === 'blocked';
    
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: colors.background.paper,
              borderColor: colors.divider,
            }
          ]}>
            {/* Close X Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onCancel}
              disabled={isLoading}
            >
              <MaterialIcons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            
            <View style={styles.modalHeader}>
              <MaterialIcons
                name={isBlocked ? "block" : isInterested ? "favorite" : "schedule"}
                size={32}
                color={isBlocked ? colors.error.main : isInterested ? '#F44336' : colors.text.secondary}
              />
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {isBlocked ? "Unblock Slot" : isInterested ? "Remove Interest" : "Mark Free Slot"}
              </Text>
            </View>

            <View style={styles.eventDetails}>
              <Text style={[styles.eventTitle, { color: colors.text.primary }]}>
                Free Slot Available
              </Text>
              
              <View style={styles.eventInfoRow}>
                <MaterialIcons
                  name="schedule"
                  size={18}
                  color={colors.text.secondary}
                />
                <Text style={[styles.eventInfoText, { color: colors.text.secondary }]}>
                  {format(startTime, 'h:mm a')}
                </Text>
              </View>
            </View>

            <View style={[
              styles.messageBox,
              {
                backgroundColor: isBlocked 
                  ? `${colors.error.main}15` 
                  : isInterested 
                  ? `#F4433615` 
                  : `${colors.info || '#2196F3'}15`,
                borderColor: isBlocked 
                  ? colors.error.main 
                  : isInterested 
                  ? '#F44336' 
                  : (colors.info || '#2196F3'),
              }
            ]}>
              <MaterialIcons
                name={isBlocked ? "block" : isInterested ? "info" : "info"}
                size={20}
                color={isBlocked ? colors.error.main : isInterested ? '#F44336' : (colors.info || '#2196F3')}
              />
              <Text style={[
                styles.messageText,
                { color: isBlocked ? colors.error.main : isInterested ? '#F44336' : (colors.info || '#2196F3') }
              ]}>
                {isBlocked
                  ? "This slot is blocked. Unblock it to make it available again?"
                  : isInterested
                  ? "This slot is marked as interested. Remove it to make it available again?"
                  : "Mark this slot as interested or blocked to track your availability. This information will be visible to anyone who views your public schedule, helping them understand when you're blocked or interested in meeting people."}
              </Text>
            </View>

            {/* Action buttons for free slots */}
            <View style={styles.buttonContainer}>
              {!isBlocked && !isInterested && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      {
                        backgroundColor: colors.error.main,
                        flex: 1,
                      },
                      isLoading && styles.confirmButtonDisabled
                    ]}
                    onPress={() => onToggleBlocked && onToggleBlocked()}
                    disabled={isLoading}
                  >
                    <MaterialIcons name="block" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Block</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      {
                        backgroundColor: colors.success.main,
                        flex: 1,
                      },
                      isLoading && styles.confirmButtonDisabled
                    ]}
                    onPress={onConfirm}
                    disabled={isLoading}
                  >
                    <MaterialIcons name="favorite" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Interested</Text>
                  </TouchableOpacity>
                </>
              )}

              {(isBlocked || isInterested) && (
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    {
                      backgroundColor: isBlocked ? colors.error.main : '#F44336',
                    },
                    isLoading && styles.confirmButtonDisabled
                  ]}
                  onPress={onConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <MaterialIcons name="hourglass-empty" size={20} color="#FFFFFF" />
                      <Text style={styles.confirmButtonText}>
                        {isBlocked ? "Unblocking..." : "Removing..."}
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons
                        name={isBlocked ? "block" : "favorite-border"}
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.confirmButtonText}>
                        {isBlocked ? "Unblock" : "Remove"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          {
            backgroundColor: colors.background.paper,
            borderColor: colors.divider,
          }
        ]}>
          {/* Close X Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            disabled={isLoading}
          >
            <MaterialIcons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <MaterialIcons
              name={isConfirmed ? "event-busy" : "event-available"}
              size={32}
              color={isConfirmed ? colors.error.main : colors.success.main}
            />
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {isConfirmed ? "Unconfirm Attendance" : "Confirm Attendance"}
            </Text>
          </View>

          {/* Event Details */}
          <View style={styles.eventDetails}>
            <Text style={[styles.eventTitle, { color: colors.text.primary }]}>
              {title}
            </Text>
            
            <View style={styles.eventInfoRow}>
              <MaterialIcons
                name="schedule"
                size={18}
                color={colors.text.secondary}
              />
              <Text style={[styles.eventInfoText, { color: colors.text.secondary }]}>
                {format(startTime, 'h:mm a')}
              </Text>
            </View>

            {location && (
              <View style={styles.eventInfoRow}>
                <MaterialIcons
                  name="location-on"
                  size={18}
                  color={colors.text.secondary}
                />
                <Text style={[styles.eventInfoText, { color: colors.text.secondary }]}>
                  {location}
                </Text>
              </View>
            )}
          </View>

          {/* Message */}
          <View style={[
            styles.messageBox,
            {
              backgroundColor: isConfirmed 
                ? `${colors.error.main}15` 
                : `${colors.success.main}15`,
              borderColor: isConfirmed 
                ? colors.error.main 
                : colors.success.main,
            }
          ]}>
            <MaterialIcons
              name={isConfirmed ? "info" : "check-circle"}
              size={20}
              color={isConfirmed ? colors.error.main : colors.success.main}
            />
            <Text style={[
              styles.messageText,
              { color: isConfirmed ? colors.error.main : colors.success.main }
            ]}>
              {isConfirmed
                ? "Are you sure you want to unconfirm your attendance? This will remove this event from your confirmed schedule."
                : "Confirming your attendance will add this event to your schedule."}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Favorite button for agenda events (confirmed or tentative) */}
            {isAgendaEvent && onToggleFavorite && (
              <TouchableOpacity
                style={[
                  styles.favoriteButton,
                  {
                    backgroundColor: isFavorite ? '#FFD700' : colors.surface,
                    borderColor: isFavorite ? '#FFD700' : colors.divider,
                  }
                ]}
                onPress={onToggleFavorite}
                disabled={isLoading}
              >
                <MaterialIcons
                  name={isFavorite ? "star" : "star-border"}
                  size={20}
                  color={isFavorite ? "#000000" : colors.text.secondary}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: isConfirmed ? colors.error.main : colors.success.main,
                },
                isLoading && styles.confirmButtonDisabled
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <MaterialIcons name="hourglass-empty" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>
                    {isConfirmed ? "Unconfirming..." : "Confirming..."}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name={isConfirmed ? "cancel" : "check"}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.confirmButtonText}>
                    {isConfirmed ? "Unconfirm" : "Confirm"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  eventDetails: {
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  eventInfoText: {
    fontSize: 14,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  favoriteButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

