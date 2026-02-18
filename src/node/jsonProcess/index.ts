import * as z from "zod";

const InputSchema = z.object({
  raw: z.string(),
});

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  metadata: {
    sku: string;
    weight: number;
    dimensions: { width: number; height: number; depth: number };
    manufacturer: string;
    inStock: boolean;
  };
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  items: { productId: string; quantity: number; unitPrice: number; total: number }[];
  shipping: { address: string; city: string; country: string; postalCode: string };
  status: string;
  createdAt: string;
}

interface Payload {
  products: Product[];
  orders: Order[];
  summary: { totalProducts: number; totalOrders: number; generatedAt: string };
}

function transformPayload(data: Payload): Payload {
  return {
    products: data.products.map((p) => ({
      ...p,
      name: p.name.toUpperCase(),
      price: p.price * 1.1,
      tags: p.tags.map((t) => t.toUpperCase()),
      metadata: {
        ...p.metadata,
        manufacturer: p.metadata.manufacturer.toUpperCase(),
      },
    })),
    orders: data.orders.map((o) => ({
      ...o,
      customerName: o.customerName.toUpperCase(),
      items: o.items.map((i) => ({
        ...i,
        total: i.quantity * i.unitPrice * 1.1,
      })),
      shipping: {
        ...o.shipping,
        city: o.shipping.city.toUpperCase(),
        country: o.shipping.country.toUpperCase(),
      },
    })),
    summary: {
      ...data.summary,
      generatedAt: new Date().toISOString(),
    },
  };
}

export const handler = async (
  event: unknown,
): Promise<{
  inputSize: number;
  outputSize: number;
  productsProcessed: number;
  ordersProcessed: number;
}> => {
  const { raw } = InputSchema.parse(event);

  const parsed: Payload = JSON.parse(raw);
  const transformed = transformPayload(parsed);
  const output = JSON.stringify(transformed);

  return {
    inputSize: raw.length,
    outputSize: output.length,
    productsProcessed: transformed.products.length,
    ordersProcessed: transformed.orders.length,
  };
};
