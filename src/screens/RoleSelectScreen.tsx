import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Image, Linking } from 'react-native';
import { RECOMMENDED_BOOKS } from '../constants/recommendations';
import { Role, Book } from '../types';
import { MaterialIcons, Feather } from '@expo/vector-icons';

const ROLES: Role[] = ['Founder', 'HR', 'Manager', 'Specialist'];

interface Props {
  navigation: any;
}

export default function RoleSelectScreen({ navigation }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const openAmazon = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const handleBookSelect = (book: Book) => {
    navigation.navigate('CreateCommitment', { preselectedBook: book });
  };

  const renderRoleItem = ({ item }: { item: Role }) => (
    <TouchableOpacity
      style={[
        styles.roleButton,
        selectedRole === item && styles.roleButtonSelected
      ]}
      onPress={() => handleRoleSelect(item)}
    >
      <Text style={[
        styles.roleButtonText,
        selectedRole === item && styles.roleButtonTextSelected
      ]}>
        {item}
      </Text>
      {selectedRole === item && <MaterialIcons name="chevron-right" color="#fff" size={24} />}
    </TouchableOpacity>
  );

  const renderBookItem = ({ item }: { item: Book }) => (
    <View style={styles.bookCard}>
      <Image source={{ uri: item.cover_url }} style={styles.bookCover} />
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
      <View style={styles.header}>
        <Text style={styles.title}>COMMIT</Text>
        <Text style={styles.subtitle}>規律を資産に変える</Text>
      </View>

      {!selectedRole ? (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>あなたの役割を選択してください</Text>
          <FlatList
            data={ROLES}
            renderItem={renderRoleItem}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.roleList}
          />
        </View>
      ) : (
        <View style={styles.content}>
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
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    color: '#000',
  },
  roleList: {
    gap: 12,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  roleButtonSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  roleButtonTextSelected: {
    color: '#fff',
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
