import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import {
  ChevronLeft,
  ChevronRight,
  Ticket,
  AlertCircle,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface TicketProps {
  id: string;
  eventName: string;
  date: string;
  location: string;
  accessLevel: string;
  earnedTokens: number;
  qrCode: string;
  image?: string;
}

interface DigitalTicketWalletProps {
  tickets?: TicketProps[];
  onTicketSelect?: (ticket: TicketProps) => void;
}

const DigitalTicketWallet = ({
  tickets = [
    {
      id: "1",
      eventName: "Summer Music Festival",
      date: "June 15, 2023 - 2:00 PM",
      location: "Central Park, New York",
      accessLevel: "VIP",
      earnedTokens: 50,
      qrCode:
        "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket-id-123456",
      image:
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&q=80",
    },
    {
      id: "2",
      eventName: "Tech Conference 2023",
      date: "July 10, 2023 - 9:00 AM",
      location: "Convention Center, San Francisco",
      accessLevel: "FIRST ROW",
      earnedTokens: 100,
      qrCode:
        "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket-id-789012",
      image:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&q=80",
    },
    {
      id: "3",
      eventName: "Art Exhibition",
      date: "August 5, 2023 - 11:00 AM",
      location: "Modern Art Museum, Chicago",
      accessLevel: "FULL ACCESS",
      earnedTokens: 200,
      qrCode:
        "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket-id-345678",
      image:
        "https://images.unsplash.com/photo-1501084817091-a4f3d1d19e07?w=500&q=80",
    },
  ],
  onTicketSelect = () => {},
}: DigitalTicketWalletProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);

  const qrScale = useSharedValue(1);

  const qrAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: qrScale.value }],
    };
  });

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < tickets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const toggleQRCode = (qrCode: string) => {
    if (expandedQR === qrCode) {
      qrScale.value = withSpring(1);
      setTimeout(() => setExpandedQR(null), 300);
    } else {
      setExpandedQR(qrCode);
      qrScale.value = withSpring(1.5);
    }
  };

  if (tickets.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-gray-100">
        <View className="bg-white rounded-xl p-8 items-center shadow-md w-full">
          <Ticket size={64} color="#6366f1" />
          <Text className="text-2xl font-bold mt-4 text-center">
            No Tickets Yet
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Your purchased tickets will appear here. Explore events to get
            started!
          </Text>
          <TouchableOpacity
            className="mt-6 bg-indigo-600 py-3 px-6 rounded-full"
            onPress={() => {}}
          >
            <Text className="text-white font-semibold">Discover Events</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentTicket = tickets[currentIndex];

  return (
    <View className="flex-1 bg-gray-100 p-4">
 
      {/* Ticket Card */}
      <View className="bg-white rounded-xl overflow-hidden shadow-lg mb-4">
        {currentTicket.image && (
          <Image
            source={{ uri: currentTicket.image }}
            className="w-full h-40"
            contentFit="cover"
          />
        )}

        <View className="p-4">
          <Text className="text-xl font-bold">{currentTicket.eventName}</Text>
          <View className="flex-row items-center mt-2">
            <Text className="text-gray-600">{currentTicket.date}</Text>
          </View>
          <Text className="text-gray-600 mt-1">{currentTicket.location}</Text>

          <View className="flex-row justify-between items-center mt-4">
            <View className="bg-indigo-100 px-3 py-1 rounded-full">
              <Text className="text-indigo-800 font-medium">
                {currentTicket.accessLevel}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-amber-600 font-bold mr-1">
                {currentTicket.earnedTokens}
              </Text>
              <Text className="text-gray-600">TOKENS EARNED</Text>
            </View>
          </View>

          <TouchableOpacity
            className="mt-4 items-center"
            onPress={() => toggleQRCode(currentTicket.qrCode)}
          >
            <Animated.View
              style={[
                expandedQR === currentTicket.qrCode ? qrAnimatedStyle : {},
              ]}
            >
              <Image
                source={{ uri: currentTicket.qrCode }}
                className="w-32 h-32"
                contentFit="contain"
              />
            </Animated.View>
            <Text className="text-gray-500 mt-2">
              {expandedQR === currentTicket.qrCode
                ? "Tap to minimize"
                : "Tap to enlarge"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Controls */}
      <View className="flex-row justify-between items-center mt-2">
        <TouchableOpacity
          className={`p-2 rounded-full ${currentIndex === 0 ? "bg-gray-200" : "bg-indigo-500"}`}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft
            size={24}
            color={currentIndex === 0 ? "#9ca3af" : "white"}
          />
        </TouchableOpacity>

        <Text className="text-gray-600">
          {currentIndex + 1} of {tickets.length}
        </Text>

        <TouchableOpacity
          className={`p-2 rounded-full ${currentIndex === tickets.length - 1 ? "bg-gray-200" : "bg-indigo-500"}`}
          onPress={handleNext}
          disabled={currentIndex === tickets.length - 1}
        >
          <ChevronRight
            size={24}
            color={currentIndex === tickets.length - 1 ? "#9ca3af" : "white"}
          />
        </TouchableOpacity>
      </View>

      {/* Ticket Thumbnails */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-4"
      >
        {tickets.map((ticket, index) => (
          <TouchableOpacity
            key={ticket.id}
            onPress={() => setCurrentIndex(index)}
            className={`mr-3 rounded-lg overflow-hidden border-2 ${index === currentIndex ? "border-indigo-500" : "border-transparent"}`}
          >
            <Image
              source={{
                uri:
                  ticket.image ||
                  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200&q=70",
              }}
              className="w-16 h-16"
              contentFit="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="mt-4 bg-amber-50 p-3 rounded-lg flex-row items-center">
        <AlertCircle size={20} color="#d97706" />
        <Text className="ml-2 text-amber-700">
          Present this QR code at the event entrance for verification
        </Text>
      </View>
    </View>
  );
};

export default DigitalTicketWallet;
