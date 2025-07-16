export type UserType = "admin" | "employee" | "client";

export interface UserData {
  uid: string;
  email: string;
  type: UserType;
  userName: string;
  createdAt: Date;
}

export interface User {
  uid: string;
}
