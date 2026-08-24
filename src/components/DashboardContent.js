"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";
import { WarningIcon } from "@/assets/svgs";
import Image from "next/image";
import Link from "next/link";
import { IoEyeSharp } from "react-icons/io5";
import { getOrdersPaginated } from "@/services/order.service";
import Pagination from "./Pagination";

const DashboardContent = () => {
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [type, setType] = useState("tous"); // "tous" | "matchs" | "abonnements"
  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState(""); // yyyy-mm-dd

  // Pagination Serveur
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [cursors, setCursors] = useState({ 1: null });

  const fetchData = async (page = currentPage, pageSize = itemsPerPage) => {
    try {
      setLoading(true);
      setError(null);
      const cursorDoc = cursors[page] || null;

      const response = await getOrdersPaginated({
        pageSize,
        cursorDoc,
        searchTerm,
        type,
        fromDate,
        toDate,
      });

      if (response.success) {
        setOrders(response.orders);
        setTotalCount(response.totalCount);

        if (response.lastDoc) {
          setCursors((prev) => ({ ...prev, [page + 1]: response.lastDoc }));
        }
      } else {
        setError(response.error || "Impossible de récupérer les commandes.");
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
    setCurrentPage(1);
    setCursors({ 1: null });
    fetchData(1, itemsPerPage);
  }, [searchTerm, type, fromDate, toDate, itemsPerPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchData(newPage, itemsPerPage);
  };

  const tsToDate = (ts) =>
    new Date(ts.seconds * 1000 + ts.nanoseconds / 1_000_000);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = tsToDate(timestamp);
    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(date.getDate())}/${pad(
      date.getMonth() + 1
    )}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  if (loading && orders.length === 0) {
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
            onClick={() => fetchData(1, itemsPerPage)}
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
    setCurrentPage(1);
    setCursors({ 1: null });
  };

  return (
    <>
      {/* Recherche + Type */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Rechercher par code ou utilisateur..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="toDate">Date de fin</label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <button
          onClick={resetFilters}
          className="px-4 py-2 bg-gray-300 text-black rounded-lg cursor-pointer"
        >
          Réinitialiser
        </button>
      </div>

      <div className="flex items-center mb-4">
        <div className="flex items-center">
          <p className=" text-gray-600">
            {totalCount} commande
            {totalCount > 1 ? "s" : ""} trouvée
            {totalCount > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand text-black">
              <tr>
                <th className="px-6 py-3 text-sm font-medium">Code</th>
                <th className="px-6 py-3 text-sm font-medium">Type</th>
                <th className="px-6 py-3 text-sm font-medium">Utilisateur</th>
                <th className="px-6 py-3 text-sm font-medium">
                  Nombre de billets/abonnements
                </th>
                <th className="px-6 py-3 text-sm font-medium">
                  Date de création
                </th>
                <th className="px-6 py-3 text-sm font-medium">Promotion</th>
                <th className="px-6 py-3 text-sm font-medium">Total</th>
                <th className="px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr className="text-center">
                  <td colSpan={8} className="px-6 py-4 text-gray-500">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.code || order.id} className="hover:bg-gray-100 transition">
                    <td className="px-6 py-4 text-gray-700">{order.code}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {order.matchId ? "Billets" : "Abonnement"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {order.userDetails?.userName || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {order.matchId
                        ? Array.isArray(order.tickets)
                          ? order.tickets.length
                          : order.quantity || 1
                        : order.quantity || order.subscriptionIds?.length || 1}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {order.promoCodeId
                        ? order.promotion?.type === "percent"
                          ? `${order.promotion?.percent}%`
                          : `$${order.promotion?.amount}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      $ {(order.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 flex space-x-5 items-center">
                      <Link
                        href={`/tableau-de-bord/commandes/${order.code}`}
                        className="text-black hover:text-gray-700 cursor-pointer"
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

        <Pagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
            setCursors({ 1: null });
          }}
        />
      </div>
    </>
  );
};

export default DashboardContent;
