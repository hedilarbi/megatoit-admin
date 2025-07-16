"use client";
import React, { useEffect, useState } from "react";
import Spinner from "./spinner/Spinner";
import toast from "react-hot-toast";
import {
  addAbonement,
  getAbonementById,
  updateAbonement,
} from "@/services/abonement.service";
import { useParams } from "next/navigation";
import Image from "next/image";
import { WarningIcon } from "@/assets/svgs";
const UpdateAbonnementForm = () => {
  const { abonementId } = useParams();
  const [title, setTitle] = useState("Hockey Team");
  const [loading, setLoading] = useState(true);
  const [startYear, setStartYear] = useState("2026");
  const [endYear, setEndYear] = useState("2027");
  const [status, setStatus] = useState("active");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAbonnementData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAbonementById(abonementId as string);
      if (response.success) {
        const abonnement = response.data;
        setTitle(abonnement.title || "Hockey Team");
        const [start, end] = abonnement.season.split("-");
        setStartYear(start || "2026");
        setEndYear(end || "2027");
        setPrice(abonnement.price.toString() || "");
        setStatus(abonnement.status || "active");
      } else {
        console.error("Échec de la récupération de l'abonnement");
        setError(
          response.error || "Erreur lors de la récupération de l'abonnement."
        );
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des données de l'abonnement :",
        error
      );
      setError(
        "Une erreur s'est produite lors de la récupération des données de l'abonnement."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !startYear || !endYear || !price) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    if (
      !/^\d{4}$/.test(startYear) ||
      !/^\d{4}$/.test(endYear) ||
      parseInt(endYear) <= parseInt(startYear) ||
      parseInt(endYear) - parseInt(startYear) !== 1
    ) {
      toast.error(
        "L'année de début et de fin doivent être des nombres à 4 chiffres, l'année de fin doit être supérieure à l'année de début, et la différence entre les deux doit être de 1."
      );
      return;
    }

    try {
      setSubmitting(true);
      const abonnementData = {
        title: title,
        season: `${startYear}-${endYear}`,
        price: parseFloat(price),
        status: status,
      };
      const response = await updateAbonement(abonementId, abonnementData);
      if (response) {
        toast.success("Abonnement modifié avec succès !");
      } else {
        toast.error(
          response.error || "Erreur lors de la modification de l'abonnement."
        );
      }
    } catch (error) {
      console.error("Erreur lors de la modification de l'abonnement :", error);
      toast.error("Erreur lors de la modification de l'abonnement.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchAbonnementData();
  }, [abonementId]);
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
            onClick={() => fetchAbonnementData()}
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
      {submitting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30  z-20">
          <Spinner />
        </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow-md h-[calc(100vh-100px)] overflow-y-auto flex flex-col">
        <div className="space-y-4 flex-1">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Titre
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Ex: Hockey Team"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="season"
              className="block text-sm font-medium text-gray-700"
            >
              Saison
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="startYear"
                name="startYear"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                className="p-3 mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Ex: 2026"
              />
              <span className="p-3 mt-1">-</span>
              <input
                type="text"
                id="endYear"
                name="endYear"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                className="p-3 mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Ex: 2027"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="ticketPrice"
              className="block text-sm font-medium text-gray-700"
            >
              Prix de l&lsquo;abonnement
            </label>
            <input
              type="number"
              id="ticketPrice"
              name="ticketPrice"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Ex: 20.00"
            />
          </div>
          <div className="mt-6">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Statut
            </label>
            <select
              id="status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </div>

        <div>
          <button
            onClick={handleSubmit}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            modifier l&apos;abonnement
          </button>
        </div>
      </div>
    </>
  );
};

export default UpdateAbonnementForm;
