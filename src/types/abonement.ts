export interface AbonementData {
  season: string;
  title: string;
  price: number;
  status: "active" | "inactive";
  createdAt: Date;
}

export interface Abonement {
  id: string;
  season: string;
  title: string;
  price: number;
  status: "active" | "inactive";
  createdAt: Date;
}
