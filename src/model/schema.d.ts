declare interface SchemaUser {
  _id: number;
  name: string;
  balance: number;
  img: string;
  updated: number;
  created: number;
}

declare interface SchemaGame {
  _id: number;
  minBetAmount: number;
  maxBetAmount: number;
}

declare interface SchemaHistory {
  _id: number;
  name: string;
  betAmount: number;
  cashoutAt: number;
  cashouted: boolean;
  date: number;
}
