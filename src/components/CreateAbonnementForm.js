"use client";
import React, { useState } from "react";
import Spinner from "./spinner/Spinner";
import toast from "react-hot-toast";
import { addAbonement } from "@/services/abonement.service";
const CreateAbonnementForm = () => {
  const [title, setTitle] = useState("Hockey Team");

  const [startYear, setStartYear] = useState("2026");
  const [endYear, setEndYear] = useState("2027");

  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
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
        status: "active",
        createdAt: new Date().toISOString(),
      };
      const response = await addAbonement(abonnementData);
      if (response) {
        toast.success("Abonnement créé avec succès !");
        // Reset form fields
        setTitle("Hockey Team");
        setStartYear("2026");
        setEndYear("2027");
        setPrice("");
      } else {
        toast.error(
          response.error || "Erreur lors de la création de l'abonnement."
        );
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'abonnement :", error);
      toast.error("Erreur lors de la création de l'abonnement.");
    } finally {
      setSubmitting(false);
    }
  };

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
        </div>
        <div>
          <button
            onClick={handleSubmit}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Créer l&apos;abonnement
          </button>
        </div>
      </div>
    </>
  );
};

export default CreateAbonnementForm;
