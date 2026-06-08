import TopRojo from "../models/TopRojo.js";

export const normalizeExpiredTopRojos = async () => {
  const now = new Date();

  await TopRojo.updateMany(
    {
      status: "active",
      endDate: { $lte: now }
    },
    {
      $set: {
        status: "expired",
        updatedAt: now
      }
    }
  );
};
