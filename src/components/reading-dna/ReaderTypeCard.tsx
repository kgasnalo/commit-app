import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sun, Moon, Zap, Trophy, CalendarDays, Flame, Scale } from 'lucide-react-native';
import { GlassTile } from '../titan/GlassTile';
import { MicroLabel } from '../titan/MicroLabel';
import i18n from '../../i18n';
import { ReaderType, ReaderTypeResult } from '../../lib/MonkModeService';

interface ReaderTypeCardProps {
  readerType: ReaderTypeResult | null;
}

const READER_ICONS: Record<ReaderType, React.ReactNode> = {
  morning_reader: <Sun size={32} color="#FF6B35" />,
  night_reader: <Moon size={32} color="#FF6B35" />,
  sprinter: <Zap size={32} color="#FF6B35" />,
  marathon_runner: <Trophy size={32} color="#FF6B35" />,
  weekend_warrior: <CalendarDays size={32} color="#FF6B35" />,
  streak_reader: <Flame size={32} color="#FF6B35" />,
  balanced_reader: <Scale size={32} color="#FF6B35" />,
};

export const ReaderTypeCard: React.FC<ReaderTypeCardProps> = ({ readerType }) => {
  if (!readerType) return null;

  const typeName = i18n.t(`readingDna.${readerType.primary}`);
  const icon = READER_ICONS[readerType.primary];

  return (
    <GlassTile variant="glowing" padding="lg" style={styles.container}>
      <MicroLabel style={styles.label}>
        {i18n.t('readingDna.reader_type_label')}
      </MicroLabel>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {icon}
        </View>

        <Text style={styles.typeName}>{typeName}</Text>

        {readerType.confidence > 0 && (
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${readerType.confidence}%` }
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </GlassTile>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  typeName: {
    fontSize: 28,
    fontWeight: '200',
    color: '#FAFAFA',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  confidenceContainer: {
    marginTop: 16,
    width: '60%',
  },
  confidenceBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
});

export default ReaderTypeCard;
