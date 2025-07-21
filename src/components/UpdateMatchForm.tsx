"use client";
import React, { useEffect, useState } from "react";
import DateTimePicker from "react-datetime-picker";
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";
import { getMatchByUid, updateMatch } from "@/services/match.service";
import Spinner from "./spinner/Spinner";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import Image from "next/image";
import { WarningIcon } from "@/assets/svgs";
const UpdateMatchForm = () => {
  const { matchId } = useParams();

  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMatchByUid(matchId as string);
      console.log("Response from getMatchByUid:", response);
      if (response.success) {
        const match = response.data;

        setOpponent(match.title.split(" vs ")[1] || "");
        const formatedDate = formatDate(match.date);
        console.log("Formatted date:", formatedDate);
        setDate(new Date(formatedDate));
        setLocation(match.place || "");
        setTotalSeats(match.totalSeats.toString() || "");
        setTicketPrice(match.price.toString() || "");
      } else {
        console.error("Échec de la récupération du match");
        setError(response.error || "Erreur lors de la récupération du match.");
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des données du match :",
        error
      );
      setError(
        "Une erreur s'est produite lors de la récupération des données du match."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!opponent || !date || !location || !totalSeats || !ticketPrice) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    try {
      setSubmitting(true);
      const matchData = {
        title: "Hockey Team vs " + opponent,
        date: new Date(date),
        place: location,
        totalSeats: parseInt(totalSeats, 10),
        availableSeats: parseInt(totalSeats, 10), // Initial available seats are equal to total seats
        price: parseFloat(ticketPrice),
      };
      const response = await updateMatch(matchId, matchData);
      if (response.success) {
        toast.success("Match créé avec succès !");
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
  const formatDate = (timestamp) => {
    const milliseconds =
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

    const date = new Date(milliseconds);

    return date;
  };
  useEffect(() => {
    fetchMatchData(); // Fetch match data when the component mounts
  }, [matchId]);
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
            onClick={() => fetchMatchData()}
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
              <span className="p-3 mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm  sm:text-sm bg-gray-100">
                Hockey Team
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
                <option value="Adversaire FC">Adversaire FC</option>
                <option value="Team B">Team B</option>
                <option value="Team C">Team C</option>
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
              Prix du billet
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
            Mettre à jour le match
          </button>
        </div>
      </div>
    </>
  );
};

export default UpdateMatchForm;
