"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";

import Image from "next/image";
import Link from "next/link";

import { getAllSubscriptions } from "@/services/abonement.service";

const AbonementsContent = () => {
  const [abonements, setAbonements] = useState([]);
  const [abonementsList, setAbonementsList] = useState([]); // Unused state, can be removed if not needed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAllSubscriptions();
      if (response.success) {
        setAbonements(response.data ?? []);
        setAbonementsList(response.data ?? []); // Assuming you want to keep this state for some reason
      } else {
        console.error("Failed to fetch abonements");
        setError(response.error ?? null);
      }
    } catch (error) {
      setError(
        "Une erreur s'est produite lors de la récupération des abonements."
      );
      console.error("Error fetching abonements:", error);
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (timestamp) => {
    if (!timestamp) return ""; // Handle null or undefined timestamp
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
  // const handleDelete = async () => {
  //   try {
  //     setSubmitting(true);
  //     const response = await deleteAbonnement(abonementToDelete?.id);
  //     if (response.success) {
  //       setRefresh((prev) => prev + 1); // Refresh the data after deletion
  //       setShowDeleteModal(false);
  //     }
  //   } catch (error) {
  //     console.error("Error deleting abonement:", error);
  //     toast.error(
  //       "Une erreur s'est produite lors de la suppression de l'abonnement."
  //     );
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  const handleSearch = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredabonements = abonementsList.filter((match) =>
      match.code.toLowerCase().includes(searchTerm)
    );
    setAbonements(filteredabonements);
  };
  useEffect(() => {
    fetchData(); // Fetch data when the component mounts
  }, []);

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
              <th className="px-6 py-3 text-sm font-medium">Code</th>
              <th className="px-6 py-3 text-sm font-medium">Saison</th>

              <th className="px-6 py-3 text-sm font-medium">
                Date d&apos;achat
              </th>

              <th className="px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {abonements.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucun abonement trouvé
                </td>
              </tr>
            ) : (
              abonements.map((abonement) => (
                <tr key={abonement.id} className="hover:bg-gray-100 transition">
                  <td className="px-6 py-4 text-gray-700">{abonement?.code}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {abonement?.abonnement?.title +
                      "(" +
                      abonement?.abonnement?.season +
                      ")"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(abonement?.createdAt)}
                  </td>

                  <td className="px-6 py-4 flex space-x-5 items-center ">
                    <Link
                      href={`/abonnements/${abonement?.code}`}
                      className="bg-blue-600  text-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2"
                    >
                      Plus de détails
                    </Link>
                    {/* <button
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                      onClick={() => {
                        setAbonementToDelete(abonement);
                        setShowDeleteModal(true);
                      }}
                    >
                      <IoTrash size={22} />
                    </button> */}
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

export default AbonementsContent;
