export interface MatchData {
  oponent: object;
  type: string;
  category: string;
  date: Date;
  place: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  createdAt: Date;
}

export interface Match {
  id: string;
  oponent: object;
  type: string;
  category: string;
  date: Date;
  place: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  createdAt: Date;
}
