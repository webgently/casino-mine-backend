declare interface SchemaUser {
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
  user_id: string;
  betAmount: number;
  profitAmount: number;
  date: number;
}
