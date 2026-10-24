import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { RecipeAiService, AiConnectionStatus } from '../services/recipeAiService';

export const useRecipeAiConfig = () => {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<AiConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  useEffect(() => {
    RecipeAiService.getApiKey().then((k) => setApiKey(k || ''));
    setIsCheckingConnection(true);
    RecipeAiService.checkConnection().then((st) => {
      setConnectionStatus(st);
      setIsCheckingConnection(false);
    });
  }, []);

  const verifyAiStatus = async (keyToTest?: string) => {
    setIsCheckingConnection(true);
    try {
      const status = await RecipeAiService.checkConnection(keyToTest);
      setConnectionStatus(status);
    } catch (e: any) {
      setConnectionStatus({
        ok: false,
        code: 'UNKNOWN_ERROR',
        message: e?.message || 'Erreur lors du test de connexion',
      });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      await RecipeAiService.setApiKey(tempApiKeyInput.trim());
      setApiKey(tempApiKeyInput.trim());
      setIsApiKeyModalVisible(false);
      await verifyAiStatus(tempApiKeyInput.trim());
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la clé API.');
    }
  };

  return {
    apiKey,
    setApiKey,
    isApiKeyModalVisible,
    setIsApiKeyModalVisible,
    tempApiKeyInput,
    setTempApiKeyInput,
    isKeyVisible,
    setIsKeyVisible,
    connectionStatus,
    isCheckingConnection,
    verifyAiStatus,
    handleSaveApiKey,
  };
};
