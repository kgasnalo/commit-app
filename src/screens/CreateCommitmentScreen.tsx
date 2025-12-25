import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Book } from '../types';

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

interface Props {
  navigation: any;
  route?: {
    params?: {
      preselectedBook?: Book;
    };
  };
}

export default function CreateCommitmentScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(
    route?.params?.preselectedBook ? convertToGoogleBook(route.params.preselectedBook) : null
  );
  const [deadline, setDeadline] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // デフォルト30日後
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [agreedToPenalty, setAgreedToPenalty] = useState(false);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  function convertToGoogleBook(book: Book): GoogleBook {
    return {
      id: book.google_books_id,
      volumeInfo: {
        title: book.title,
        authors: [book.author],
        imageLinks: {
          thumbnail: book.cover_url
        }
      }
    };
  }

  const searchBooks = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('エラー', '検索キーワードを入力してください。');
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&key=${process.env.EXPO_PUBLIC_GOOGLE_API_KEY}&maxResults=10`
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        setSearchResults(data.items);
      } else {
        Alert.alert('検索結果なし', '該当する書籍が見つかりませんでした。');
        setSearchResults([]);
      }
    } catch (error: any) {
      Alert.alert('エラー', '書籍の検索に失敗しました。');
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleBookSelect = (book: GoogleBook) => {
    setSelectedBook(book);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const handleCreateCommitment = async () => {
    if (!selectedBook) {
      Alert.alert('エラー', '書籍を選択してください。');
      return;
    }

    if (!agreedToPenalty) {
      Alert.alert('エラー', 'ペナルティに同意してください。');
      return;
    }

    if (deadline < new Date()) {
      Alert.alert('エラー', '期限は現在より後の日付を選択してください。');
      return;
    }

    setCreating(true);
    try {
      // 1. ユーザー情報取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 2. 書籍をDBに保存（既存チェック）
      let bookId: string;
      const { data: existingBook } = await supabase
        .from('books')
        .select('id')
        .eq('google_books_id', selectedBook.id)
        .single();

      if (existingBook) {
        bookId = existingBook.id;
      } else {
        const { data: newBook, error: bookError } = await supabase
          .from('books')
          .insert({
            google_books_id: selectedBook.id,
            title: selectedBook.volumeInfo.title,
            author: selectedBook.volumeInfo.authors?.join(', ') || '不明',
            cover_url: selectedBook.volumeInfo.imageLinks?.thumbnail || selectedBook.volumeInfo.imageLinks?.smallThumbnail || '',
          })
          .select('id')
          .single();

        if (bookError) throw bookError;
        bookId = newBook.id;
      }

      // 3. コミットメント作成
      const { error: commitmentError } = await supabase
        .from('commitments')
        .insert({
          user_id: user.id,
          book_id: bookId,
          deadline: deadline.toISOString(),
          status: 'pending',
          pledge_amount: 1000
        });

      if (commitmentError) throw commitmentError;

      Alert.alert(
        '成功',
        `コミットメントを作成しました。\n期限: ${deadline.toLocaleDateString('ja-JP')}\nペナルティ: ¥1,000`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('RoleSelect')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'コミットメントの作成に失敗しました。');
      console.error('Create commitment error:', error);
    } finally {
      setCreating(false);
    }
  };

  const renderBookItem = ({ item }: { item: GoogleBook }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => handleBookSelect(item)}
    >
      <Image
        source={{ uri: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail }}
        style={styles.bookCover}
      />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.volumeInfo.title}</Text>
        <Text style={styles.bookAuthor}>{item.volumeInfo.authors?.join(', ') || '著者不明'}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>コミットメント作成</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 書籍選択セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 読む書籍を選択</Text>

          {selectedBook ? (
            <View style={styles.selectedBookCard}>
              <Image
                source={{ uri: selectedBook.volumeInfo.imageLinks?.thumbnail || selectedBook.volumeInfo.imageLinks?.smallThumbnail }}
                style={styles.selectedBookCover}
              />
              <View style={styles.selectedBookInfo}>
                <Text style={styles.selectedBookTitle}>{selectedBook.volumeInfo.title}</Text>
                <Text style={styles.selectedBookAuthor}>{selectedBook.volumeInfo.authors?.join(', ')}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBook(null)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="書籍タイトルを入力"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={searchBooks}
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={searchBooks}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialIcons name="search" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {searchResults.length > 0 && (
                <FlatList
                  data={searchResults}
                  renderItem={renderBookItem}
                  keyExtractor={(item) => item.id}
                  style={styles.searchResults}
                  scrollEnabled={false}
                />
              )}
            </>
          )}
        </View>

        {/* 期限設定セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 読了期限を設定</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateButtonText}>
              {deadline.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={deadline}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* ペナルティ同意セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. ペナルティに同意</Text>
          <View style={styles.penaltyCard}>
            <Text style={styles.penaltyAmount}>¥1,000</Text>
            <Text style={styles.penaltyDescription}>
              期限までに読了証明を提出できなかった場合、上記金額が自動的に課金されます。
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAgreedToPenalty(!agreedToPenalty)}
          >
            <View style={[styles.checkboxBox, agreedToPenalty && styles.checkboxBoxChecked]}>
              {agreedToPenalty && <MaterialIcons name="check" size={18} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>
              上記ペナルティに同意し、コミットメントを作成します
            </Text>
          </TouchableOpacity>
        </View>

        {/* 作成ボタン */}
        <TouchableOpacity
          style={[
            styles.createButton,
            (!selectedBook || !agreedToPenalty) && styles.createButtonDisabled
          ]}
          onPress={handleCreateCommitment}
          disabled={!selectedBook || !agreedToPenalty || creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>コミットメントを作成</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    marginTop: 12,
    maxHeight: 300,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  bookCover: {
    width: 40,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  bookAuthor: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  selectedBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  selectedBookCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  selectedBookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  selectedBookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  selectedBookAuthor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  penaltyCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    marginBottom: 16,
  },
  penaltyAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  penaltyDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#000',
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
