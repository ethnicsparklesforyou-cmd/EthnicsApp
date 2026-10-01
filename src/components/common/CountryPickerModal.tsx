import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { AppIcon } from './AppIcon';
import { COUNTRIES, type CountryItem } from '../../constants/countries';

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: CountryItem) => void;
  selectedCode: string;
}

export function CountryPickerModal({
  visible,
  onClose,
  onSelect,
  selectedCode,
}: CountryPickerModalProps) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, radius } = theme;
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dial_code.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (country: CountryItem) => {
    onSelect(country);
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SafeAreaView style={styles.inner}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text
                style={[
                  styles.title,
                  { color: colors.textPrimary, fontFamily: fontFamily.sansBold },
                ]}
              >
                Select Country / Region
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
              >
                <AppIcon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={styles.searchWrapper}>
              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <AppIcon name="magnify" size={20} color={colors.textMuted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search country or code (e.g. +91, USA)..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.searchInput,
                    {
                      color: colors.textPrimary,
                      fontFamily: fontFamily.sans,
                    },
                  ]}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {search.length > 0 && Platform.OS !== 'ios' && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <AppIcon name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={item => `${item.code}-${item.dial_code}`}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => {
                const isSelected = item.dial_code === selectedCode;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                    style={[
                      styles.itemRow,
                      { borderBottomColor: colors.border + '40' },
                      isSelected && {
                        backgroundColor: colors.primary + '12',
                      },
                    ]}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text
                      style={[
                        styles.countryName,
                        {
                          color: colors.textPrimary,
                          fontFamily: isSelected ? fontFamily.sansBold : fontFamily.sans,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.dialCode,
                        {
                          color: isSelected ? colors.primary : colors.textMuted,
                          fontFamily: fontFamily.sansBold,
                        },
                      ]}
                    >
                      {item.dial_code}
                    </Text>
                    {isSelected && (
                      <View style={{ marginLeft: 8 }}>
                        <AppIcon name="check" size={18} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontFamily: fontFamily.sans,
                      fontSize: fontSize.sm,
                    }}
                  >
                    No matching country found
                  </Text>
                </View>
              }
            />
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
  },
  closeBtn: {
    padding: 4,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  flag: {
    fontSize: 22,
    marginRight: 14,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
  },
  dialCode: {
    fontSize: 14,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
