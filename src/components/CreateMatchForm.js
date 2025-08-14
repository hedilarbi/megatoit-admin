"use client";
import React, { useEffect, useState } from "react";
import DateTimePicker from "react-datetime-picker";
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";
import { addMatch, getTeams } from "@/services/match.service";
import Spinner from "./spinner/Spinner";
import toast from "react-hot-toast";
const CreateMatchForm = () => {
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState("Colisée Jean-Guy-Talbot");
  const [totalSeats, setTotalSeats] = useState("3500");
  const [ticketPrice, setTicketPrice] = useState("15");
  const [submitting, setSubmitting] = useState(false);
  const [equipes, setEquipes] = useState([]);
  const [type, setType] = useState("Domicile");
  const [category, setCategory] = useState("Saison  ");

  const [isLoading, setIsLoading] = useState(true);

  const fetchEquipes = async () => {
    try {
      setIsLoading(true);
      const response = await getTeams();
      if (response.success) {
        console.log("Équipes récupérées avec succès :", response.data);
        setEquipes(response.data);
      } else {
        console.error(
          "Erreur lors de la récupération des équipes :",
          response.error
        );
        toast.error("Erreur lors de la récupération des équipes.");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des équipes :", error);
      toast.error("Erreur lors de la récupération des équipes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const oponentData = equipes.find((team) => team.id === opponent);

    if (!oponentData || !date || !location || !totalSeats || !ticketPrice) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    try {
      setSubmitting(true);
      const matchData = {
        opponent: oponentData,
        date: new Date(date),
        place: location,
        totalSeats: parseInt(totalSeats, 10),
        type,
        category: "Ligue",
        availableSeats: parseInt(totalSeats, 10), // Initial available seats are equal to total seats
        price: parseFloat(ticketPrice),
        createdAt: new Date().toISOString(),
      };
      const response = await addMatch(matchData);
      if (response.success) {
        toast.success("Match créé avec succès !");
        // Reset form fields
        setOpponent("");
        setDate(new Date());
      } else {
        toast.error(response.error || "Erreur lors de la création du match.");
      }
    } catch (error) {
      console.error("Erreur lors de la création du match :", error);
      toast.error("Erreur lors de la création du match.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
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
              <span className="p-3 mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm  sm:text-sm bg-gray-100">
                Megatoit
              </span>
              <span>VS</span>
              <select
                id="opponent"
                name="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="p-3 mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Sélectionnez l&apos;adversaire</option>
                {equipes.length > 0 ? (
                  equipes.map((team, index) => (
                    <option key={index} value={team.id}>
                      {team.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    Aucune équipe disponible
                  </option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700"
            >
              Date
            </label>
            {/* <input
            type="datetime-local"
            id="date"
            name="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className=" p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          /> */}
            <DateTimePicker onChange={setDate} value={date} />
          </div>
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700"
            >
              Type de match
            </label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="Domicile">Domicile</option>
              <option value="À l'étranger">À l&apos;étranger</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700"
            >
              Catégorie de match
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="Saison">Saison</option>
              <option value="Présaison">Présaison</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700"
            >
              Lieu
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Nom du stade"
            />
          </div>

          <div>
            <label
              htmlFor="totalSeats"
              className="block text-sm font-medium text-gray-700"
            >
              Nombre total de places
            </label>
            <input
              type="number"
              id="totalSeats"
              name="totalSeats"
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
              className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Ex: 5000"
            />
          </div>

          <div>
            <label
              htmlFor="ticketPrice"
              className="block text-sm font-medium text-gray-700"
            >
              Prix du billet (HT)
            </label>
            <input
              type="number"
              id="ticketPrice"
              name="ticketPrice"
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value)}
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
            Créer le match
          </button>
        </div>
      </div>
    </>
  );
};

export default CreateMatchForm;
