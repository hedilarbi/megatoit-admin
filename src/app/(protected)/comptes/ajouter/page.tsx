"use client";
import React from "react";

import axios from "axios";
import toast from "react-hot-toast";
import Link from "next/link";
import { FaArrowLeftLong } from "react-icons/fa6";
import Spinner from "@/components/spinner/Spinner";
const AddAccount = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [name, setName] = React.useState("");

  const [loading, setLoading] = React.useState(false);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !name) {
      toast.error("Veuillez remplir tous les champs.");

      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post("/api/create-user", {
        email,
        password,
        name,
      });
      if (!response.data.success) {
        toast.error("Failed to create account.");
        return;
      }
      toast.success("Compte créé avec succès !");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
    } catch (err) {
      console.error("Error adding account:", err);

      toast.error("Failed to add account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen p-6 bg-gray-100 relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-50">
          <Spinner />
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex  items-center mb-6 space-x-4">
          <Link
            href="/comptes"
            className="bg-blue-600 text-white rounded-full p-3 flex justify-center items-center"
          >
            <FaArrowLeftLong className="" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            Créer un compte employée
          </h1>
        </div>
      </div>
      <form
        onSubmit={handleAddAccount}
        className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md"
      >
        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-gray-700 font-medium mb-2"
          >
            Nom et Prénom
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Entrez votre nom et prénom"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-gray-700 font-medium mb-2"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Entrez votre email"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-gray-700 font-medium mb-2"
          >
            Mot de passe
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Entrez votre mot de passe"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="confirmPassword"
            className="block text-gray-700 font-medium mb-2"
          >
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            id="confirmPassword"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Confirmez votre mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {loading ? "Création en cours..." : "Créer le compte"}
        </button>
      </form>
    </div>
  );
};

export default AddAccount;
