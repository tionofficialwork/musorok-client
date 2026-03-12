export type OrderStatus =
  | "new"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "done"
  | "cancelled";

export type PaymentMethod = "card" | "cash" | "sbp";

export type OrderRecord = {
  id: string;
  created_at: string;
  status: OrderStatus;
  address: string;
  package_id: string;
  package_label: string;
  package_price: number;
  apartment: string;
  entrance: string | null;
  comment: string | null;
  leave_at_door: boolean;
  phone: string;
  should_call: boolean;
  payment_method: PaymentMethod;
  tip: number;
  total: number;
};