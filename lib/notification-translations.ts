import { useTranslation } from '../i18n/i18n';

/**
 * Helper function to translate notification titles and messages
 * This function detects the notification type and applies appropriate translations
 * with parameter substitution
 */
export function translateNotification(
  notification: {
    type: string;
    title: string;
    message: string;
    [key: string]: any;
  },
  t: (key: string, params?: Record<string, any>) => string
): { title: string; message: string } {
  const { type, title, message } = notification;

  // Try to get translation key for this notification type
  const translationKey = `notifications.types.${type}`;
  
  // Extract parameters from the original message/title if possible
  // For now, we'll use the translation templates and try to extract values
  let translatedTitle = title;
  let translatedMessage = message;

  try {
    // Try to translate based on notification type
    switch (type) {
      case 'meeting_request':
        // Check if this is for requester or speaker
        if (title.includes('Request Sent')) {
          const speakerMatch = message.match(/to (.+?) has been sent/);
          if (speakerMatch) {
            translatedTitle = t('notifications.types.meeting_request.title');
            // Check if message includes expiration time
            const expiryMatch = message.match(/Expires in (\d+(?:\.\d+)?) hours?/);
            if (expiryMatch) {
              translatedMessage = t('notifications.types.meeting_request.messageWithExpiry', {
                speakerName: speakerMatch[1],
                hours: expiryMatch[1]
              });
            } else {
              translatedMessage = t('notifications.types.meeting_request.message', {
                speakerName: speakerMatch[1]
              });
            }
          }
        } else if (title.includes('VIP')) {
          const requesterMatch = message.match(/^(.+?) \(VIP\)/);
          if (requesterMatch) {
            translatedTitle = t('notifications.types.meeting_request.speakerVipTitle');
            translatedMessage = t('notifications.types.meeting_request.speakerVipMessage', {
              requesterName: requesterMatch[1]
            });
          }
        } else if (title.includes('Business')) {
          const requesterMatch = message.match(/^(.+?) \(Business\)/);
          if (requesterMatch) {
            translatedTitle = t('notifications.types.meeting_request.speakerBusinessTitle');
            translatedMessage = t('notifications.types.meeting_request.speakerBusinessMessage', {
              requesterName: requesterMatch[1]
            });
          }
        } else {
          // Regular meeting request for speaker
          const requesterMatch = message.match(/^(.+?) wants to meet/);
          if (requesterMatch) {
            translatedTitle = t('notifications.types.meeting_request.speakerTitle');
            translatedMessage = t('notifications.types.meeting_request.speakerMessage', {
              requesterName: requesterMatch[1]
            });
          }
        }
        // Check for boost message
        if (message.includes('Boosted with')) {
          const boostMatch = message.match(/\$(\d+(?:\.\d+)?)/);
          if (boostMatch) {
            translatedMessage += t('notifications.types.meeting_request.boostedMessage', {
              boostAmount: boostMatch[1]
            });
          }
        }
        break;

      case 'meeting_accepted':
        if (title.includes('Accepted!')) {
          // For requester
          // Check if message includes schedule and LUKAS reward
          if (message.includes('Meeting scheduled for') && message.includes('LUKAS')) {
            const scheduleMatch = message.match(/Meeting scheduled for (.+?)\. You earned/);
            if (scheduleMatch) {
              translatedTitle = t('notifications.types.meeting_accepted.title');
              translatedMessage = t('notifications.types.meeting_accepted.messageWithSchedule', {
                scheduleTime: scheduleMatch[1]
              });
            }
          } else {
            const speakerMatch = message.match(/^(.+?) has accepted/);
            if (speakerMatch) {
              translatedTitle = t('notifications.types.meeting_accepted.title');
              translatedMessage = t('notifications.types.meeting_accepted.message', {
                speakerName: speakerMatch[1]
              });
            }
          }
        } else if (title === 'Request Accepted') {
          // For speaker
          const requesterMatch = message.match(/from (.+?)$/);
          if (requesterMatch) {
            translatedTitle = t('notifications.types.meeting_accepted.speakerTitle');
            translatedMessage = t('notifications.types.meeting_accepted.speakerMessage', {
              requesterName: requesterMatch[1]
            });
          }
        } else if (title.includes('Meeting Scheduled!')) {
          // For speaker when meeting is scheduled
          // Check if message includes LUKAS reward
          if (message.includes('Meeting scheduled for') && message.includes('LUKAS')) {
            const scheduleMatch = message.match(/Meeting scheduled for (.+?)\. You earned/);
            if (scheduleMatch) {
              translatedTitle = t('notifications.types.meeting_accepted.speakerScheduledTitle');
              translatedMessage = t('notifications.types.meeting_accepted.speakerScheduledWithReward', {
                scheduleTime: scheduleMatch[1]
              });
            }
          } else {
            const requesterMatch = message.match(/with (.+?) has been scheduled/);
            if (requesterMatch) {
              translatedTitle = t('notifications.types.meeting_accepted.speakerScheduledTitle');
              translatedMessage = t('notifications.types.meeting_accepted.speakerScheduledMessage', {
                requesterName: requesterMatch[1]
              });
            }
          }
        }
        break;

      case 'meeting_declined':
        if (title === 'Meeting Request Declined') {
          // For requester
          const speakerMatch = message.match(/^(.+?) has declined/);
          if (speakerMatch) {
            translatedTitle = t('notifications.types.meeting_declined.title');
            translatedMessage = t('notifications.types.meeting_declined.message', {
              speakerName: speakerMatch[1]
            });
          }
        } else if (title === 'Request Declined') {
          // For speaker
          const requesterMatch = message.match(/from (.+?)$/);
          if (requesterMatch) {
            translatedTitle = t('notifications.types.meeting_declined.speakerTitle');
            translatedMessage = t('notifications.types.meeting_declined.speakerMessage', {
              requesterName: requesterMatch[1]
            });
          }
        }
        break;

      case 'meeting_expired':
        const speakerMatch = message.match(/to (.+?) has expired/);
        if (speakerMatch) {
          translatedTitle = t('notifications.types.meeting_expired.title');
          translatedMessage = t('notifications.types.meeting_expired.message', {
            speakerName: speakerMatch[1]
          });
        }
        break;

      case 'meeting_cancelled':
        if (title === 'Meeting Request Cancelled') {
          // Check if it's for requester or speaker
          if (message.includes('has been cancelled') && !message.includes('from')) {
            // For requester
            translatedTitle = t('notifications.types.meeting_cancelled.title');
            translatedMessage = t('notifications.types.meeting_cancelled.message');
          } else {
            // For speaker
            const requesterMatch = message.match(/from (.+?) has been cancelled/);
            if (requesterMatch) {
              translatedTitle = t('notifications.types.meeting_cancelled.speakerTitle');
              translatedMessage = t('notifications.types.meeting_cancelled.speakerMessage', {
                requesterName: requesterMatch[1]
              });
            }
          }
        }
        break;

      case 'meeting_reminder':
        const nameMatch = message.match(/with (.+?) scheduled/);
        if (nameMatch) {
          translatedTitle = t('notifications.types.meeting_reminder.title');
          translatedMessage = t('notifications.types.meeting_reminder.message', {
            name: nameMatch[1]
          });
        }
        break;

      case 'boost_received':
        const amountMatch = message.match(/\$(\d+(?:\.\d+)?)/);
        if (amountMatch) {
          translatedTitle = t('notifications.types.boost_received.title');
          translatedMessage = t('notifications.types.boost_received.message', {
            amount: amountMatch[1]
          });
        }
        break;

      case 'system_alert':
        translatedTitle = t('notifications.types.system_alert.title');
        translatedMessage = t('notifications.types.system_alert.message', {
          message: message
        });
        break;

      case 'chat_message':
        // Check different chat message formats
        if (title.includes('New message from')) {
          // Format: "New message from {name}"
          const senderMatch = title.match(/from (.+?)$/);
          if (senderMatch) {
            translatedTitle = t('notifications.types.chat_message.titleFrom', {
              senderName: senderMatch[1]
            });
            translatedMessage = t('notifications.types.chat_message.messageFrom', {
              senderName: senderMatch[1]
            });
          }
        } else if (message && !message.includes('sent you')) {
          // Format: Meeting title as title, message as message
          translatedTitle = t('notifications.types.chat_message.titleMeeting', {
            meetingTitle: title
          });
          translatedMessage = t('notifications.types.chat_message.messageMeeting', {
            meetingTitle: title
          });
        } else {
          // Default format: "{name} sent you a message"
          const senderMatch = message.match(/^(.+?) sent you/);
          if (senderMatch) {
            translatedTitle = t('notifications.types.chat_message.title');
            translatedMessage = t('notifications.types.chat_message.message', {
              senderName: senderMatch[1]
            });
          }
        }
        break;
    }
  } catch (error) {
    // If translation fails, return original
    console.warn('Failed to translate notification:', error);
  }

  // Return original if translation didn't change anything
  return {
    title: translatedTitle !== title ? translatedTitle : title,
    message: translatedMessage !== message ? translatedMessage : message
  };
}

/**
 * Hook to use notification translations
 */
export function useNotificationTranslations() {
  const { t } = useTranslation();
  
  return {
    translateNotification: (notification: any) => translateNotification(notification, t),
    t
  };
}

