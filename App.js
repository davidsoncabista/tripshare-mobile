import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Keyboard, ActivityIndicator, Vibration } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io } from "socket.io-client";
import axios from 'axios';

// Importa seu componente de busca
import BuscaEndereco from './components/BuscaEndereco'; 

// --- CONFIGURAÇÃO ---
// Se estiver no emulador Android, use 'http://10.0.2.2:3000'
// Se estiver no celular físico, use seu domínio HTTPS ou IP da rede
const API_URL = 'https://core.davidson.dev.br'; 
const PASSAGEIRO_ID_FIXO = 1; 
const MOTORISTA_ID_FIXO = 999; // ID fake para testar o aceite

export default function App() {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Onde vamos hoje?");
  const [rota, setRota] = useState([]); 
  const [dadosCorrida, setDadosCorrida] = useState(null);

  // Posição Inicial (Ver-o-Peso, Belém)
  const [origem] = useState({
    latitude: -1.455,
    longitude: -48.49,
  });

  const [destino, setDestino] = useState(null);

  // --- FUNÇÃO DO MOTORISTA: ACEITAR CORRIDA ---
  const aceitarCorrida = async (idCorrida) => {
    try {
        setLoading(true);
        console.log(`Tentando aceitar corrida #${idCorrida}...`);
        
        const response = await axios.post(`${API_URL}/api/aceitar-corrida`, {
            id_corrida: idCorrida,
            id_motorista: MOTORISTA_ID_FIXO
        });

        if (response.data.sucesso) {
            Vibration.cancel();
            Alert.alert("🎉 Sucesso!", "Você pegou a corrida! Dirija-se ao passageiro.");
            setStatus("🚘 Em rota (Corrida Aceita)");
            // Aqui você poderia mudar a tela para o modo navegação
        }
    } catch (error) {
        console.log(error);
        Alert.alert("Ops!", "Alguém pegou essa corrida antes de você.");
        Vibration.cancel();
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const socket = io(API_URL);

    socket.on("connect", () => {
        console.log("✅ Socket Conectado! ID:", socket.id);
        // Entra na sala de motoristas para poder ouvir os chamados
        socket.emit("entrar_como_motorista", { id_motorista: MOTORISTA_ID_FIXO });
    });

    // --- ESCUTAR NOVAS CORRIDAS (LADO DO MOTORISTA) ---
    socket.on("alerta_corrida", (dados) => {
        console.log("🚨 NOVA CORRIDA RECEBIDA:", dados);
        
        // 1. Vibrar o celular (Padrão: Vibra-Para-Vibra)
        Vibration.vibrate([500, 500, 500]);

        // 2. Converter o GeoJSON da rota para o formato do Mapa
        if (dados.geometria && dados.geometria.coordinates) {
            const pontos = dados.geometria.coordinates.map(coord => ({
                latitude: coord[1],
                longitude: coord[0]
            }));
            setRota(pontos);
        }

        // 3. Mostrar Alerta na Tela
        Alert.alert(
            "🔥 NOVA CORRIDA DISPONÍVEL!",
            `Ganhe: R$ ${parseFloat(dados.valor).toFixed(2)}\nDistância: ${dados.distancia}\nTempo: ${dados.tempo}`,
            [
                { 
                    text: "Rejeitar", 
                    style: "cancel", 
                    onPress: () => Vibration.cancel() 
                },
                { 
                    text: "ACEITAR AGORA", 
                    onPress: () => aceitarCorrida(dados.id_corrida) 
                }
            ]
        );
    });

    // Escutar atualizações de status (ex: quando alguém aceita)
    socket.on("status_corrida", (dados) => {
        if (dados.status === 'em_andamento') {
            setStatus(`Motorista a caminho! (ID: ${dados.id_motorista})`);
        }
    });

    return () => socket.disconnect();
  }, []);

  // --- FUNÇÃO DO PASSAGEIRO: PEDIR CORRIDA ---
  const lidarComSelecaoDestino = async (item) => {
    Keyboard.dismiss();
    setDestino({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
    setLoading(true);
    setStatus("Conectando ao satélite...");

    try {
      const response = await axios.post(`${API_URL}/api/solicitar-corrida`, {
        id_passageiro: PASSAGEIRO_ID_FIXO,
        origem: `${origem.longitude},${origem.latitude}`,
        destino: `${item.lon},${item.lat}`
      });

      const dados = response.data;

      if (dados.sucesso) {
        // Correção para garantir que o preço apareça
        const precoFinal = dados.valor || 0.00;
        
        setDadosCorrida({ ...dados, valor: precoFinal });
        setStatus(`Procurando motoristas...`);

        // Zoom no mapa
        if(mapRef.current) {
            mapRef.current.fitToCoordinates([origem, { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }], {
                edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
                animated: true,
            });
        }
      }
    } catch (error) {
      console.log("Erro:", error);
      Alert.alert("Erro", "Falha ao solicitar corrida.");
      setStatus("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      <MapView 
        ref={mapRef}
        style={styles.map} 
        initialRegion={{
          ...origem,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={origem} title="Você está aqui" pinColor="blue" />
        {destino && <Marker coordinate={destino} title="Destino" pinColor="red" />}
        
        {rota.length > 0 && (
          <Polyline coordinates={rota} strokeColor="#00ff88" strokeWidth={4} />
        )}
      </MapView>

      {!dadosCorrida && (
        <View style={styles.buscaContainer}>
            <BuscaEndereco onSelecionar={lidarComSelecaoDestino} />
        </View>
      )}

      {/* Card de Informação */}
      {dadosCorrida && (
        <View style={styles.cardInfo}>
            <Text style={styles.tituloInfo}>Solicitação Enviada</Text>
            <Text style={styles.preco}>R$ {parseFloat(dadosCorrida.valor).toFixed(2)}</Text>
            <Text style={styles.status}>{status}</Text>
            
            {status === 'Procurando motoristas...' && (
                <ActivityIndicator size="small" color="#00ff88" style={{marginTop: 10}} />
            )}
            
            <TouchableOpacity 
                style={styles.botaoCancelar} 
                onPress={() => { 
                    setDadosCorrida(null); 
                    setDestino(null); 
                    setRota([]); // Limpa a rota
                    setStatus("Onde vamos?"); 
                }}
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
    paddingTop: 40 // Ajuste para não ficar em cima da barra de status
  },
  cardInfo: {
    position: 'absolute', bottom: 30, width: '90%', alignSelf: 'center',
    backgroundColor: 'white', padding: 20, borderRadius: 15,
    elevation: 10, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.3,
    alignItems: 'center'
  },
  tituloInfo: { fontSize: 16, color: '#666' },
  preco: { fontSize: 32, fontWeight: 'bold', color: '#333', marginVertical: 5 },
  status: { color: '#00cc66', fontWeight: 'bold', textAlign: 'center' },
  botaoCancelar: {
    marginTop: 15, backgroundColor: '#ff4444', padding: 10, borderRadius: 8, width: '100%', alignItems: 'center'
  }
});