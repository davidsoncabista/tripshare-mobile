import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io } from "socket.io-client";
import { StyleSheet, Text, View, Alert, Dimensions, Vibration } from 'react-native';

// --- CONFIGURAÇÃO ---
// Conecta no seu servidor (Gateway/Nginx)
const SOCKET_URL = 'https://core.davidson.dev.br'; 

export default function App() {
  const [mensagem, setMensagem] = useState("Conectando...");
  const [rota, setRota] = useState([]); // Guarda a linha para desenhar
  
  // Posição inicial: Ver-o-Peso, Belém
  const belemRegion = {
    latitude: -1.455,
    longitude: -48.49,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("✅ Conectado ao servidor!");
      setMensagem("🟢 Online - Aguardando Corridas...");
      // Avisa que é um motorista
      socket.emit("entrar_como_motorista", { id_motorista: 999 });
    });

    socket.on("alerta_corrida", (dados) => {
      console.log("🚨 NOVA CORRIDA!", dados);
      
      // Vibra 1s, para 1s, vibra 1s (3 vezes) - Para chamar atenção mesmo!
      const padraoVibracao = [1000, 1000, 1000]; 
      Vibration.vibrate(padraoVibracao);

      // Toca um Alerta na tela
      Alert.alert(
        "🔥 NOVA CORRIDA!",
        `Ganhe: R$ ${dados.valor}\nDistância: ${dados.distancia}\nTempo: ${dados.tempo}`,
        [
          { text: "Recusar", style: "cancel" },
          { text: "ACEITAR CORRIDA", onPress: () => console.log("Aceitou!") }
        ]
      );

      // Se o backend mandou a geometria (linha), vamos desenhar!
      if (dados.geometria && dados.geometria.coordinates) {
        // O Leaflet usa [Lon, Lat], o Google Maps/Expo usa {latitude, longitude}
        // Precisamos converter se vier direto do OSRM GeoJSON
        const pontos = dados.geometria.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        setRota(pontos);
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={belemRegion}>
        {/* Se tiver rota, desenha a linha verde neon */}
        {rota.length > 0 && (
          <Polyline 
            coordinates={rota}
            strokeColor="#00ff88" // Verde Neon
            strokeWidth={4}
          />
        )}
      </MapView>
      
      <View style={styles.painel}>
        <Text style={styles.textoPainel}>{mensagem}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  painel: {
    position: 'absolute', top: 50, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 20,
    borderWidth: 1, borderColor: '#00ff88'
  },
  textoPainel: { color: 'white', fontWeight: 'bold' }
});