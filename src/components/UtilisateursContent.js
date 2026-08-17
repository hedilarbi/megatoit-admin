"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";
import { WarningIcon } from "@/assets/svgs";
import Image from "next/image";
import { getUsersPaginated } from "@/services/user.service";
import { MdBlock } from "react-icons/md";
import Pagination from "./Pagination";

const UtilisateursContent = () => {
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Server Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [cursors, setCursors] = useState({ 1: null });

  const fetchData = async (page = currentPage, pageSize = itemsPerPage) => {
    try {
      setLoading(true);
      setError(null);
      const cursorDoc = cursors[page] || null;

      const response = await getUsersPaginated({
        pageSize,
        cursorDoc,
        searchTerm,
      });

      if (response.success) {
        setUsers(response.users);
        setTotalCount(response.totalCount);

        if (response.lastDoc) {
          setCursors((prev) => ({ ...prev, [page + 1]: response.lastDoc }));
        }
      } else {
        setError(response.error || "Impossible de récupérer les utilisateurs.");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        "Une erreur s'est produite lors de la récupération des utilisateurs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setCursors({ 1: null });
    fetchData(1, itemsPerPage);
  }, [searchTerm, itemsPerPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchData(newPage, itemsPerPage);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const milliseconds =
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

    const date = new Date(milliseconds);

    const options = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    const formattedDate = date
      .toLocaleDateString("fr-FR", options)
      .replace(",", " à");
    return formattedDate;
  };

  if (loading && users.length === 0) {
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

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un utilisateur par nom ou email..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex items-center mb-4">
        <p className="text-gray-600">
          {totalCount} Utilisateur
          {totalCount > 1 ? "s" : ""} trouvé
          {totalCount > 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand text-black">
              <tr>
                <th className="px-6 py-3 text-sm font-medium">Nom et Prénom</th>
                <th className="px-6 py-3 text-sm font-medium">Email</th>
                <th className="px-6 py-3 text-sm font-medium">
                  Date d&apos;inscription
                </th>

                <th className="px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr className="text-center">
                  <td colSpan={4} className="px-6 py-4 text-gray-500">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-100 transition">
                    <td className="px-6 py-4 text-gray-700">{user.userName}</td>
                    <td className="px-6 py-4 text-gray-700">{user.email}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-6 py-4 flex space-x-5 items-center">
                      <button
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                        onClick={() => {
                          console.log("Block user:", user.uid);
                        }}
                      >
                        <MdBlock size={22} />
                      </button>
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

export default UtilisateursContent;
