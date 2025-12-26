import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Image, Linking, ScrollView } from 'react-native';
import { RECOMMENDED_BOOKS } from '../constants/recommendations';
import { Role, Book } from '../types';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';

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

  const openAmazon = (url?: string) => {
    if (url) {
      Linking.openURL(url);
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
    return <Image source={{ uri }} style={styles.bookCover} />;
  };

  const renderBookItem = ({ item }: { item: Book }) => (
    <View style={styles.bookCard}>
      <BookThumbnail uri={item.cover_url} />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
        <TouchableOpacity 
          style={styles.amazonButton}
          onPress={() => openAmazon(item.amazon_link)}
        >
          <Text style={styles.amazonButtonText}>Amazonで購入</Text>
          <Feather name="external-link" color="#666" size={14} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.selectBookButton}
        onPress={() => handleBookSelect(item)}
      >
        <Text style={styles.selectBookButtonText}>選択</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>COMMIT</Text>
          <Text style={styles.subtitle}>規律を資産に変える</Text>
        </View>

        <View style={styles.content}>
          {/* メインCTA: 読みたい本を検索 */}
          <TouchableOpacity
            style={styles.searchCTA}
            onPress={handleSearchPress}
          >
            <View style={styles.searchCTAIcon}>
              <Ionicons name="search" size={32} color="#fff" />
            </View>
            <View style={styles.searchCTAContent}>
              <Text style={styles.searchCTATitle}>読みたい本を検索</Text>
              <Text style={styles.searchCTASubtitle}>書籍タイトルから探す</Text>
            </View>
            <MaterialIcons name="chevron-right" size={32} color="#000" />
          </TouchableOpacity>

          {/* 区切り線 */}
          <View style={styles.divider} />

          {/* おすすめセクション（折りたたみ可能） */}
          <TouchableOpacity
            style={styles.recommendationToggle}
            onPress={() => setShowRecommendations(!showRecommendations)}
          >
            <View style={styles.recommendationToggleLeft}>
              <Ionicons name="bulb-outline" size={24} color="#666" />
              <Text style={styles.recommendationToggleText}>おすすめから選ぶ（任意）</Text>
            </View>
            <MaterialIcons
              name={showRecommendations ? "expand-less" : "expand-more"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>

          {showRecommendations && (
            <View style={styles.recommendationSection}>
              {/* 役職選択 */}
              {!selectedRole ? (
                <>
                  <Text style={styles.rolePrompt}>あなたの役割を選択してください</Text>
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
                    <Text style={styles.sectionTitle}>{selectedRole}へのおすすめ</Text>
                    <TouchableOpacity onPress={() => setSelectedRole(null)}>
                      <Text style={styles.changeRoleText}>変更する</Text>
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
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    letterSpacing: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  searchCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 32,
  },
  searchCTAIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  searchCTAContent: {
    flex: 1,
  },
  searchCTATitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  searchCTASubtitle: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  recommendationSection: {
    marginTop: 16,
  },
  rolePrompt: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  changeRoleText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  bookList: {
    gap: 16,
  },
  bookCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  amazonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  amazonButtonText: {
    fontSize: 12,
    color: '#666',
    textDecorationLine: 'underline',
  },
  selectBookButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectBookButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
