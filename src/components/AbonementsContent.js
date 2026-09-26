"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";
import { WarningIcon } from "@/assets/svgs";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { getSubscriptionsPaginated } from "@/services/abonement.service";
import Pagination from "./Pagination";

const AbonementsContent = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ fullName: "", email: "" });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAbonnement = async (e) => {
    e.preventDefault();
    if (!createData.fullName || !createData.email) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    try {
      setIsCreating(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000"}/api/admin-create-free-abonnement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "my-super-secret-admin-key-2026",
        },
        body: JSON.stringify({ ...createData, adminId: user?.uid }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Billet de saison créé et envoyé avec succès !");
        setShowCreateModal(false);
        setCreateData({ fullName: "", email: "" });
        fetchData(1, itemsPerPage); // Actualiser la liste
      } else {
        toast.error(data.error || "Erreur lors de la création.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur de connexion au serveur.");
    } finally {
      setIsCreating(false);
    }
  };

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
        page,
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
      <div className="flex justify-between items-center mb-4 gap-4">
        <input
          type="text"
          placeholder="Rechercher un abonnement par code ou par nom d'utilisateur..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
        />
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand text-black font-semibold rounded-lg shadow-md hover:opacity-90 transition"
        >
          Créer un billet de saison
        </button>
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Créer un billet de saison</h2>
            <form onSubmit={handleCreateAbonnement}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={createData.fullName}
                  onChange={(e) => setCreateData({ ...createData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Adresse courriel</label>
                <input
                  type="email"
                  required
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="jean.dupont@example.com"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  disabled={isCreating}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-brand text-black font-semibold rounded-lg shadow-md hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {isCreating ? "Création..." : "Créer le billet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AbonementsContent;
