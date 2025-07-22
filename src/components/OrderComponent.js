"use client";
import { getOrderByCode } from "@/services/order.service";
import React, { useEffect } from "react";
import Spinner from "./spinner/Spinner";
import Image from "next/image";
import { WarningIcon } from "@/assets/svgs";

const OrderComponent = ({ code }) => {
  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await getOrderByCode(code);
      console.log("Response from getOrderByCode:", response);
      if (response) {
        setOrder(response);
      } else {
        setError("Order not found");
      }
    } catch (err) {
      setError("An error occurred while fetching the order.");
      console.error("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [code]);
  const formatDate = (timestamp) => {
    const milliseconds =
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

    const date = new Date(milliseconds);

    const options = {
      weekday: "long", // "Lundi"
      day: "numeric", // "24"
      month: "long", // "mars"
      year: "numeric", // "2025"
      hour: "2-digit", // "13"
      minute: "2-digit", // "00"
      hour12: false, // Use 24-hour format
    };

    const formattedDate = date
      .toLocaleDateString("fr-FR", options)
      .replace(",", " à"); // Replace comma with " à"
    return formattedDate;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)] ">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <div className="text-center mt-4 flex flex-col items-center">
          <Image
            src={WarningIcon}
            alt="Error"
            width={200}
            height={200}
            className="w-48 h-48"
          />
          <p className="text-gray-500">
            Oups, quelque chose s&apos;est mal passé
          </p>
          <button
            onClick={() => fetchOrder()}
            className="mt-4 px-4 py-2 bg-[#DD636E] text-white rounded-lg cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="h-[calc(100vh-100px)] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Détails de la commande</h2>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex ">
          <div className="flex-1">
            <p className="text-gray-700 mb-2">
              <strong>Code de la commande:</strong> {order.code}
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Date d&apos;achat :</strong> {formatDate(order.createdAt)}
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Total:</strong> ${(order.amount / 100).toFixed(2)}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-gray-700 mb-2">
              <strong>Type:</strong> {order.matchId ? "Match" : "Abonnement"}
            </p>
            {order.matchId && (
              <p className="text-gray-700 mb-2">
                <strong>Nombre de tickets:</strong> {order.tickets.length}
              </p>
            )}
          </div>
        </div>
      </div>
      {order.ticketsDetails && (
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">
            Détails{" "}
            {order.ticketsDetails.length > 1 ? "des tickets" : "du ticket"}
          </h2>
          {order.ticketsDetails.map((ticket) => (
            <div
              className="bg-white shadow-md rounded-lg p-6 mb-1"
              key={ticket.TicketCode}
            >
              <div className="flex ">
                <div className="flex-1">
                  <p className="text-gray-700 mb-2">
                    <strong>Ticket N:</strong> {ticket.TicketCode}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <strong>Achété le :</strong> {formatDate(ticket.createdAt)}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <strong>Prix (HT) :</strong> ${ticket.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 mb-2">
                    <strong>Match:</strong> Megatoit vs{" "}
                    {order.matchDetails.opponent.name}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <strong>Utilisation:</strong>{" "}
                    {ticket.isUsed ? "utilisé" : "non utilisé"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {order.matchDetails && (
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Détails du match</h2>
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex ">
              <div className="flex-1">
                <p className="text-gray-700 mb-2">
                  <strong>Match:</strong> Megatoit vs{" "}
                  {order.matchDetails.opponent.name}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Date du match :</strong>{" "}
                  {formatDate(order.matchDetails.date)}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-gray-700 mb-2">
                  <strong>Stade:</strong> {order.matchDetails.place}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {order.abonnementDetails && (
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">
            Détails de l&apos;abonnement
          </h2>
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex ">
              <div className="flex-1">
                <p className="text-gray-700 mb-2">
                  <strong>Titre:</strong> {order.abonnementDetails.title}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Prix (HT):</strong> $
                  {order.abonnementDetails.price.toFixed(2)}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-gray-700 mb-2">
                  <strong>Saison :</strong> {order.abonnementDetails.season}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <h2 className="text-2xl font-bold mb-4">
          Détails de l&apos;utilisateur
        </h2>
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex ">
            <div className="flex-1">
              <p className="text-gray-700 mb-2">
                <strong>Nom et prénom:</strong> {order.userDetails.userName}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-2">
                <strong>Email:</strong> {order.userDetails.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderComponent;
