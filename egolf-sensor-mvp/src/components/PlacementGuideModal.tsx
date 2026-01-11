/**
 * Placement Guide Modal Component
 * 
 * Displays sensor placement instructions with illustrations for lead wrist/forearm placement.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Path, G, Text as SvgText } from 'react-native-svg';

interface PlacementGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PlacementGuideModal({
  visible,
  onClose,
}: PlacementGuideModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sensor Placement Guide</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Lead Wrist/Forearm Placement Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lead Wrist/Forearm Placement</Text>
            
            {/* Instructions */}
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionText}>
                • Attach the sensor to your lead wrist (left wrist for right-handed golfers){'\n'}
                • Position the sensor on the top of your wrist, just above the wrist joint{'\n'}
                • Secure it firmly with the strap, but not too tight{'\n'}
                • The sensor should be flat against your skin, not loose or dangling{'\n'}
                • Ensure the sensor is oriented correctly (check device markings){'\n'}
                • For best results, place it on the back of your wrist (dorsal side)
              </Text>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <Text style={styles.illustrationTitle}>Correct Placement</Text>
              <View style={styles.illustrationBox}>
                <Svg width={200} height={200} viewBox="0 0 200 200">
                  {/* Forearm */}
                  <Rect x={60} y={40} width={80} height={100} rx={10} fill="#3b82f6" opacity={0.3} />
                  <Path
                    d="M 60 40 L 140 40 L 140 140 L 60 140 Z"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="none"
                  />
                  
                  {/* Wrist joint */}
                  <Circle cx={100} cy={140} r={8} fill="#ef4444" />
                  
                  {/* Sensor on wrist */}
                  <Rect x={85} y={145} width={30} height={15} rx={3} fill="#22c55e" />
                  <Rect x={87} y={147} width={26} height={11} rx={2} fill="#ffffff" />
                  
                  {/* Labels */}
                  <G>
                    <Path
                      d="M 100 160 L 100 175 L 120 175"
                      stroke="#9ca3af"
                      strokeWidth={1.5}
                      fill="none"
                      strokeDasharray="2,2"
                    />
                    <SvgText
                      x={125}
                      y={178}
                      fill="#9ca3af"
                      fontSize={10}
                      fontWeight="500"
                    >
                      Sensor
                    </SvgText>
                  </G>
                  
                  {/* Forearm label */}
                  <SvgText
                    x={100}
                    y={30}
                    fill="#3b82f6"
                    fontSize={12}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    Forearm
                  </SvgText>
                </Svg>
              </View>
            </View>

            {/* Tips */}
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Tips for Best Results</Text>
              <Text style={styles.tipText}>
                • Make sure the sensor doesn't move during your swing{'\n'}
                • Avoid placing it over clothing - direct skin contact is best{'\n'}
                • Check that the sensor is level (not tilted) on your wrist{'\n'}
                • If using a watch, place the sensor on the opposite side{'\n'}
                • Re-check placement if you notice inconsistent readings
              </Text>
            </View>

            {/* Common Mistakes */}
            <View style={styles.mistakesBox}>
              <Text style={styles.mistakesTitle}>⚠️ Common Mistakes</Text>
              <Text style={styles.mistakeText}>
                • Sensor too loose - will move during swing{'\n'}
                • Sensor on wrong wrist (trail wrist instead of lead){'\n'}
                • Sensor tilted or rotated incorrectly{'\n'}
                • Placed too far up the forearm (should be at wrist joint){'\n'}
                • Sensor over thick clothing or watch
              </Text>
            </View>
          </View>

          {/* Additional Help */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need More Help?</Text>
            <Text style={styles.helpText}>
              If you're still having trouble with placement, try the calibration screen
              to see live feedback on your sensor position. The live preview will help
              you verify that the sensor is reading correctly.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e1e2d',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  instructionsBox: {
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 15,
    color: '#e5e7eb',
    lineHeight: 24,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  illustrationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  illustrationBox: {
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  tipsBox: {
    backgroundColor: '#22c55e20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 22,
  },
  mistakesBox: {
    backgroundColor: '#f59e0b20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mistakesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 12,
  },
  mistakeText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 22,
  },
  helpSection: {
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
});
