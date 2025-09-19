"use client";

import React, { useState, useEffect, useMemo } from "react";
import Spinner from "./spinner/Spinner";
import { WarningIcon } from "@/assets/svgs";
import Image from "next/image";
import Link from "next/link";
import { IoEyeSharp } from "react-icons/io5";
import { getOrdersWithDetails } from "@/services/order.service";

const DashboardContent = () => {
  const [ordersAll, setOrdersAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [type, setType] = useState("tous"); // "tous" | "matchs" | "abonnements"
  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState(""); // yyyy-mm-dd

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOrdersWithDetails();
      if (response) {
        setOrdersAll(response);
      } else {
        setError("Impossible de récupérer les commandes.");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(
        "Une erreur s'est produite lors de la récupération des commandes."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tsToDate = (ts) =>
    new Date(ts.seconds * 1000 + ts.nanoseconds / 1_000_000);

  // Combine TOUTES les conditions (recherche + type + dates)
  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    return ordersAll.filter((o) => {
      const code = (o.code || "").toLowerCase();
      const userName = (o.userDetails?.userName || "").toLowerCase();

      const matchesSearch =
        q === "" ? true : code.includes(q) || userName.includes(q);

      const isMatch = !!o.matchId;
      const matchesType =
        type === "tous" ? true : type === "matchs" ? isMatch : !isMatch;

      const d = tsToDate(o.createdAt);
      const matchesDate = (!from || d >= from) && (!to || d <= to);

      return matchesSearch && matchesType && matchesDate;
    });
  }, [ordersAll, searchTerm, type, fromDate, toDate]);

  const formatDate = (timestamp) => {
    const date = tsToDate(timestamp);
    const options = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return date.toLocaleDateString("fr-FR", options).replace(",", " à");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
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
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-[#DD636E] text-white rounded-lg cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const resetFilters = () => {
    setSearchTerm("");
    setType("tous");
    setFromDate("");
    setToDate("");
  };

  return (
    <>
      {/* Recherche + Type */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Rechercher par code ou utilisateur..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="tous">Tous</option>
          <option value="matchs">Billets</option>
          <option value="abonnements">Abonnements</option>
        </select>
      </div>

      {/* Dates + Reset */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2 items-center">
          <label htmlFor="fromDate">Date de début</label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="toDate">Date de fin</label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={resetFilters}
          className="px-4 py-2 bg-gray-300 text-black rounded-lg cursor-pointer"
        >
          Réinitialiser
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-lg h-[calc(100vh-220px)] overflow-scroll">
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
            {filteredOrders.length === 0 ? (
              <tr className="text-center">
                <td colSpan={6} className="px-6 py-4 text-gray-500">
                  Aucune commande trouvée
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.code} className="hover:bg-gray-100 transition">
                  <td className="px-6 py-4 text-gray-700">{order.code}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {order.matchId ? "Billets" : "Abonnement"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {order.userDetails?.userName || "-"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    $ {(order.amount / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 flex space-x-5 items-center">
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
