import { supabase } from "./supabase";

type CreateOrderInput = {
  address: string;
  packageId: string;
  packageLabel: string;
  packagePrice: number;
  apartment: string;
  phone: string;
  comment?: string;
};

export async function createOrder(input: CreateOrderInput) {
  const payload = {
    status: "new",
    address: input.address,
    package_id: input.packageId,
    package_label: input.packageLabel,
    package_price: input.packagePrice,
    apartment: input.apartment,
    entrance: "",
    comment: input.comment ?? "",
    leave_at_door: false,
    phone: input.phone,
    should_call: true,
    payment_method: "card",
    tip: 0,
    total: input.packagePrice,
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}