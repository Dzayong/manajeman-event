export type DivisionTemplate = {
  name: string;
  description: string;
  starterTasks: string[];
};

/**
 * Standard HMIF division set. Selected divisions are seeded with starter
 * tasks so committee members see real work waiting on first login.
 */
export const DIVISION_TEMPLATES: DivisionTemplate[] = [
  {
    name: "Acara",
    description: "Konsep acara, rundown, dan kebutuhan panggung",
    starterTasks: ["Susun rundown acara", "Brief MC dan pengisi acara", "Gladi bersih"],
  },
  {
    name: "Korlap",
    description: "Koordinasi lapangan dan alur peserta",
    starterTasks: ["Atur alur peserta", "Susun jadwal jaga", "Koordinasi keamanan lokasi"],
  },
  {
    name: "Humas",
    description: "Komunikasi eksternal dan publikasi",
    starterTasks: ["Kirim undangan pemateri", "Koordinasi peserta", "Publikasi acara"],
  },
  {
    name: "Logistik",
    description: "Perlengkapan, tempat, dan peralatan",
    starterTasks: ["Booking ruangan", "Siapkan sound system", "Susun list alat hari-H"],
  },
  {
    name: "Konsumsi",
    description: "Konsumsi peserta dan panitia",
    starterTasks: ["Pesan katering", "Siapkan snack panitia", "Upload struk belanja"],
  },
];

export function findTemplate(name: string): DivisionTemplate | undefined {
  return DIVISION_TEMPLATES.find(
    (t) => t.name.toLowerCase() === name.trim().toLowerCase(),
  );
}
