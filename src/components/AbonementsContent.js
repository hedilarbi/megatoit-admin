"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";
import { WarningIcon } from "@/assets/svgs";
import Image from "next/image";
import Link from "next/link";
import { getSubscriptionsPaginated } from "@/services/abonement.service";
import Pagination from "./Pagination";

const AbonementsContent = () => {
  const [abonnements, setAbonnements] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState(""); // yyyy-mm-dd
  const [searchTerm, setSearchTerm] = useState("");

  // Server Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [cursors, setCursors] = useState({ 1: null });

  const fetchData = async (page = currentPage, pageSize = itemsPerPage) => {
    try {
      setLoading(true);
      setError("");
      const cursorDoc = cursors[page] || null;

      const response = await getSubscriptionsPaginated({
        pageSize,
        cursorDoc,
        searchTerm,
        fromDate,
        toDate,
      });

      if (response.success) {
        setAbonnements(response.subscriptions);
        setTotalCount(response.totalCount);

        if (response.lastDoc) {
          setCursors((prev) => ({ ...prev, [page + 1]: response.lastDoc }));
        }
      } else {
        setError(response.error || "Impossible de récupérer les abonnements.");
      }
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      setError(
        "Une erreur s'est produite lors de la récupération des abonnements."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setCursors({ 1: null });
    fetchData(1, itemsPerPage);
  }, [searchTerm, fromDate, toDate, itemsPerPage]);

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

  const resetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    setCursors({ 1: null });
  };

  if (loading && abonnements.length === 0) {
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
            onClick={() => fetchData(1, itemsPerPage)}
            className="mt-4 px-4 py-2 bg-[#DD636E] text-white rounded-lg cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un abonnement par code ou par nom d'utilisateur..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
        />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2 items-center">
          <label htmlFor="fromDate">Date d&apos;achat de début</label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="toDate">Date d&apos;achat de fin</label>
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
        <p className=" text-gray-600">
          {totalCount} Abonnement
          {totalCount > 1 ? "s" : ""} trouvé
          {totalCount > 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand text-black">
              <tr>
                <th className="px-6 py-3 text-sm font-medium">Code</th>
                <th className="px-6 py-3 text-sm font-medium">Utilisateur</th>
                <th className="px-6 py-3 text-sm font-medium">Saison</th>

                <th className="px-6 py-3 text-sm font-medium">
                  Date d&apos;achat
                </th>

                <th className="px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {abonnements.length === 0 ? (
                <tr className="text-center">
                  <td colSpan={5} className="px-6 py-4 text-gray-500">
                    Aucun abonnement trouvé
                  </td>
                </tr>
              ) : (
                abonnements.map((abonement) => (
                  <tr key={abonement.id} className="hover:bg-gray-100 transition">
                    <td className="px-6 py-4 text-gray-700">{abonement?.code}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {abonement?.user?.userName}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {abonement?.abonnement?.title
                        ? `${abonement.abonnement.title} (${abonement.abonnement.season || ""})`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatDate(abonement?.createdAt)}
                    </td>

                    <td className="px-6 py-4 flex space-x-5 items-center ">
                      <Link
                        href={`/abonnements/${abonement?.code}`}
                        className="bg-black text-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2 hover:bg-gray-800 transition"
                      >
                        Plus de détails
                      </Link>
                      <Link
                        href={abonement?.downloadUrl || "#"}
                        className="bg-black text-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2 hover:bg-gray-800 transition"
                        target="_blank"
                      >
                        Voir la commande
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

export default AbonementsContent;
