import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';

export default function BuscaEndereco({ onSelecionar }) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);

  // Função que bate no Nominatim (OpenStreetMap)
  const pesquisar = async (texto) => {
    setBusca(texto);
    if (texto.length < 3) return;

    try {
      // Dica: Adicione '&viewbox=...' para limitar a busca só em Belém/PA se quiser
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${texto}&addressdetails=1&limit=5&countrycodes=br`;
      
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'TripShareApp/1.0' } // Obrigatório pelo OSM
      });
      setResultados(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput 
        style={styles.input}
        placeholder="Para onde vamos?"
        value={busca}
        onChangeText={pesquisar}
      />
      
      <FlatList
        data={resultados}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => {
                setResultados([]); // Limpa lista
                setBusca(item.display_name); // Preenche input
                onSelecionar({ // Devolve latitude/longitude para o App.js desenhar a rota
                    lat: item.lat,
                    lon: item.lon,
                    nome: item.display_name
                });
            }}
          >
            <Text numberOfLines={1}>{item.display_name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 50, width: '90%', alignSelf: 'center', zIndex: 10 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 8, elevation: 5 },
  item: { backgroundColor: '#f9f9f9', padding: 15, borderBottomWidth: 1, borderColor: '#eee' }
});