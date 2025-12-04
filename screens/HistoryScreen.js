import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://core.davidson.dev.br';

export default function HistoryScreen({ navigation }) {
  const [corridas, setCorridas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user_data');
      const user = JSON.parse(userJson);
      
      const response = await axios.get(`${API_URL}/api/corridas/${user.id}`);
      if (response.data.sucesso) {
        setCorridas(response.data.historico);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.id}>#{item.id}</Text>
        <Text style={[styles.status, { color: item.status === 'finalizada' ? '#00cc66' : '#orange' }]}>
            {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.valor}>R$ {parseFloat(item.valor_total).toFixed(2)}</Text>
      <Text style={styles.info}>{item.distancia_km} km • {new Date(item.criado_em).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.voltar}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Minhas Viagens</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#a388ee" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={corridas}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{padding: 20}}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhuma corrida encontrada.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 50, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', elevation: 2 },
  voltar: { fontSize: 16, color: '#a388ee', marginRight: 20 },
  titulo: { fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: 'white', padding: 15, marginBottom: 10, borderRadius: 10, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  id: { fontWeight: 'bold', color: '#666' },
  status: { fontWeight: 'bold', fontSize: 12 },
  valor: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  info: { color: '#888', marginTop: 5 },
  vazio: { textAlign: 'center', marginTop: 50, color: '#999' }
});