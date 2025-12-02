import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Keyboard, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io } from "socket.io-client";
import axios from 'axios';

// Importa seu componente novo
import BuscaEndereco from './components/BuscaEndereco'; 

// --- CONFIGURAÇÃO ---
const API_URL = 'https://core.davidson.dev.br'; // Seu Gateway
const PASSAGEIRO_ID_FIXO = 1; // Por enquanto fixo, depois vem do Login

export default function App() {
  const mapRef = useRef(null); // Para controlar o zoom do mapa
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Onde vamos hoje?");
  const [rota, setRota] = useState([]); 
  const [dadosCorrida, setDadosCorrida] = useState(null);

  // Posição Inicial (Fixo no Ver-o-Peso para teste, depois usaremos GPS real)
  const [origem] = useState({
    latitude: -1.455,
    longitude: -48.49,
  });

  const [destino, setDestino] = useState(null);

  useEffect(() => {
    // Conecta no Socket para ouvir atualizações (ex: Motoboy aceitou)
    const socket = io(API_URL);
    socket.on("connect", () => console.log("Socket conectado"));
    return () => socket.disconnect();
  }, []);

  // Função chamada quando o usuário escolhe um endereço na lista
  const lidarComSelecaoDestino = async (item) => {
    Keyboard.dismiss(); // Esconde o teclado
    setDestino({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
    setLoading(true);
    setStatus("Calculando rota...");

    try {
      // Chama sua API Backend
      const response = await axios.post(`${API_URL}/api/solicitar-corrida`, {
        id_passageiro: PASSAGEIRO_ID_FIXO,
        origem: `${origem.longitude},${origem.latitude}`, // OSRM usa Lon,Lat
        destino: `${item.lon},${item.lat}`
      });

      const dados = response.data; // Resposta da API

      if (dados.sucesso) {
        setDadosCorrida(dados); // Guarda preço e info
        setStatus(`Aguardando Motoboy...`);

        // Desenha a rota se o backend mandou a geometria
        // A API manda via Socket, mas vamos adaptar para pegar do response HTTP no futuro
        // Por enquanto, vamos desenhar uma linha reta ou esperar o socket desenhar
        // (Nota: Para desenhar a linha exata aqui, precisamos que a API devolva a geometria no POST tbm,
        //  hoje ela devolve no socket 'alerta_corrida'. Vamos simplificar e focar no pedido).
        
        Alert.alert("Sucesso!", `Corrida solicitada!\nValor: R$ ${dados.valor}`);
        
        // Ajusta o zoom do mapa para mostrar origem e destino
        if(mapRef.current) {
            mapRef.current.fitToCoordinates([origem, { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }], {
                edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Falha ao solicitar corrida.");
      setStatus("Tente novamente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* O Mapa fica no fundo */}
      <MapView 
        ref={mapRef}
        style={styles.map} 
        initialRegion={{
          ...origem,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Marcador da Origem (Passageiro) */}
        <Marker coordinate={origem} title="Você está aqui" pinColor="blue" />

        {/* Marcador do Destino (Se tiver escolhido) */}
        {destino && <Marker coordinate={destino} title="Destino" pinColor="red" />}

        {/* Linha da Rota (Se tiver) */}
        {rota.length > 0 && (
          <Polyline coordinates={rota} strokeColor="#00ff88" strokeWidth={4} />
        )}
      </MapView>

      {/* Componente de Busca Flutuante */}
      {!dadosCorrida && (
        <View style={styles.buscaContainer}>
            <BuscaEndereco onSelecionar={lidarComSelecaoDestino} />
        </View>
      )}

      {/* Card de Status/Preço (Aparece só depois de pedir) */}
      {dadosCorrida && (
        <View style={styles.cardInfo}>
            <Text style={styles.tituloInfo}>Solicitação Enviada</Text>
            <Text style={styles.preco}>R$ {dadosCorrida.valor}</Text>
            <Text style={styles.status}>{status}</Text>
            <ActivityIndicator size="small" color="#00ff88" style={{marginTop: 10}} />
            
            <TouchableOpacity 
                style={styles.botaoCancelar} 
                onPress={() => { setDadosCorrida(null); setDestino(null); setStatus("Onde vamos?"); }}
            >
                <Text style={{color:'white'}}>Cancelar / Nova Busca</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  buscaContainer: {
    position: 'absolute', top: 0, width: '100%', zIndex: 10,
    paddingTop: 10 // Espaço para barra de status
  },
  cardInfo: {
    position: 'absolute', bottom: 30, width: '90%', alignSelf: 'center',
    backgroundColor: 'white', padding: 20, borderRadius: 15,
    elevation: 10, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.3,
    alignItems: 'center'
  },
  tituloInfo: { fontSize: 16, color: '#666' },
  preco: { fontSize: 32, fontWeight: 'bold', color: '#333', marginVertical: 5 },
  status: { color: '#00cc66', fontWeight: 'bold' },
  botaoCancelar: {
    marginTop: 15, backgroundColor: '#ff4444', padding: 10, borderRadius: 8, width: '100%', alignItems: 'center'
  }
});