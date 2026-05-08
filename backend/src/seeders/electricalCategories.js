import Category from "../modules/category/category.model.js";
import logger from "../utils/logger.js";

const ELECTRICAL_CATEGORIES = [
  {
    name: "Wires & Cables",
    description: "House Wire, Flexible Wire, Armoured Cable, Coaxial Cable, LAN Cable, Solar Cable",
    subs: ["House Wire", "Flexible Wire", "Armoured Cable", "Coaxial Cable", "LAN Cable", "Telephone Cable", "Speaker Wire", "Solar Cable"],
  },
  {
    name: "Switches & Sockets",
    description: "Modular Switches, Non-Modular Switches, Sockets, Plug Tops, Extension Boards",
    subs: ["Modular Switches", "Non-Modular Switches", "Sockets", "Plug Tops", "Switch Boards", "Extension Boards", "Multi Plug"],
  },
  {
    name: "Lighting",
    description: "LED Bulbs, Tube Lights, Panel Lights, Flood Lights, Emergency Lights",
    subs: ["LED Bulbs", "Tube Lights", "LED Batten", "Panel Lights", "Downlights", "Flood Lights", "Street Lights", "Decorative Lights", "Emergency Lights"],
  },
  {
    name: "Fans & Ventilation",
    description: "Ceiling Fans, Table Fans, Wall Fans, Exhaust Fans",
    subs: ["Ceiling Fans", "Table Fans", "Wall Fans", "Pedestal Fans", "Exhaust Fans", "Ventilation Fans"],
  },
  {
    name: "MCB / DB / Switchgear",
    description: "MCB, RCCB, ELCB, Distribution Box, Isolator, Changeover Switch",
    subs: ["MCB", "RCCB", "ELCB", "RCBO", "Distribution Box (DB)", "Isolator", "Changeover Switch", "Fuse Unit"],
  },
  {
    name: "Industrial Electrical",
    description: "Contactors, Relays, Timers, Overload Relays, Push Buttons",
    subs: ["Contactors", "Relays", "Timers", "Overload Relays", "Starters", "Push Buttons", "Selector Switch", "Limit Switch"],
  },
  {
    name: "Tools & Hardware",
    description: "Testers, Screwdrivers, Pliers, Wire Strippers, Drill Machines",
    subs: ["Testers", "Screwdrivers", "Pliers", "Wire Strippers", "Crimping Tools", "Drill Machines", "Measuring Tape", "Hacksaw & Blades"],
  },
  {
    name: "Conduits & Accessories",
    description: "PVC Conduit Pipes, Flexible Conduit, Casing Capping, Junction Boxes",
    subs: ["PVC Conduit Pipes", "Flexible Conduit", "Casing Capping", "Bends & Elbows", "Junction Boxes", "Clamps & Saddles", "Cable Trays"],
  },
  {
    name: "Inverter / UPS / Battery",
    description: "Inverters, UPS, Batteries, Stabilizers",
    subs: ["Inverters", "UPS", "Batteries", "Stabilizers", "Battery Water", "Battery Stands"],
  },
  {
    name: "Motors & Pumps",
    description: "Water Motors, Submersible Pumps, Motor Starters",
    subs: ["Water Motors", "Submersible Pumps", "Motor Starters", "Pump Controllers"],
  },
  {
    name: "Meters & Measuring Devices",
    description: "Energy Meters, Clamp Meters, Multimeters",
    subs: ["Energy Meters", "Clamp Meters", "Multimeters", "Voltage Stabilizer Meter"],
  },
  {
    name: "Appliances",
    description: "Geysers, Irons, Room Heaters, Doorbells",
    subs: ["Geysers", "Irons", "Room Heaters", "Immersion Rod", "Doorbells", "Extension Cords"],
  },
  {
    name: "Earthing & Safety",
    description: "Earthing Rod, Earthing Wire, Safety Gloves, Insulation Tape",
    subs: ["Earthing Rod", "Earthing Wire", "Safety Gloves", "Insulation Tape", "Safety Shoes", "Helmets"],
  },
  {
    name: "Fuses & Holders",
    description: "Fuse Wire, KitKat Fuse, Cartridge Fuse, Fuse Holder",
    subs: ["Fuse Wire", "KitKat Fuse", "Cartridge Fuse", "Fuse Holder"],
  },
  {
    name: "Connectors & Terminals",
    description: "Cable Lugs, Terminal Blocks, Ferrules, Cable Ties",
    subs: ["Cable Lugs", "Terminal Blocks", "Ferrules", "Cable Ties", "Wire Connectors"],
  },
  {
    name: "Solar Products",
    description: "Solar Panels, Solar Inverters, Solar Batteries, Solar Lights",
    subs: ["Solar Panels", "Solar Inverters", "Solar Batteries", "Solar Lights", "Solar Charge Controller"],
  },
  {
    name: "CCTV & Security",
    description: "CCTV Cameras, DVR / NVR, SMPS, CCTV Cable",
    subs: ["CCTV Cameras", "DVR / NVR", "SMPS", "CCTV Cable", "Hard Disk"],
  },
  {
    name: "Home Automation",
    description: "Smart Switches, WiFi Plug, Motion Sensors, Smart Doorbell",
    subs: ["Smart Switches", "WiFi Plug", "Motion Sensors", "Smart Doorbell"],
  },
];

const ELECTRICAL_STORE_TYPES = new Set(["electrical", "sanitary", "hardware"]);

export const seedCategoriesForStore = async (storeType, organizationId, createdBy) => {
  if (!ELECTRICAL_STORE_TYPES.has(storeType)) return;

  // Check including soft-deleted so we don't re-seed if data already exists
  const existing = await Category.countDocuments({ organizationId, isDeleted: { $in: [true, false] } });
  if (existing > 0) return;

  // Insert parent categories
  const parentDocs = await Category.insertMany(
    ELECTRICAL_CATEGORIES.map(c => ({
      name: c.name,
      description: c.description,
      parent: null,
      organizationId,
      createdBy,
      isDeleted: false,
    })),
    { ordered: false }
  );

  // Build name → _id map
  const parentMap = Object.fromEntries(parentDocs.map(d => [d.name, d._id]));

  // Insert subcategories
  const subDocs = [];
  for (const cat of ELECTRICAL_CATEGORIES) {
    const parentId = parentMap[cat.name];
    if (!parentId) continue;
    for (const subName of cat.subs) {
      subDocs.push({ name: subName, parent: parentId, organizationId, createdBy, isDeleted: false });
    }
  }

  if (subDocs.length) {
    await Category.insertMany(subDocs, { ordered: false });
  }

  logger.info(`Seeded ${parentDocs.length} categories + ${subDocs.length} subcategories for org ${organizationId}`);
};
