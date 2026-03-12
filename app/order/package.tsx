import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { prices } from "../../lib/constants";

export default function OrderPackageScreen() {
  const handleSelectPackage = (packageId: string, packageLabel: string) => {
    router.push({
      pathname: "/order/details",
      params: {
        packageId,
        packageLabel,
      },
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.step}>Шаг 1 из 4</Text>
      <Text style={styles.title}>Выберите пакет</Text>
      <Text style={styles.subtitle}>
        Это первый каркас экрана заказа. Позже сюда добавим адрес, карту и
        полноценную логику выбора.
      </Text>

      <View style={styles.list}>
        {prices.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => handleSelectPackage(item.id, item.desc)}
          >
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDesc}>Подходит для обычного выноса</Text>
            </View>

            <Text style={styles.cardPrice}>{item.price} ₽</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Назад</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0e0f10",
  },
  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 32,
  },
  step: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#86efac",
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#9ca3af",
  },
  list: {
    marginTop: 24,
    gap: 12,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#17181a",
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  cardDesc: {
    marginTop: 6,
    fontSize: 14,
    color: "#9ca3af",
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  secondaryButton: {
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});