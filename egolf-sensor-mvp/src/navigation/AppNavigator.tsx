/**
 * App Navigator
 * 
 * Main navigation setup with bottom tabs and stack navigators.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

import {
  ConnectScreen,
  LiveScreen,
  RecordScreen,
  SessionsScreen,
  SessionDetailScreen,
} from '../screens';

// Tab icon components
function ConnectIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#22c55e' : '#6b7280';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <Path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LiveIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#22c55e' : '#6b7280';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12h4l3-9 6 18 3-9h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RecordIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#ef4444' : '#6b7280';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={5} fill={color} />
    </Svg>
  );
}

function SessionsIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#22c55e' : '#6b7280';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={2} />
      <Rect x={14} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={2} />
      <Rect x={3} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={2} />
      <Rect x={14} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Stack navigators for each tab
const SessionsStack = createNativeStackNavigator();

function SessionsStackNavigator() {
  return (
    <SessionsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <SessionsStack.Screen name="SessionsList" component={SessionsScreen} />
      <SessionsStack.Screen name="SessionDetail" component={SessionDetailScreen} />
    </SessionsStack.Navigator>
  );
}

// Bottom Tab Navigator
const Tab = createBottomTabNavigator();

export function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#22c55e',
          tabBarInactiveTintColor: '#6b7280',
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="Connect"
          component={ConnectScreen}
          options={{
            tabBarIcon: ({ focused }) => <ConnectIcon focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Live"
          component={LiveScreen}
          options={{
            tabBarIcon: ({ focused }) => <LiveIcon focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Record"
          component={RecordScreen}
          options={{
            tabBarIcon: ({ focused }) => <RecordIcon focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Sessions"
          component={SessionsStackNavigator}
          options={{
            tabBarIcon: ({ focused }) => <SessionsIcon focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1e1e2d',
    borderTopColor: '#2d3748',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 65,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
