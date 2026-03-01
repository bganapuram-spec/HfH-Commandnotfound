// server/routes/route.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const polyline = require("polyline");

const ORS_API_KEY = process.env.ORS_API_KEY; // put your ORS key in .env

// POST /api/route
router.post("/", async (req, res) => {
  try {
    const { start, end, safeMode } = req.body;
    // start & end are { lat, lng }

    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/foot-walking",
      {
        coordinates: [
          [start.lng, start.lat], // ORS uses [lng, lat]
          [end.lng, end.lat]
        ],

        // ✅ FIX: Allow snapping within 50 meters
        radiuses: [50, 50],

        options: {
          avoid_features: safeMode ? ["steps", "ferries"] : []
        }
      },
      {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    // ORS returns routes[].geometry as encoded polyline
    const route = response.data.routes && response.data.routes[0];
    if (!route || !route.geometry) {
      return res.status(502).json({ error: "No route from ORS" });
    }

    // polyline.decode() returns [[lat, lng], ...]
    const decoded = polyline.decode(route.geometry);
    const routeCoords = decoded.map(([lat, lng]) => ({ lat, lng }));

    res.json({ route: routeCoords });

  } catch (err) {
    console.error("ORS API error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;