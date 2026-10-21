import React from 'react';
import { Modal } from 'react-native';
import { SettingsScreen, SettingsScreenProps } from './SettingsScreen';

export interface SettingsModalProps extends SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  recipes,
  onRecipesReloadNeeded,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SettingsScreen recipes={recipes} onRecipesReloadNeeded={onRecipesReloadNeeded} />
    </Modal>
  );
};
