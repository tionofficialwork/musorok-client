import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

type CreateOrderInput = {
  package_id: string;
  package_name?: string;
  package_label?: string;
  total_price: number;
  address: string;
  apartment?: string;
  entrance?: string;
  comment?: string;
  leave_at_door?: boolean;
  call_required?: boolean;
};

type CreatedOrder = {
  id: string;
  status?: string | null;
  address?: string | null;
  apartment?: string | null;
  entrance?: string | null;
  comment?: string | null;
  package_id?: string | null;
  package_name?: string | null;
  total_price?: number | null;
  leave_at_door?: boolean | null;
  call_required?: boolean | null;
  created_at?: string | null;
};

const ACTIVE_ORDER_STORAGE_KEY = "activeOrder";

export async function createOrder(
  input: CreateOrderInput
): Promise<CreatedOrder> {
  const packageName = (input.package_name ?? input.package_label ?? "").trim();
  const totalPrice = Number(input.total_price);
  const callRequired = Boolean(input.call_required);

  if (!input.package_id?.trim()) {
    throw new Error("package_id is required");
  }

  if (!packageName) {
    throw new Error("package_name is required");
  }

  if (!Number.isFinite(totalPrice)) {
    throw new Error("total_price is required");
  }

  if (!input.address?.trim()) {
    throw new Error("address is required");
  }

  const payload = {
    package_id: input.package_id.trim(),
    package_label: packageName,
    package_price: totalPrice,
    total: totalPrice,
    address: input.address.trim(),
    apartment: input.apartment?.trim() || null,
    entrance: input.entrance?.trim() || null,
    comment: input.comment?.trim() || null,
    leave_at_door: Boolean(input.leave_at_door),
    should_call: callRequired,
    call_required: callRequired,
    payment_method: "cash",
    tip: 0,
    status: "new",
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select(
      "id, status, address, apartment, entrance, comment, package_id, package_name:package_label, total_price:total, leave_at_door, call_required, created_at"
    )
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Order was not created");
  }

  await AsyncStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(data));

  return data as CreatedOrder;
}