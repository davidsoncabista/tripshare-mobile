import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; // Biblioteca de ícones padrão do Expo

// SEU GATEWAY
const API_URL = 'https://core.davidson.dev.br'; 

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState(''); 
  const [senha, setSenha] = useState(''); 
  const [senhaVisivel, setSenhaVisivel] = useState(false); // Estado para controlar o olhinho
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
        
        // Salva token e dados do usuário
        await AsyncStorage.setItem('user_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(usuario));

        // Avisa o App.js que o login foi bem sucedido
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

      {/* Input de E-mail */}
      <TextInput 
        style={styles.input} 
        placeholder="E-mail" 
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      {/* Input de Senha com Olhinho */}
      <View style={styles.passwordContainer}>
          <TextInput 
            style={styles.inputSenha} 
            placeholder="Senha" 
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={!senhaVisivel} // Alterna entre bolinhas e texto
          />
          <TouchableOpacity 
            onPress={() => setSenhaVisivel(!senhaVisivel)} 
            style={styles.eyeIcon}
          >
            {/* Ícone muda dependendo do estado */}
            <Ionicons name={senhaVisivel ? "eye-off" : "eye"} size={24} color="#666" />
          </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.botao} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.textoBotao}>ENTRAR</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={{marginTop: 20}}>
        <Text style={{color: '#666'}}>Ainda não tem conta? <Text style={{fontWeight:'bold', color:'#a388ee'}}>Cadastre-se</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  logo: { fontSize: 40, fontWeight: 'bold', color: '#a388ee', marginBottom: 10 },
  titulo: { fontSize: 18, color: '#333', marginBottom: 30 },
  
  // Input comum (Email)
  input: { 
    width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15,
    borderWidth: 1, borderColor: '#ddd'
  },
  
  // Container especial para a senha (Input + Ícone)
  passwordContainer: {
    width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15
  },
  inputSenha: {
    flex: 1, padding: 15, // Ocupa todo o espaço menos o do ícone
  },
  eyeIcon: {
    padding: 10, paddingRight: 15 // Espaço para o dedo clicar
  },

  botao: { 
    width: '100%', backgroundColor: '#a388ee', padding: 15, borderRadius: 8, alignItems: 'center',
    marginTop: 10
  },
  textoBotao: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});