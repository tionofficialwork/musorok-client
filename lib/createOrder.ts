import { supabase } from "./supabase";

export type PaymentMethod = "card" | "cash" | "sbp";

export type CreateOrderInput = {
  package_id: string;
  package_label: string;
  package_price: number;
  total: number;
  address: string;
  phone: string;
  entrance?: string;
  comment?: string;
  leave_at_door?: boolean;
  call_required?: boolean;
  payment_method: PaymentMethod;
};

export type CreateOrderResult = {
  id: string;
  status: string;
  package_id: string;
  package_label: string;
  package_price: number;
  total: number;
  address: string;
  phone: string;
  entrance?: string | null;
  comment?: string | null;
  leave_at_door?: boolean | null;
  call_required?: boolean | null;
  payment_method: PaymentMethod;
  created_at?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const {
    package_id,
    package_label,
    package_price,
    total,
    address,
    phone,
    entrance,
    comment,
    leave_at_door = false,
    call_required = false,
    payment_method,
  } = input;

  if (!package_id) {
    throw new Error("package_id is required");
  }

  if (!package_label) {
    throw new Error("package_label is required");
  }

  if (typeof package_price !== "number" || Number.isNaN(package_price)) {
    throw new Error("package_price is required");
  }

  if (typeof total !== "number" || Number.isNaN(total)) {
    throw new Error("total is required");
  }

  if (!address) {
    throw new Error("address is required");
  }

  if (!phone) {
    throw new Error("phone is required");
  }

  if (!payment_method) {
    throw new Error("payment_method is required");
  }

  const { data, error } = await supabase
    .from("orders")
    .insert([
      {
        package_id,
        package_label,
        package_price,
        total,
        address,
        phone,
        entrance: entrance || null,
        comment: comment || null,
        leave_at_door,
        call_required,
        payment_method,
        status: "new",
      },
    ])
    .select(
      "id, status, package_id, package_label, package_price, total, address, phone, entrance, comment, leave_at_door, call_required, payment_method, created_at"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Order was not created");
  }

  return data as CreateOrderResult;
}