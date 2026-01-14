/**
 * BookSelector Component
 * Phase 4.3 - Monk Mode Book Selection
 *
 * Dropdown for selecting a book from active commitments or general reading.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import i18n from '../../i18n';
import { ensureHttps } from '../../utils/googleBooks';

export interface BookOption {
  id: string | null; // null for "general reading"
  title: string;
  author?: string;
  coverUrl?: string | null;
}

interface BookSelectorProps {
  options: BookOption[];
  selectedBook: BookOption | null;
  onSelect: (book: BookOption) => void;
}

export default function BookSelector({
  options,
  selectedBook,
  onSelect,
}: BookSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Add "General Reading" option at the beginning
  const allOptions: BookOption[] = [
    { id: null, title: i18n.t('monkmode.general_reading') },
    ...options,
  ];

  const handleSelect = (book: BookOption) => {
    onSelect(book);
    setModalVisible(false);
  };

  const displayText = selectedBook?.title || i18n.t('monkmode.select_book');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{i18n.t('monkmode.select_book')}</Text>

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectedContent}>
          {ensureHttps(selectedBook?.coverUrl) ? (
            <Image
              source={{ uri: ensureHttps(selectedBook?.coverUrl)! }}
              style={styles.coverThumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book" size={16} color={colors.text.muted} />
            </View>
          )}
          <Text style={styles.selectedText} numberOfLines={1}>
            {displayText}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {i18n.t('monkmode.select_book')}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={allOptions}
                keyExtractor={(item) => item.id || 'general'}
                renderItem={({ item }) => {
                  const isSelected = selectedBook?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.7}
                    >
                      {ensureHttps(item.coverUrl) ? (
                        <Image
                          source={{ uri: ensureHttps(item.coverUrl)! }}
                          style={styles.optionCover}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={styles.optionCoverPlaceholder}>
                          <Ionicons
                            name={item.id ? 'book' : 'book-outline'}
                            size={20}
                            color={colors.text.muted}
                          />
                        </View>
                      )}
                      <View style={styles.optionTextContainer}>
                        <Text
                          style={[
                            styles.optionTitle,
                            isSelected && styles.optionTitleSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {item.author && (
                          <Text style={styles.optionAuthor} numberOfLines={1}>
                            {item.author}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={colors.accent.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.listContent}
              />
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  coverThumbnail: {
    width: 32,
    height: 44,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: colors.background.tertiary,
  },
  coverPlaceholder: {
    width: 32,
    height: 44,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalSafeArea: {
    maxHeight: '70%',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  optionItemSelected: {
    backgroundColor: colors.background.tertiary,
  },
  optionCover: {
    width: 40,
    height: 56,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: colors.background.tertiary,
  },
  optionCoverPlaceholder: {
    width: 40,
    height: 56,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  optionTitleSelected: {
    color: colors.accent.primary,
  },
  optionAuthor: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: 4,
  },
});
