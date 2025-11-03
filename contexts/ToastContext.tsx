import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { isDark, colors } = useTheme();

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast: Toast = {
      id,
      duration: 4000,
      ...toast,
    };

    console.log('🔔 Creating toast:', newToast);
    setToasts(prev => {
      const updated = [...prev, newToast];
      console.log('🔔 Updated toasts array:', updated);
      return updated;
    });

    // Auto-hide after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = {
      backgroundColor: isDark ? colors.surface : colors.background.paper,
      borderLeftWidth: 4,
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          borderLeftColor: '#4CAF50',
          borderColor: isDark ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)',
          backgroundColor: isDark ? 'rgba(76, 175, 80, 0.4)' : 'rgba(76, 175, 80, 0.3)',
        };
      case 'error':
        return {
          ...baseStyles,
          borderLeftColor: '#F44336',
          borderColor: isDark ? 'rgba(244, 67, 54, 0.3)' : 'rgba(244, 67, 54, 0.2)',
          backgroundColor: isDark ? 'rgba(244, 67, 54, 0.4)' : 'rgba(244, 67, 54, 0.3)',
        };
      case 'warning':
        return {
          ...baseStyles,
          borderLeftColor: '#FF9800',
          borderColor: isDark ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)',
          backgroundColor: isDark ? 'rgba(255, 152, 0, 0.4)' : 'rgba(255, 152, 0, 0.3)',
        };
      case 'info':
        return {
          ...baseStyles,
          borderLeftColor: '#2196F3',
          borderColor: isDark ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)',
          backgroundColor: isDark ? 'rgba(33, 150, 243, 0.4)' : 'rgba(33, 150, 243, 0.3)',
        };
      default:
        return {
          ...baseStyles,
          borderColor: colors.divider,
          backgroundColor: isDark ? colors.surface : colors.background.paper,
        };
    }
  };

  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return { name: 'check-circle', color: '#4CAF50' };
      case 'error':
        return { name: 'error', color: '#F44336' };
      case 'warning':
        return { name: 'warning', color: '#FF9800' };
      case 'info':
        return { name: 'info', color: '#2196F3' };
      default:
        return { name: 'info', color: colors.text.secondary };
    }
  };

  return (
    <>
      <ToastContext.Provider value={{ showToast, hideToast, clearAllToasts }}>
        {children}
      </ToastContext.Provider>
      
      {/* Toast Container - Using Modal to ensure it's always on top */}
      <Modal
        visible={toasts.length > 0}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.toastModalContainer}>
          {toasts.map((toast, index) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              index={index}
              onHide={() => hideToast(toast.id)}
              getToastStyles={getToastStyles}
              getToastIcon={getToastIcon}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </View>
      </Modal>
    </>
  );
};

interface ToastItemProps {
  toast: Toast;
  index: number;
  onHide: () => void;
  getToastStyles: (type: Toast['type']) => any;
  getToastIcon: (type: Toast['type']) => { name: string; color: string };
  colors: any;
  isDark: boolean;
}

const ToastItem: React.FC<ToastItemProps> = ({
  toast,
  index,
  onHide,
  getToastStyles,
  getToastIcon,
  colors,
  isDark,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  React.useEffect(() => {
    // Animate in with spring effect
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const icon = getToastIcon(toast.type);
  const toastStyles = getToastStyles(toast.type);

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          marginTop: index * 12,
        },
      ]}
    >
      <View 
        style={[
          styles.toast, 
          toastStyles,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.2,
            shadowRadius: 8,
            elevation: 8,
          }
        ]}
      >
        <View style={styles.toastContent}>
          <View style={styles.toastHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
              <MaterialIcons
                name={icon.name as any}
                size={22}
                color={icon.color}
              />
            </View>
            <View style={styles.toastTextContainer}>
              <Text style={[styles.toastTitle, { color: colors.text.primary }]}>
                {toast.title}
              </Text>
              {toast.message && (
                <Text style={[styles.toastMessage, { color: colors.text.secondary }]}>
                  {toast.message}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleHide}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
          
          {toast.action && (
            <TouchableOpacity
              style={[
                styles.actionButton, 
                { 
                  borderColor: icon.color,
                  backgroundColor: `${icon.color}15`,
                }
              ]}
              onPress={() => {
                toast.action?.onPress();
                handleHide();
              }}
            >
              <Text style={[styles.actionButtonText, { color: icon.color }]}>
                {toast.action.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastModalContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  toastItem: {
    marginBottom: 8,
    width: '100%',
    maxWidth: 400,
  },
  toast: {
    borderRadius: 16,
    padding: 16,
    minHeight: 64,
    borderWidth: 1,
  },
  toastContent: {
    flex: 1,
  },
  toastHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  toastTextContainer: {
    flex: 1,
    marginRight: 8,
    paddingTop: 2,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  toastMessage: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  closeButton: {
    padding: 4,
    marginTop: -2,
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

// Convenience functions for common toast types
export const useToastHelpers = () => {
  const { showToast } = useToast();

  const showSuccess = useCallback((title: string, message?: string, action?: Toast['action']) => {
    showToast({ type: 'success', title, message, action });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string, action?: Toast['action']) => {
    showToast({ type: 'error', title, message, action });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string, action?: Toast['action']) => {
    showToast({ type: 'warning', title, message, action });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string, action?: Toast['action']) => {
    showToast({ type: 'info', title, message, action });
  }, [showToast]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
