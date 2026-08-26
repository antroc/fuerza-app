const categoryMap = new Map([
  ["chest", "Pecho"],
  ["back", "Espalda"],
  ["shoulders", "Hombros"],
  ["upper arms", "Brazos"],
  ["lower arms", "Brazos"],
  ["upper legs", "Piernas"],
  ["lower legs", "Piernas"],
  ["waist", "Core"],
]);

const requiredStrings = [
  "id",
  "name",
  "category",
  "equipment",
  "target",
  "image",
  "gif_url",
  "attribution",
];

export const normalizeDataset = (records, revision) => {
  if (!Array.isArray(records)) throw new Error("El dataset debe ser una lista");
  const base = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${revision}/`;
  return records.flatMap((record, index) => {
    if (
      !record ||
      typeof record !== "object" ||
      requiredStrings.some((field) => typeof record[field] !== "string")
    ) {
      throw new Error(`Registro ${index + 1} no válido`);
    }
    const category = categoryMap.get(record.category.toLowerCase());
    if (!category) return [];
    return [
      {
        id: record.id,
        name: record.name,
        category,
        equipment: record.equipment,
        target: record.target,
        imageUrl: `${base}${record.image.replace(/^\//, "")}`,
        gifUrl: `${base}${record.gif_url.replace(/^\//, "")}`,
        attribution: record.attribution,
      },
    ];
  });
};
