import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronDown, Search, Check } from 'lucide-react-native';
import { 
  CurrencyCode, 
  Currency, 
  getAvailableCurrencies, 
  getUserCurrency, 
  setUserCurrency 
} from '@/lib/currency';

interface CurrencySelectorProps {
  value?: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
}

export function CurrencySelector({ 
  value, 
  onCurrencyChange, 
  disabled = false 
}: CurrencySelectorProps) {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [currencies] = useState<Currency[]>(getAvailableCurrencies());

  useEffect(() => {
    if (value) {
      setSelectedCurrency(value);
    } else {
      loadUserCurrency();
    }
  }, [value]);

  const loadUserCurrency = async () => {
    const userCurrency = await getUserCurrency();
    setSelectedCurrency(userCurrency);
    onCurrencyChange(userCurrency);
  };

  const handleCurrencySelect = async (currency: CurrencyCode) => {
    setSelectedCurrency(currency);
    onCurrencyChange(currency);
    await setUserCurrency(currency);
    setShowModal(false);
    setSearchQuery('');
  };

  const filteredCurrencies = currencies.filter(currency =>
    currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentCurrency = currencies.find(c => c.code === selectedCurrency);

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
    },
    selectorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      minWidth: 100,
    },
    selectorButtonDisabled: {
      opacity: 0.6,
    },
    currencyInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    currencySymbol: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: colors.primary,
      marginRight: 6,
    },
    currencyCode: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.text,
    },
    chevron: {
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    currencyList: {
      maxHeight: 300,
    },
    currencyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencyItemSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    currencyItemInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    currencyItemSymbol: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.primary,
      marginRight: 12,
      minWidth: 24,
    },
    currencyItemDetails: {
      flex: 1,
    },
    currencyItemCode: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    currencyItemName: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    checkIcon: {
      marginLeft: 8,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.selectorButton,
          disabled && styles.selectorButtonDisabled,
        ]}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
      >
        <View style={styles.currencyInfo}>
          <Text style={styles.currencySymbol}>
            {currentCurrency?.symbol || '$'}
          </Text>
          <Text style={styles.currencyCode}>
            {currentCurrency?.code || 'USD'}
          </Text>
        </View>
        <ChevronDown size={16} color={colors.textMuted} style={styles.chevron} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            
            <View style={styles.searchContainer}>
              <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search currencies..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <ScrollView style={styles.currencyList}>
              {filteredCurrencies.map((currency) => {
                const isSelected = currency.code === selectedCurrency;
                return (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyItem,
                      isSelected && styles.currencyItemSelected,
                    ]}
                    onPress={() => handleCurrencySelect(currency.code)}
                  >
                    <View style={styles.currencyItemInfo}>
                      <Text style={styles.currencyItemSymbol}>
                        {currency.symbol}
                      </Text>
                      <View style={styles.currencyItemDetails}>
                        <Text style={styles.currencyItemCode}>
                          {currency.code}
                        </Text>
                        <Text style={styles.currencyItemName}>
                          {currency.name}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Check size={20} color={colors.primary} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}