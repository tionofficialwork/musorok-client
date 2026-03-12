import { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";

const PACKAGES = [
  {
    id: "small",
    name: "Маленький пакет",
    price: 99,
  },
  {
    id: "medium",
    name: "Средний пакет",
    price: 149,
  },
  {
    id: "large",
    name: "Большой пакет",
    price: 199,
  },
];

export default function PackageScreen() {
  const router = useRouter();

  const [selected, setSelected] = useState<string | null>(null);

  const selectedPackage = PACKAGES.find((p) => p.id === selected);

  const handleNext = () => {
    if (!selectedPackage) return;

    router.push({
      pathname: "/order/details",
      params: {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        price: String(selectedPackage.price),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Выберите пакет" }} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Выберите пакет</Text>

        {PACKAGES.map((item) => {
          const isSelected = selected === item.id;

          return (
            <Pressable
              key={item.id}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
              ]}
              onPress={() => setSelected(item.id)}
            >
              <Text style={styles.packageName}>{item.name}</Text>

              <Text style={styles.price}>{item.price} ₽</Text>
            </Pressable>
          );
        })}

        <Pressable
          style={[
            styles.button,
            !selected && styles.buttonDisabled,
          ]}
          disabled={!selected}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>Далее</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#031225",
  },
  container: {
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
  card: {
    backgroundColor: "#081426",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#0F2138",
  },
  cardSelected: {
    borderColor: "#22C55E",
  },
  packageName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  price: {
    color: "#9CA3AF",
    marginTop: 6,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#22C55E",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#04110A",
  },
});