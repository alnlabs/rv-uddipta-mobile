import { supabase } from "@/lib/supabase";

export type BrochureProject = {
  name: string
  developer: string
  tagline: string
  location: string
  address: string
  acres: number
  units: number
  floors: number
  rera: string
  amenities: string[]
  nearby: { label: string; distance: string }[]
};

const FALLBACK: BrochureProject = {
  name: "RV Uddiipta",
  developer: "RV Nirmaan Private Limited",
  tagline: "Premium 2 & 3 BHK high-rise residences",
  location: "Karmanghat, Hyderabad",
  address: "Sy. No. 66, ZP Road, adjacent to Bhupeshgupta Nagar, Karmanghat",
  acres: 2.2,
  units: 238,
  floors: 10,
  rera: "P02400004125",
  amenities: [
    "16,000 sft clubhouse",
    "Gymnasium",
    "Multipurpose hall",
    "Guest rooms",
    "Walking & jogging track",
    "Children's play area",
    "24/7 security",
    "EV charging",
  ],
  nearby: [
    { label: "LB Nagar Circle", distance: "3.6 km" },
    { label: "Dilsukhnagar", distance: "8.2 km" },
    { label: "Rajiv Gandhi International Airport", distance: "21 km" },
  ],
};

export async function loadBrochureProject(): Promise<BrochureProject> {
  const { data } = await supabase.from("project_info").select("*").eq("id", 1).maybeSingle();
  if (!data) return FALLBACK;
  return {
    name: String(data.name || FALLBACK.name),
    developer: String(data.developer || FALLBACK.developer),
    tagline: String(data.tagline || FALLBACK.tagline),
    location: String(data.location || FALLBACK.location),
    address: String(data.address || FALLBACK.address),
    acres: Number(data.acres || FALLBACK.acres),
    units: Number(data.units || FALLBACK.units),
    floors: Number(data.floors || FALLBACK.floors),
    rera: String(data.rera || FALLBACK.rera),
    amenities: Array.isArray(data.amenities) ? data.amenities.map(String) : FALLBACK.amenities,
    nearby: Array.isArray(data.nearby)
      ? data.nearby.map((item: { label?: string; distance?: string }) => ({
          label: String(item?.label || ""),
          distance: String(item?.distance || ""),
        }))
      : FALLBACK.nearby,
  };
}

export async function loadBrochureFlats() {
  const { data, error } = await supabase
    .from("flats_brochure")
    .select("flat_number, floor, wing, type, area_sqft")
    .order("flat_number", { ascending: true })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    flatNumber: String(row.flat_number || ""),
    floor: Number(row.floor || 0),
    wing: String(row.wing || ""),
    type: String(row.type || ""),
    areaSqft: Number(row.area_sqft || 0),
  }));
}
