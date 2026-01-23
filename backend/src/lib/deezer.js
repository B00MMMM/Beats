import fetch from "node-fetch";

async function deezerFetch(endpoint) {
  const res = await fetch(`https://${process.env.RAPIDAPI_HOST}${endpoint}`, {
    headers: {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("DEEZEER API ERROR:", res.status, text);
    throw new Error("Deezer API failed");
  }

  return res.json();
}

export { deezerFetch };
