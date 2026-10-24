import "server-only";

export type ChampionshipVenue = {
  name: string;
  address: string;
  mapsUrl: string;
  embedUrl: string;
};

// Sede reservada: solo se entrega desde paginas protegidas del delegado.
export function getChampionshipVenue(): ChampionshipVenue {
  const name = process.env.CHAMPIONSHIP_VENUE_NAME?.trim() || "Cancha Pereira - Chanu Chanu";
  const address = process.env.CHAMPIONSHIP_VENUE_ADDRESS?.trim() || "Pereyda, Puno 21002";
  const mapsUrl =
    process.env.CHAMPIONSHIP_VENUE_MAPS_URL?.trim() || "https://maps.app.goo.gl/nGZE5v2idLAef2ZZ9";

  return {
    name,
    address,
    mapsUrl,
    embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`
  };
}
