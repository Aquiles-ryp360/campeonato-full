import "server-only";

export type ChampionshipVenue = {
  name: string;
  address: string;
  mapsUrl: string;
  embedUrl: string;
  directionsUrl: string;
};

// Sede reservada: solo se entrega desde paginas protegidas del delegado.
export function getChampionshipVenue(): ChampionshipVenue {
  const name = process.env.CHAMPIONSHIP_VENUE_NAME?.trim() || "Cancha Pereira - Chanu Chanu";
  const address = process.env.CHAMPIONSHIP_VENUE_ADDRESS?.trim() || "Pereyda, Puno 21002";
  const mapsUrl =
    process.env.CHAMPIONSHIP_VENUE_MAPS_URL?.trim() || "https://maps.app.goo.gl/nGZE5v2idLAef2ZZ9";
  // Coordenadas exactas del punto compartido en mapsUrl.
  const coords = process.env.CHAMPIONSHIP_VENUE_COORDS?.trim() || "-15.8545163,-70.0084683";

  return {
    name,
    address,
    mapsUrl,
    embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(coords)}&z=17&output=embed`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`
  };
}
