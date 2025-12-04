import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, ActivityIndicator, Vibration, Dimensions, Image } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io } from "socket.io-client";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BuscaEndereco from '../components/BuscaEndereco';

const API_URL = 'https://core.davidson.dev.br';
const { width } = Dimensions.get('window');

// Recebe 'navigation' e 'route' automaticamente do React Navigation
export default function HomeScreen({ navigation, route }) {
  // Pegamos o usuario que veio do App.js via parametros ou storage
  const [usuario, setUsuario] = useState(route.params?.user || null); 
  const [socket, setSocket] = useState(null);
  
  const mapRef = useRef(null);
  const [status, setStatus] = useState("Conectando...");
  const [rota, setRota] = useState([]); 
  const [dadosCorrida, setDadosCorrida] = useState(null);
  const [origem] = useState({ latitude: -1.455, longitude: -48.49 });
  const [destino, setDestino] = useState(null);

  // Carrega usuário se não veio por parametro (Redundância)
  useEffect(() => {
      if(!usuario) {
          AsyncStorage.getItem('user_data').then(json => {
              if(json) {
                  const u = JSON.parse(json);
                  setUsuario(u);
                  conectarSocket(u);
              }
          });
      } else {
          conectarSocket(usuario);
      }
      
      // Cleanup ao sair da tela
      return () => { if(socket) socket.disconnect(); }
  }, []);

  const conectarSocket = (user) => {
    const novoSocket = io(API_URL);
    novoSocket.on("connect", () => {
      console.log(`✅ Socket conectado! User: ${user.nome}`);
      if (user.tipo === 'motorista') {
        novoSocket.emit("entrar_como_motorista", { id_motorista: user.id });
        setStatus("🟢 Online - Aguardando");
      } else {
        setStatus("Onde vamos hoje?");
      }
    });
    configurarEventos(novoSocket, user);
    setSocket(novoSocket);
  };

  const configurarEventos = (sock, user) => {
    if (user.tipo === 'motorista') {
        sock.on("alerta_corrida", (dados) => {
            Vibration.vibrate([500, 500, 500]);
            if (dados.geometria?.coordinates) {
                const pontos = dados.geometria.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
                setRota(pontos);
                if(mapRef.current) mapRef.current.fitToCoordinates(pontos, { edgePadding: { top: 50, right: 50, bottom: 250, left: 50 }, animated: true });
            }
            Alert.alert("🔥 NOVA CORRIDA!", `R$ ${parseFloat(dados.valor).toFixed(2)} - ${dados.distancia}`, [
                { text: "Ignorar", style: "cancel", onPress: () => Vibration.cancel() },
                { text: "ACEITAR", onPress: () => aceitarCorrida(dados, user) }
            ]);
        });
    }
    sock.on("status_corrida", (dados) => {
        if (dados.status === 'em_andamento' && user.tipo === 'passageiro') {
            setStatus(`Motorista a caminho!`);
            Alert.alert("Oba!", "Motorista aceitou!");
        }
        if (dados.status === 'finalizada') {
            Alert.alert("Viagem Finalizada", "Chegamos ao destino.");
            resetarEstado();
        }
    });
  };

  const aceitarCorrida = async (dadosDaOferta, user) => {
    try {
        const response = await axios.post(`${API_URL}/api/aceitar-corrida`, { id_corrida: dadosDaOferta.id_corrida, id_motorista: user.id });
        if (response.data.sucesso) {
            Vibration.cancel();
            setStatus("🚘 EM CORRIDA");
            setDadosCorrida({ ...dadosDaOferta, status: 'em_andamento' });
        }
    } catch (error) { Alert.alert("Erro", "Não foi possível aceitar."); }
  };

  const finalizarCorrida = async () => {
      try {
          await axios.post(`${API_URL}/api/finalizar-corrida`, { id_corrida: dadosCorrida.id_corrida });
          Alert.alert("Sucesso", "Corrida Finalizada!");
          resetarEstado();
      } catch (error) { Alert.alert("Erro", "Falha ao finalizar."); }
  };

  const solicitarCorrida = async (item) => {
    if (!usuario) return;
    setDestino({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
    try {
        const response = await axios.post(`${API_URL}/api/solicitar-corrida`, {
            id_passageiro: usuario.id,
            origem: `${origem.longitude},${origem.latitude}`,
            destino: `${item.lon},${item.lat}`
        });
        if (response.data.sucesso) {
            setDadosCorrida({ ...response.data, valor: response.data.valor || 0 });
            setStatus("Procurando motoristas...");
        }
    } catch (error) { Alert.alert("Erro", "Falha ao pedir."); }
  };

  const resetarEstado = () => {
      setDadosCorrida(null); setDestino(null); setRota([]);
      setStatus(usuario?.tipo === 'motorista' ? "🟢 Online" : "Onde vamos?");
  };

  const fazerLogout = async () => {
    await AsyncStorage.clear();
    if(socket) socket.disconnect();
    // Reseta a navegação e volta para o Login
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (!usuario) return <View style={styles.center}><ActivityIndicator size="large" color="#a388ee"/></View>;

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={{ ...origem, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        <Marker coordinate={origem} title="Você" anchor={{x:0.5, y:0.5}}>
            <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/1673/1673221.png'}} style={{width: 40, height: 40}} resizeMode="contain"/>
        </Marker>
        {destino && <Marker coordinate={destino} title="Destino" anchor={{x:0.5, y:1}}><Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/149/149059.png'}} style={{width: 40, height: 40}} resizeMode="contain"/></Marker>}
        {rota.length > 0 && <Polyline coordinates={rota} strokeColor="#00ff88" strokeWidth={5} />}
      </MapView>

      <View style={styles.header}>
          <View>
            <Text style={styles.headerText}>Olá, {usuario.nome}</Text>
            {/* NAVEGAÇÃO NATIVA AQUI 👇 */}
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={{color:'#a388ee', fontWeight:'bold'}}>📜 Histórico</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={fazerLogout}><Text style={{color:'red', fontWeight:'bold'}}>SAIR</Text></TouchableOpacity>
      </View>

      {!dadosCorrida && usuario.tipo === 'passageiro' && <View style={styles.buscaContainer}><BuscaEndereco onSelecionar={solicitarCorrida} /></View>}

      {dadosCorrida && (
        <View style={[styles.cardInfo, usuario.tipo === 'motorista' ? styles.cardMotorista : {}]}>
            <Text style={styles.tituloInfo}>{usuario.tipo === 'motorista' ? '🚘 CORRIDA ATIVA' : 'Solicitação Enviada'}</Text>
            <Text style={styles.preco}>R$ {parseFloat(dadosCorrida.valor).toFixed(2)}</Text>
            <Text style={styles.status}>{status}</Text>
            <TouchableOpacity style={[styles.botao, {backgroundColor: usuario.tipo === 'motorista' ? '#00cc66' : '#ff4444'}]} onPress={usuario.tipo === 'motorista' ? finalizarCorrida : resetarEstado}>
                <Text style={{color:'white', fontWeight:'bold', fontSize: 16}}>{usuario.tipo === 'motorista' ? 'FINALIZAR VIAGEM ✅' : 'CANCELAR ❌'}</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: '100%', height: '100%' },
  header: { position: 'absolute', top: 40, left: 20, right: 20, flexDirection:'row', justifyContent:'space-between', zIndex: 20, backgroundColor:'rgba(255,255,255,0.9)', padding:10, borderRadius:8, elevation:5 },
  headerText: { fontWeight:'bold', color:'#333' },
  buscaContainer: { position: 'absolute', top: 100, width: '100%', zIndex: 10 },
  cardInfo: { position: 'absolute', bottom: 30, width: width * 0.9, alignSelf: 'center', backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 20, alignItems: 'center', shadowColor: '#000', shadowOffset:{width:0, height:5}, shadowOpacity:0.3, shadowRadius:5 },
  cardMotorista: { backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#00ff88' },
  tituloInfo: { fontSize: 16, color: '#888', textTransform:'uppercase', letterSpacing:1, marginBottom: 5, fontWeight: 'bold' },
  preco: { fontSize: 42, fontWeight: 'bold', color: '#333', marginVertical: 5 },
  status: { color: '#a388ee', fontWeight: 'bold', fontSize:14, marginBottom: 10 },
  botao: { marginTop: 10, paddingVertical: 15, borderRadius: 10, width: '100%', alignItems: 'center', elevation: 3 },
});