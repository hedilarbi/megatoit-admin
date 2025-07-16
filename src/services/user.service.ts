import { db } from "@/lib/firebase";

import { UserData } from "@/types/user";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  where,
  getDocs,
  query,
} from "firebase/firestore";

export const getUserDocument = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data() as Omit<UserData, "uid">;
    }
    return null;
  } catch (error) {
    console.error("Error getting user document:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const usersCollection = collection(db, "users");
    const clientsQuery = query(usersCollection, where("type", "==", "client"));
    const clientsSnapshot = await getDocs(clientsQuery);
    const clients: UserData[] = [];
    clientsSnapshot.forEach((doc) => {
      clients.push({ ...doc.data(), uid: doc.id } as UserData);
    });
    return { success: true, data: clients };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return { success: false, error: "Failed to fetch clients" };
  }
};
