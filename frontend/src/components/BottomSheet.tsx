import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme, typography } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ visible, onClose, children }: Props) {
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(450)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 3,
        speed: 14,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar formulário"
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              shadowColor: theme.shadow,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: typography.radii.xl,
    borderTopRightRadius: typography.radii.xl,
    paddingHorizontal: typography.spacing.lg,
    paddingTop: typography.spacing.md,
    paddingBottom: typography.spacing.xxl,
    maxHeight: '88%',
    elevation: 16,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: typography.radii.full,
    alignSelf: 'center',
    marginBottom: typography.spacing.md,
  },
});