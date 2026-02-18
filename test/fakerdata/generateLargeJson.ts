import { faker } from "@faker-js/faker";

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
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  shipping: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
  };
  status: string;
  createdAt: string;
}

interface LargeJsonPayload {
  products: Product[];
  orders: Order[];
  summary: {
    totalProducts: number;
    totalOrders: number;
    generatedAt: string;
  };
}

function generateProduct(): Product {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price()),
    category: faker.commerce.department(),
    tags: faker.helpers.arrayElements(
      ["sale", "new", "popular", "limited", "exclusive", "seasonal"],
      { min: 1, max: 4 },
    ),
    metadata: {
      sku: faker.string.alphanumeric(10).toUpperCase(),
      weight: faker.number.float({ min: 0.1, max: 50, fractionDigits: 2 }),
      dimensions: {
        width: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
        height: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
        depth: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      },
      manufacturer: faker.company.name(),
      inStock: faker.datatype.boolean(),
    },
  };
}

function generateOrder(): Order {
  const items = Array.from(
    { length: faker.number.int({ min: 1, max: 5 }) },
    () => {
      const quantity = faker.number.int({ min: 1, max: 10 });
      const unitPrice = parseFloat(faker.commerce.price());
      return {
        productId: faker.string.uuid(),
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    },
  );

  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    customerName: faker.person.fullName(),
    email: faker.internet.email(),
    items,
    shipping: {
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      country: faker.location.country(),
      postalCode: faker.location.zipCode(),
    },
    status: faker.helpers.arrayElement([
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]),
    createdAt: faker.date.recent().toISOString(),
  };
}

// Generate until we hit ~1MB
const products: Product[] = [];
const orders: Order[] = [];

// Roughly: 500 products + 1000 orders ≈ 1MB
for (let i = 0; i < 500; i++) {
  products.push(generateProduct());
}
for (let i = 0; i < 1000; i++) {
  orders.push(generateOrder());
}

const payload: LargeJsonPayload = {
  products,
  orders,
  summary: {
    totalProducts: products.length,
    totalOrders: orders.length,
    generatedAt: new Date().toISOString(),
  },
};

const json = JSON.stringify(payload, null, 2);
console.log(`Generated JSON size: ${(json.length / 1024 / 1024).toFixed(2)} MB`);

await Bun.write("test/fakerdata/largeJson.json", json);
console.log("Written to test/fakerdata/largeJson.json");
