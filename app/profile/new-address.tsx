import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getOwnerKey } from "../../lib/profileOwner";

export default function Screen() {
  const router = useRouter();

  const [street, setStreet] = useState("");

  const save = async () => {
    const owner = await getOwnerKey();

    await supabase.from("user_addresses").insert({
      owner_key: owner,
      label: "Дом",
      street,
    });

    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Stack.Screen options={{ title: "Новый адрес" }} />

      <Text>Улица</Text>

      <TextInput
        value={street}
        onChangeText={setStreet}
        placeholder="ул. Ленина 10"
        style={{
          borderWidth: 1,
          padding: 12,
          marginVertical: 10,
        }}
      />

      <Pressable
        onPress={save}
        style={{ backgroundColor: "#E9281D", padding: 16 }}
      >
        <Text style={{ color: "#fff" }}>Сохранить</Text>
      </Pressable>
    </SafeAreaView>
  );
}