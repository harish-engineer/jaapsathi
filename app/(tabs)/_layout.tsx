import { Tabs } from 'expo-router';
import { Book, CircleDashed, BarChart2, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#D47C2A',
      tabBarInactiveTintColor: '#A08060',
      headerShown: true,
      headerStyle: { backgroundColor: '#FDF6EC' },
      headerTitleStyle: { color: '#3D2010', fontSize: 18, fontWeight: '600' },
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
