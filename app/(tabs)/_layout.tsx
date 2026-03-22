import { Tabs } from 'expo-router';
import { Book, CircleDashed, BarChart2, User, Sunrise } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#D47C2A',
      tabBarInactiveTintColor: '#A08060',
      headerShown: false,
      tabBarStyle: { backgroundColor: '#FDF0DC', borderTopColor: '#E8D5B0' }
    }}>
      <Tabs.Screen
        name="counter"
        options={{
          title: 'Jaap',
          tabBarIcon: ({ color, size }) => <CircleDashed size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mantras"
        options={{
          title: 'Mantras',
          tabBarIcon: ({ color, size }) => <Book size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sankalpa"
        options={{
          title: 'Sankalpa',
          tabBarIcon: ({ color, size }) => <Sunrise size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
