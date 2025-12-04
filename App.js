// ========================================================
// 0. IMPORTAÇÃO OBRIGATÓRIA (GESTURE HANDLER)
// ========================================================
// Deve ser a PRIMEIRA linha do arquivo para evitar crash no Android
import 'react-native-gesture-handler';

// ========================================================
// 1. IMPORTAÇÕES E DEPENDÊNCIAS
// ========================================================
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================================
// 2. TELAS DO APLICATIVO (SCREENS)
// ========================================================
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';

// ========================================================
// 3. CONFIGURAÇÕES DE NAVEGAÇÃO
// ========================================================
const Stack = createStackNavigator();

export default function App() {
  
  // ========================================================
  // 4. ESTADOS GLOBAIS (AUTENTICAÇÃO)
  // ========================================================
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);

  // ========================================================
  // 5. LÓGICA DE INICIALIZAÇÃO (BOOTSTRAP)
  // ========================================================
  // Verifica se o usuário já fez login anteriormente ao abrir o app
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        const user = await AsyncStorage.getItem('user_data');
        
        if (token && user) {
          // Se achou dados salvos, restaura a sessão
          setUserToken(token);
          setUserData(JSON.parse(user));
          console.log("🔄 Sessão restaurada para:", JSON.parse(user).nome);
        }
      } catch (e) {
        console.log("❌ Erro ao restaurar token:", e);
      }
      
      // Finaliza o carregamento inicial (Splash)
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  // ========================================================
  // 6. RENDERIZAÇÃO: TELA DE CARREGAMENTO (LOADING)
  // ========================================================
  if (isLoading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
            <ActivityIndicator size="large" color="#00ff88" />
        </View>
    );
  }

  // ========================================================
  // 7. RENDERIZAÇÃO: ESTRUTURA DE NAVEGAÇÃO (ROTEADOR)
  // ========================================================
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {userToken == null ? (
          // --------------------------------------------------
          // FLUXO PÚBLICO (NÃO LOGADO)
          // --------------------------------------------------
          <Stack.Screen name="Login">
            {props => (
              <LoginScreen 
                {...props} 
                onLoginSuccess={(user) => {
                    console.log("✅ Login realizado com sucesso!");
                    setUserData(user);
                    setUserToken('logado'); // Define token para trocar a rota automaticamente
                }} 
              />
            )}
          </Stack.Screen>

        ) : (
          // --------------------------------------------------
          // FLUXO PRIVADO (LOGADO)
          // --------------------------------------------------
          <>
            <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                // Passa dados do usuário para o Mapa saber quem é (Motorista/Passageiro)
                initialParams={{ user: userData }} 
            />
            
            <Stack.Screen 
                name="History" 
                component={HistoryScreen} 
            />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}
// Código organizado por Davidson.