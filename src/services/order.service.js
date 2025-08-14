import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";

const db = getFirestore();

export const getOrdersWithDetails = async () => {
  const ordersCollection = collection(db, "orders");
  const ordersQuery = query(ordersCollection, orderBy("createdAt", "desc"));
  const ordersSnapshot = await getDocs(ordersQuery);
  const orders = [];

  for (const orderDoc of ordersSnapshot.docs) {
    const orderData = orderDoc.data();

    // Populate user details if userId exists
    if (orderData.userId) {
      const userDocRef = doc(db, "users", orderData.userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        orderData.userDetails = userDoc.data();
      }
    }

    orders.push(orderData);
  }

  return orders;
};

export const getOrderByCode = async (code) => {
  const ordersCollection = collection(db, "orders");
  const ordersSnapshot = await getDocs(ordersCollection);
  const order = ordersSnapshot.docs.find((doc) => doc.data().code === code);

  if (order) {
    const orderData = order.data();

    // Populate user details if userId exists
    if (orderData.userId) {
      const userDocRef = doc(db, "users", orderData.userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        orderData.userDetails = userDoc.data();
      }
    }

    // Populate tickets if tickets array exists
    if (orderData.tickets && Array.isArray(orderData.tickets)) {
      const tickets = [];
      for (const ticketId of orderData.tickets) {
        const ticketDocRef = doc(db, "tickets", ticketId);
        const ticketDoc = await getDoc(ticketDocRef);
        if (ticketDoc.exists()) {
          tickets.push(ticketDoc.data());
        }
      }
      orderData.ticketsDetails = tickets;
    }

    // Populate match details if matchId exists
    if (orderData.matchId) {
      const matchDocRef = doc(db, "matchs", orderData.matchId);
      const matchDoc = await getDoc(matchDocRef);
      if (matchDoc.exists()) {
        orderData.matchDetails = matchDoc.data();
      }
    }

    // Populate abonnement details if abonnementId exists
    if (orderData.abonnementId) {
      const abonnementDocRef = doc(db, "abonements", orderData.abonnementId);
      const abonnementDoc = await getDoc(abonnementDocRef);
      if (abonnementDoc.exists()) {
        orderData.abonnementDetails = abonnementDoc.data();
      }
    }

    // Populate subscription details if subscriptionId exists
    if (orderData.subscriptionId) {
      const subscriptionDocRef = doc(
        db,
        "subscriptions",
        orderData.subscriptionId
      );
      const subscriptionDoc = await getDoc(subscriptionDocRef);
      if (subscriptionDoc.exists()) {
        orderData.subscriptionDetails = subscriptionDoc.data();
      }
    }

    return orderData;
  }

  return null;
};
