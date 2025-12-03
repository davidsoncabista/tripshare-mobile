import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SEU GATEWAY (Ajuste se necessário)
const API_URL = 'https://core.davidson.dev.br'; 

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState(''); // Teste: carlos@driver.com
  const [senha, setSenha] = useState(''); // Teste: 123456
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Erro", "Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/login`, {
        email: email.toLowerCase(),
        senha: senha
      });

      if (response.data.sucesso) {
        const { token, usuario } = response.data;
        
        // 1. Salva o token no celular (como se fosse um cookie)
        await AsyncStorage.setItem('user_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(usuario));

        // 2. Avisa o App.js que logou
        onLoginSuccess(usuario);
      }
    } catch (error) {
      console.log(error);
      const msg = error.response?.data?.erro || "Falha ao conectar no servidor";
      Alert.alert("Login Falhou", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TripShare 🏍️</Text>
      <Text style={styles.titulo}>Login Motorista/Passageiro</Text>

      <TextInput 
        style={styles.input} 
        placeholder="E-mail" 
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Senha" 
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <TouchableOpacity style={styles.botao} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.textoBotao}>ENTRAR</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={{marginTop: 20}}>
        <Text style={{color: '#666'}}>Ainda não tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  logo: { fontSize: 40, fontWeight: 'bold', color: '#a388ee', marginBottom: 10 },
  titulo: { fontSize: 18, color: '#333', marginBottom: 30 },
  input: { 
    width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15,
    borderWidth: 1, borderColor: '#ddd'
  },
  botao: { 
    width: '100%', backgroundColor: '#a388ee', padding: 15, borderRadius: 8, alignItems: 'center',
    marginTop: 10
  },
  textoBotao: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});