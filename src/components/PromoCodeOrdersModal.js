"use client";
import { getOrdersByPromoCode } from "@/services/order.service";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { IoClose } from "react-icons/io5";
import Spinner from "./spinner/Spinner";

const formatOrderDate = (timestamp) => {
  const dateObj =
    timestamp?.toDate && typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : timestamp?.seconds
        ? new Date(timestamp.seconds * 1000)
        : null;

  if (!dateObj || Number.isNaN(dateObj.getTime())) return "-";

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
};

// Order amounts are stored in cents
const formatMoney = (cents) => {
  const amount = Number(cents) / 100;
  return `$${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
};

const getQuantity = (order) =>
  order.quantity || order.tickets?.length || order.subscriptionIds?.length || 1;

const PromoCodeOrdersModal = ({ promoCode, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    const response = await getOrdersByPromoCode(promoCode.id);
    if (response.success) {
      setOrders(response.data);
    } else {
      setError(response.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [promoCode.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const totalTickets = orders.reduce((sum, o) => sum + getQuantity(o), 0);
  const totalAmount = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Commandes avec le code {promoCode.code}
            </h2>
            {!loading && !error && (
              <p className="text-sm text-gray-500 mt-1">
                {orders.length} commande{orders.length > 1 ? "s" : ""} ·{" "}
                {totalTickets} billet{totalTickets > 1 ? "s" : ""} ·{" "}
                {formatMoney(totalAmount)}
              </p>
            )}
          </div>
          <button
            className="text-gray-500 hover:text-gray-800 cursor-pointer"
            onClick={onClose}
            aria-label="Fermer"
          >
            <IoClose size={26} />
          </button>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-16">
              <p className="text-gray-500">{error}</p>
              <button
                onClick={fetchOrders}
                className="mt-4 px-4 py-2 bg-[#DD636E] text-white rounded-lg cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-brand text-black sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium">Code commande</th>
                  <th className="px-6 py-3 text-sm font-medium">Date</th>
                  <th className="px-6 py-3 text-sm font-medium">Nbr de billets</th>
                  <th className="px-6 py-3 text-sm font-medium">Montant</th>
                  <th className="px-6 py-3 text-sm font-medium">Client</th>
                  <th className="px-6 py-3 text-sm font-medium">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr className="text-center">
                    <td colSpan={6} className="px-6 py-4 text-gray-500">
                      Aucune commande n&apos;a utilisé ce code promo
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-100 transition">
                      <td className="px-6 py-4 text-gray-700">
                        <Link
                          href={`/tableau-de-bord/commandes/${order.code}`}
                          className="underline hover:text-black"
                        >
                          {order.code}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {formatOrderDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {getQuantity(order)}
                        {order.abonnementId && (
                          <span className="text-gray-500"> (abonnement)</span>
                        )}
                        {order.freeTickets?.length > 0 && (
                          <span className="text-gray-500">
                            {" "}
                            +{order.freeTickets.length} gratuit
                            {order.freeTickets.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {formatMoney(order.amount)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {order.userDetails?.userName || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {order.userDetails?.email || "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromoCodeOrdersModal;
