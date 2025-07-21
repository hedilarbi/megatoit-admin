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

export const getAllEmployees = async () => {
  try {
    const usersCollection = collection(db, "users");
    const employeesQuery = query(
      usersCollection,
      where("type", "==", "employee")
    );
    const employeesSnapshot = await getDocs(employeesQuery);
    const employees: UserData[] = [];
    employeesSnapshot.forEach((doc) => {
      employees.push({ ...doc.data(), uid: doc.id } as UserData);
    });
    return { success: true, data: employees };
  } catch (error) {
    console.error("Error fetching employees:", error);
    return { success: false, error: "Failed to fetch employees" };
  }
};

export const updateAccountStatus = async (
  uid: string,
  status: "actif" | "inactif"
) => {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { status }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating account status:", error);
    return { success: false, error: "Failed to update account status" };
  }
};
