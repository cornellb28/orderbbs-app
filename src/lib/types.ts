export type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
};

export type EventProduct = {
  sort_order: number;
  is_active: boolean;
  products: Product;
};

export type EventWithRelations = {
  id: string;
  title: string;
  pickup_date: string;
  pickup_start: string;
  pickup_end: string;
  location_name: string;
  location_address: string;
  deadline: string;
  event_products: EventProduct[];
};

export type EventWithMenu = {
  id: string;
  title: string;
  pickup_date: string;
  pickup_start: string;
  pickup_end: string;
  location_name: string;
  location_address: string;
  deadline: string;
  menu: Product[];
};
