// server/routes/route.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const polyline = require("polyline");

const ORS_API_KEY = process.env.ORS_API_KEY; // put your ORS key in .env

// POST /api/route
router.post("/", async (req, res) => {
  try {
    console.log("req.body",req.body);
    const { start, end, safeMode } = req.body;
    // start & end are { lat, lng }

    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/foot-walking",
      {
        coordinates: [
          [start.lng, start.lat], // ORS uses [lng, lat]
          [end.lng, end.lat]
        ],
        radiuses: [50, 50],
        instructions: true,
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

    const route = response.data.routes && response.data.routes[0];
    if (!route || !route.geometry) {
      return res.status(502).json({ error: "No route from ORS" });
    }

    const decoded = polyline.decode(route.geometry);
    const routeCoords = decoded.map(([lat, lng]) => ({ lat, lng }));

    // Turn-by-turn steps from ORS segments (for live "steps to go" like GMaps)
    const steps = [];
    const segments = route.segments || [];
    const typeToText = { 0: "Turn left", 1: "Turn right", 2: "Sharp left", 3: "Sharp right", 4: "Slight left", 5: "Slight right", 6: "Continue straight", 10: "Arrive", 11: "Depart" };
    for (const seg of segments) {
      const segSteps = seg.steps || [];
      for (const s of segSteps) {
        const dist = s.distance != null ? Math.round(s.distance) : 0;
        let text = (s.instruction || "").trim();
        if (!text && s.type != null) text = typeToText[s.type] || "Continue";
        steps.push({
          instruction: text || "Continue",
          distance: dist,
          type: s.type,
          wayPoints: s.way_points
        });
      }
    }

    res.json({ route: routeCoords, steps });

  } catch (err) {
    console.error("ORS API error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;