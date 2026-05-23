import { getApiUrl, uploadForm } from "./api";

export type OrderPhotoKind = "client_before" | "courier_after";

export type OrderPhoto = {
  id: string;
  order_id: string;
  kind: OrderPhotoKind;
  content_type: string;
  byte_size: number;
  uploaded_by: string;
  created_at: string | null;
};

function getFileName(uri: string, kind: OrderPhotoKind) {
  const lastPart = uri.split("/").pop()?.split("?")[0];

  return lastPart && lastPart.includes(".") ? lastPart : `${kind}.jpg`;
}

function getMimeType(uri: string) {
  const lower = uri.toLowerCase();

  if (lower.endsWith(".png")) {
    return "image/png";
  }

  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

export async function uploadOrderPhoto(
  orderId: string,
  kind: OrderPhotoKind,
  uri: string
) {
  const formData = new FormData();

  formData.append("kind", kind);
  formData.append("photo", {
    uri,
    name: getFileName(uri, kind),
    type: getMimeType(uri),
  } as any);

  return uploadForm<{ photo: OrderPhoto }>(
    `/orders/${encodeURIComponent(orderId)}/photos`,
    formData
  );
}

export function getOrderPhotoFileUrl(orderId: string, photoId: string) {
  return getApiUrl(
    `/orders/${encodeURIComponent(orderId)}/photos/${encodeURIComponent(
      photoId
    )}/file`
  );
}
