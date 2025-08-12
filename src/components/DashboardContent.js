"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";

import Image from "next/image";
import Link from "next/link";

import { IoEyeSharp } from "react-icons/io5";

import { getOrdersWithDetails } from "@/services/order.service";
const DashboardContent = () => {
  const [orders, setOrders] = useState([]);
  const [ordersList, setOrdersList] = useState([]); // Unused state, can be removed if not needed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [type, setType] = useState("tous");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOrdersWithDetails();
      if (response) {
        setOrders(response);
        setOrdersList(response); // Assuming you want to keep this state for some reason
      } else {
        console.error("Failed to fetch matchs");
        setError(response.error ?? null);
      }
    } catch (error) {
      setError("Une erreur s'est produite lors de la récupération des matchs.");
      console.error("Error fetching matchs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    if (type === "tous") {
      const filteredOrders = ordersList.filter(
        (order) =>
          order.code.toLowerCase().includes(searchTerm) ||
          order.userDetails.userName.toLowerCase().includes(searchTerm)
      );
      setOrders(filteredOrders);
    }
    if (type === "matchs") {
      const filteredOrders = ordersList.filter(
        (order) =>
          (order.code.toLowerCase().includes(searchTerm) ||
            order.userDetails.userName.toLowerCase().includes(searchTerm)) &&
          order.matchId
      );
      setOrders(filteredOrders);
    }
    if (type === "abonnements") {
      const filteredOrders = ordersList.filter(
        (order) =>
          order.code.toLowerCase().includes(searchTerm) ||
          (order.userDetails.userName.toLowerCase().includes(searchTerm) &&
            !order.matchId)
      );
      setOrders(filteredOrders);
    }
  };
  useEffect(() => {
    fetchData(); // Fetch data when the component mounts
  }, []);
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
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-[#DD636E] text-white rounded-lg cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }
  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === "tous") {
      setOrders(ordersList);
    } else {
      const filteredOrders = ordersList.filter(
        (order) =>
          (newType === "matchs" && order.matchId) ||
          (newType === "abonnements" && !order.matchId)
      );
      setOrders(filteredOrders);
    }
  };
  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Rechercher un match..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={handleSearch}
        />
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="tous">Tous</option>
          <option value="matchs">Matchs</option>
          <option value="abonnements">Abonnements</option>
        </select>
      </div>

      <div className="bg-white shadow-lg rounded-lg  h-[calc(100vh-200px)]  overflow-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-sm font-medium">Code</th>
              <th className="px-6 py-3 text-sm font-medium">Type</th>
              <th className="px-6 py-3 text-sm font-medium">Utilisateur</th>
              <th className="px-6 py-3 text-sm font-medium">
                Date de création
              </th>
              <th className="px-6 py-3 text-sm font-medium">Total</th>

              <th className="px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {orders.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucune commande trouvé
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.code} className="hover:bg-gray-100 transition">
                  <td className="px-6 py-4 text-gray-700">{order.code}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {order.matchId ? "Match" : "Abonnement"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {order.userDetails?.userName}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    $ {(order.amount / 100).toFixed(2)}
                  </td>

                  <td className="px-6 py-4 flex space-x-5 items-center ">
                    <Link
                      href={`/tableau-de-bord/commandes/${order.code}`}
                      className="text-green-600 hover:text-green-800 cursor-pointer"
                    >
                      <IoEyeSharp size={22} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default DashboardContent;
