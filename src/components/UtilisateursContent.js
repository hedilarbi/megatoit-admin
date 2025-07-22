"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";

import Image from "next/image";

import { getAllUsers } from "@/services/user.service";
import { MdBlock } from "react-icons/md";
const UtilisateursContent = () => {
  const [users, setUsers] = useState([]);
  const [usersList, setUsersList] = useState([]); // Unused state, can be removed if not needed
  const [loading, setLoading] = useState(true);
  const [error, setError] = (useState < string) | (null > null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.data ?? []);
        setUsersList(response.data ?? []); // Assuming you want to keep this state for some reason
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
    const filteredMatchs = usersList.filter((user) =>
      user.userName.toLowerCase().includes(searchTerm)
    );
    setUsers(filteredMatchs);
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

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un match..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={handleSearch}
        />
      </div>

      <div className="bg-white shadow-lg rounded-lg  h-[calc(100vh-200px)]  overflow-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-600 text-white">
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
            {/* Exemple de données statiques */}
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

                  <td className="px-6 py-4 flex space-x-5 items-center ">
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
    </>
  );
};

export default UtilisateursContent;
