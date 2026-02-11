import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, Dimensions } from 'react-native';
import { safeOpenURL } from '../utils/linkingUtils';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RECOMMENDED_BOOKS } from '../constants/recommendations';
import { Role, Book } from '../types';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROLES: Role[] = ['Founder', 'HR', 'Manager', 'Specialist'];

interface Props {
  navigation: any;
}

export default function RoleSelectScreen({ navigation }: Props) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleSearchPress = () => {
    navigation.navigate('CreateCommitment');
  };

  const openAmazon = async (url?: string) => {
    if (url) {
      await safeOpenURL(url);
    }
  };

  const handleBookSelect = (book: Book) => {
    navigation.navigate('CreateCommitment', { preselectedBook: book });
  };

  const BookThumbnail = ({ uri }: { uri?: string }) => {
    if (!uri) {
      return (
        <View style={styles.placeholder}>
          <Ionicons name="book-outline" size={32} color="#ccc" />
        </View>
      );
    }
    return (
      <Image
        source={{ uri }}
        style={styles.bookCover}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
    );
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    // Get localized title/author using the ID
    const localizedTitle = i18n.t(`recommendations.books.${item.id}.title`);
    const localizedAuthor = i18n.t(`recommendations.books.${item.id}.author`);

    return (
      <View style={styles.bookCard}>
        <BookThumbnail uri={item.cover_url ?? undefined} />
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{localizedTitle}</Text>
          <Text style={styles.bookAuthor}>{localizedAuthor}</Text>
          <TouchableOpacity
            style={styles.amazonButton}
            onPress={() => openAmazon(item.amazon_link)}
          >
            <Text style={styles.amazonButtonText}>{i18n.t('book_search.buy_on_amazon')}</Text>
            <Feather name="external-link" color="#666" size={14} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.selectBookButton}
          onPress={() => handleBookSelect(item)}
        >
          <Text style={styles.selectBookButtonText}>{i18n.t('book_search.select')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Titan Background */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <LinearGradient
          colors={['#1A1008', '#100A06', '#080604']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Ambient light from top-left */}
        <LinearGradient
          colors={[
            'rgba(255, 160, 120, 0.15)',
            'rgba(255, 160, 120, 0.06)',
            'transparent',
          ]}
          locations={[0, 0.4, 0.8]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FAFAFA" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>{i18n.t('book_search.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>COMMIT</Text>
          <Text style={styles.subtitle}>{i18n.t('book_search.subtitle')}</Text>
        </View>

        <View style={styles.content}>
          {/* メインCTA: Deep Optical Glass スタイル */}
          <TouchableOpacity
            style={styles.searchCTA}
            onPress={handleSearchPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.08)',
                'rgba(255, 255, 255, 0.03)',
                'transparent',
              ]}
              locations={[0, 0.4, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 0.7 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />
            <View style={styles.searchCTAIcon}>
              <Ionicons name="search" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.searchCTAContent}>
              <Text style={styles.searchCTATitle}>{i18n.t('book_search.search_title')}</Text>
              <Text style={styles.searchCTASubtitle}>{i18n.t('book_search.search_subtitle')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="rgba(255, 255, 255, 0.5)" />
          </TouchableOpacity>

          {/* 区切り線 */}
          <View style={styles.divider} />

          {/* おすすめセクション（折りたたみ可能） */}
          <TouchableOpacity
            style={styles.recommendationToggle}
            onPress={() => setShowRecommendations(!showRecommendations)}
          >
            <View style={styles.recommendationToggleLeft}>
              <Ionicons name="bulb-outline" size={24} color="rgba(255, 160, 120, 0.8)" />
              <Text style={styles.recommendationToggleText}>{i18n.t('book_search.recommended')}</Text>
            </View>
            <MaterialIcons
              name={showRecommendations ? "expand-less" : "expand-more"}
              size={24}
              color="rgba(255, 255, 255, 0.4)"
            />
          </TouchableOpacity>

          {showRecommendations && (
            <View style={styles.recommendationSection}>
              {/* 役職選択 */}
              {!selectedRole ? (
                <>
                  <Text style={styles.rolePrompt}>{i18n.t('book_search.role_prompt')}</Text>
                  <View style={styles.roleGrid}>
                    {ROLES.map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={styles.roleButton}
                        onPress={() => handleRoleSelect(role)}
                      >
                        <Text style={styles.roleButtonText}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.selectionHeader}>
                    <Text style={styles.sectionTitle}>{selectedRole}{i18n.t('book_search.recommendations_for')}</Text>
                    <TouchableOpacity onPress={() => setSelectedRole(null)}>
                      <Text style={styles.changeRoleText}>{i18n.t('book_search.change')}</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={RECOMMENDED_BOOKS[selectedRole]}
                    renderItem={renderBookItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.bookList}
                    scrollEnabled={false}
                  />
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080604',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_WIDTH * 1.2,
    zIndex: 0,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#FAFAFA',
    // Subtle glow
    textShadowColor: 'rgba(255, 160, 120, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 160, 120, 0.6)',
    marginTop: 8,
    letterSpacing: 1.5,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // Deep Optical Glass 検索バー
  searchCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 32,
    overflow: 'hidden',
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  searchCTAIcon: {
    width: 52,
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    // Orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  searchCTAContent: {
    flex: 1,
  },
  searchCTATitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 4,
  },
  searchCTASubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 24,
  },
  recommendationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  recommendationToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recommendationToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  recommendationSection: {
    marginTop: 16,
  },
  rolePrompt: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleButton: {
    width: '47%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(26, 23, 20, 0.6)',
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    color: '#FAFAFA',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  changeRoleText: {
    fontSize: 13,
    color: 'rgba(255, 160, 120, 0.7)',
  },
  bookList: {
    gap: 12,
  },
  bookCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(26, 23, 20, 0.7)',
    alignItems: 'center',
  },
  bookCover: {
    width: 56,
    height: 84,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  placeholder: {
    width: 56,
    height: 84,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 14,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  bookAuthor: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  amazonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  amazonButtonText: {
    fontSize: 12,
    color: 'rgba(255, 160, 120, 0.6)',
  },
  selectBookButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    // Glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  selectBookButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
