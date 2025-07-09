import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    Alert.alert(
      "QR Code Scanned!",
      `Type: ${type}\nData: ${data}`,
      [
        { text: "OK", onPress: () => setScanned(false) },
        { text: "Process", onPress: () => processScannedData(data) }
      ]
    );
  };

  const processScannedData = (data: string) => {
    // Basic logic to differentiate between ticket and wallet address
    if (data.startsWith('ticket:')) {
      const ticketId = data.substring(7);
      Alert.alert("Ticket Scanned", `Ticket ID: ${ticketId}\n(Further processing for ticket details)`);
      // In a real app, you'd navigate to a ticket detail screen or validate the ticket
    } else if (data.startsWith('ethereum:') || data.startsWith('bitcoin:') || (data.length === 42 && data.startsWith('0x'))) {
      // Simple check for common crypto address patterns (e.g., Ethereum, Bitcoin)
      Alert.alert("Wallet Address Scanned", `Address: ${data}\n(Prepare to send tokens to this address)`);
      // In a real app, you'd navigate to a send token screen with the address pre-filled
    } else {
      Alert.alert("Unknown QR Code", `Content: ${data}\n(Could be a URL, text, etc.)`);
      // Handle other types of QR codes or just display the raw data
    }
    router.back(); // Go back after processing
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>Requesting for camera permission</Text>
      </SafeAreaView>
    );
  }
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>No access to camera</Text>
        <Button title={'Grant Permission'} onPress={() => BarCodeScanner.requestPermissionsAsync()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.scanTitle}>Scan QR Code</Text>
        </View>
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanInstruction}>Align QR code within the frame</Text>
        </View>
        {scanned && (
          <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Dark overlay for scanner UI
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  closeButton: {
    padding: 10,
  },
  scanTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 20,
  },
  scanFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#9E7FFF', // Primary color from palette for scan frame
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
});
