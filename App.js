import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Telas
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);

  // Ao abrir o app, verifica se tem login salvo
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        const user = await AsyncStorage.getItem('user_data');
        if(token && user) {
            setUserToken(token);
            setUserData(JSON.parse(user));
        }
      } catch (e) {
        console.log("Erro ao restaurar token", e);
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  if (isLoading) {
    return (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color="#a388ee" />
        </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          // Se NÃO tem token, mostra só a tela de Login
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} onLoginSuccess={(user) => {
                setUserData(user);
                setUserToken('logado'); // Simples flag para mudar a rota
            }} />}
          </Stack.Screen>
        ) : (
          // Se TEM token, mostra as telas do sistema
          <>
            <Stack.Screen name="Home" component={HomeScreen} initialParams={{ user: userData }} />
            <Stack.Screen name="History" component={HistoryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}