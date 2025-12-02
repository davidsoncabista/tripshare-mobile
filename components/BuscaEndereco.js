import React, { useState, useRef } from 'react'; // <--- Adicione useRef
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';

export default function BuscaEndereco({ onSelecionar }) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const timeoutRef = useRef(null); // <--- Guarda o "timer"

  const pesquisar = (texto) => {
    setBusca(texto);
    
    // 1. Limpa o timer anterior (cancela a busca se você continuar digitando)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (texto.length < 3) {
        setResultados([]);
        return;
    }

    // 2. Cria um novo timer de 1.5 segundos
    timeoutRef.current = setTimeout(async () => {
        setCarregando(true);
        try {
            console.log("🔎 Buscando:", texto);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${texto}&addressdetails=1&limit=5&countrycodes=br`;
            const response = await axios.get(url, { headers: { 'User-Agent': 'TripShareApp/1.0' } });
            setResultados(response.data);
        } catch (error) {
            console.log(error);
        } finally {
            setCarregando(false);
        }
    }, 1500); // <--- Tempo de espera (1500ms)
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputBox}>
          <TextInput 
            style={styles.input}
            placeholder="Para onde vamos?"
            value={busca}
            onChangeText={pesquisar}
          />
          {/* Mostra um spinnerzinho ali no canto se estiver buscando */}
          {carregando && <ActivityIndicator size="small" color="#00ff88" style={{marginRight: 10}}/>}
      </View>
      
      {resultados.length > 0 && (
          <View style={styles.listaContainer}>
              <FlatList
                data={resultados}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.item} 
                    onPress={() => {
                        setResultados([]); 
                        setBusca(item.display_name); 
                        onSelecionar({ 
                            lat: item.lat, 
                            lon: item.lon, 
                            nome: item.display_name 
                        });
                    }}
                  >
                    <Text style={styles.textoItem}>{item.display_name}</Text>
                  </TouchableOpacity>
                )}
              />
          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 50, width: '90%', alignSelf: 'center', zIndex: 10 },
  inputBox: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
      borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: {width:0, height:2}
  },
  input: { flex: 1, padding: 15 },
  listaContainer: { backgroundColor: 'white', marginTop: 5, borderRadius: 8, elevation: 5, maxHeight: 200 },
  item: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  textoItem: { color: '#333' }
});